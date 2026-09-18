import { prisma } from '@/lib/prisma';
import { Order, OrderStatus } from '@prisma/client';

export interface CheckoutItemInput {
  variantId: string;
  quantity: number;
}

export interface CheckoutResult {
  order: Order;
  totalAmount: number;
}

export async function createOrderAtomically(
  userId: string,
  items: CheckoutItemInput[],
  addressId?: string,
): Promise<CheckoutResult> {
  if (!items.length) {
    throw new Error('Cannot checkout with an empty cart.');
  }

  return await prisma.$transaction(
    async tx => {
      // 1. Fetch live variant and product details to prevent client-side price tampering
      const variantIds = items.map(i => i.variantId);
      const variants = await tx.productVariant.findMany({
        where: {
          id: { in: variantIds },
          product: { isActive: true, deletedAt: null },
        },
        include: {
          product: {
            select: { name: true, basePrice: true },
          },
        },
      });

      if (variants.length !== items.length) {
        throw new Error(
          'One or more requested products are unavailable or inactive.',
        );
      }

      const variantMap = new Map(variants.map(v => [v.id, v]));

      // 2. Atomically verify and decrement inventory
      for (const item of items) {
        const variant = variantMap.get(item.variantId);
        if (!variant) throw new Error(`Invalid variant: ${item.variantId}`);

        const updated = await tx.productVariant.updateMany({
          where: {
            id: item.variantId,
            stock: { gte: item.quantity }, // Prevents race conditions at DB level
          },
          data: {
            stock: { decrement: item.quantity },
          },
        });

        // If count === 0, another customer purchased the remaining stock milliseconds prior
        if (updated.count === 0) {
          throw new Error(
            `Insufficient stock for "${variant.product.name}" (${variant.sku}).`,
          );
        }
      }

      // 3. Compute immutable order totals and snapshots using server-side prices
      let totalAmount = 0;
      const orderItemsData = items.map(item => {
        const variant = variantMap.get(item.variantId)!;
        const unitPrice = Number(
          variant.priceOverride ?? variant.product.basePrice,
        );
        totalAmount += unitPrice * item.quantity;

        return {
          productVariantId: variant.id,
          quantity: item.quantity,
          priceAtPurchase: unitPrice,
          titleSnapshot: variant.product.name,
          skuSnapshot: variant.sku,
        };
      });

      // 4. Create pending order with 15-minute reservation window
      const reservationWindowMinutes = 15;
      const expiresAt = new Date(
        Date.now() + reservationWindowMinutes * 60 * 1000,
      );

      const order = await tx.order.create({
        data: {
          userId,
          addressId: addressId ?? null,
          totalAmount,
          expiresAt,
          status: OrderStatus.PENDING,
          items: {
            create: orderItemsData,
          },
        },
      });

      return { order, totalAmount };
    },
    {
      maxWait: 5000,
      timeout: 10000,
    },
  );
}
