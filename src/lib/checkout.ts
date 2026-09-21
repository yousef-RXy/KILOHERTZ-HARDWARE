import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';
import {
  Order,
  OrderStatus,
  PaymentProvider,
  PaymentStatus,
  Prisma,
} from '@prisma/client';

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

      // Sort items by variantId to guarantee globally consistent lock acquisition order (prevents deadlocks)
      const sortedItems = [...items].sort((a, b) =>
        a.variantId.localeCompare(b.variantId),
      );

      for (const item of sortedItems) {
        const variant = variantMap.get(item.variantId);
        if (!variant) throw new Error(`Invalid variant: ${item.variantId}`);

        const updated = await tx.productVariant.updateMany({
          where: {
            id: item.variantId,
            stock: { gte: item.quantity },
          },
          data: {
            stock: { decrement: item.quantity },
          },
        });

        if (updated.count === 0) {
          throw new Error(
            `Insufficient stock for "${variant.product.name}" (${variant.sku}).`,
          );
        }
      }

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

      const reservationWindowMinutes = 30;
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

export interface DirectCheckoutInput {
  userId: string;
  addressId?: string;
  paymentMethod: 'card' | 'po';
  freightMethod: 'priority' | 'dedicated';
  items: Array<{
    sku: string;
    name: string;
    price: number;
    quantity: number;
  }>;
}

export interface DirectCheckoutResult {
  order: Order;
  resolvedOrderItems: Array<{
    productVariantId: string | null;
    titleSnapshot: string;
    skuSnapshot: string;
    quantity: number;
    priceAtPurchase: number;
  }>;
  grandTotal: number;
  freightCost: number;
}


export async function createDirectOrderAtomically(
  input: DirectCheckoutInput,
): Promise<DirectCheckoutResult> {
  const freightCost = input.freightMethod === 'dedicated' ? 145 : 0;

  return await prisma.$transaction(
    async tx => {
      let subtotal = 0;
      const resolvedOrderItems = [];

      // Sort items deterministically by SKU to guarantee consistent lock ordering (prevents split-holds / deadlocks)
      const sortedItems = [...input.items].sort((a, b) =>
        a.sku.localeCompare(b.sku),
      );

      for (const item of sortedItems) {
        const variant = await tx.productVariant.findFirst({
          where: { sku: item.sku },
          include: { product: true },
        });

        const unitPrice = variant
          ? Number(variant.priceOverride ?? variant.product.basePrice)
          : item.price;

        subtotal += unitPrice * item.quantity;

        if (variant) {
          const updated = await tx.productVariant.updateMany({
            where: {
              id: variant.id,
              stock: { gte: item.quantity },
            },
            data: {
              stock: { decrement: item.quantity },
            },
          });

          if (updated.count === 0) {
            throw new Error(
              `Insufficient stock available for "${variant.product.name}" (${variant.sku}). Available stock is lower than ${item.quantity}.`,
            );
          }
        }

        resolvedOrderItems.push({
          productVariantId: variant ? variant.id : null,
          titleSnapshot: variant ? variant.product.name : item.name,
          skuSnapshot: item.sku,
          quantity: item.quantity,
          priceAtPurchase: unitPrice,
        });
      }

      const grandTotal = subtotal + freightCost;

      const reservationWindowMinutes = 30;
      const expiresAt = new Date(
        Date.now() + reservationWindowMinutes * 60 * 1000,
      );

      const order = await tx.order.create({
        data: {
          userId: input.userId,
          addressId: input.addressId ?? null,
          status: OrderStatus.PENDING,
          totalAmount: grandTotal,
          expiresAt,
          items: {
            create: resolvedOrderItems,
          },
          payments: {
            create: {
              provider:
                input.paymentMethod === 'card'
                  ? PaymentProvider.STRIPE
                  : PaymentProvider.CASH_ON_DELIVERY,
              amount: grandTotal,
              currency: 'USD',
              status: PaymentStatus.PENDING,
            },
          },
        },
      });

      return {
        order,
        resolvedOrderItems,
        grandTotal,
        freightCost,
      };
    },
    {
      maxWait: 5000,
      timeout: 10000,
    },
  );
}

export async function revertOrderReservationAtomically(
  orderId: string,
  options?: {
    newStatus?: OrderStatus;
    errorMessage?: string;
    cancelStripeSession?: boolean;
  },
) {
  const newStatus = options?.newStatus ?? OrderStatus.CANCELLED;
  const errorMessage =
    options?.errorMessage ?? 'Checkout abandoned or payment failed';
  const shouldCancelStripe = options?.cancelStripeSession ?? true;

  let stripeSessionIdToCancel: string | null = null;

  const result = await prisma.$transaction(async tx => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        payments: true,
      },
    });

    if (!order) {
      return { success: false, reason: 'Order not found' };
    }

    if (order.status === OrderStatus.PENDING) {
      for (const item of order.items) {
        if (item.productVariantId) {
          await tx.productVariant.update({
            where: { id: item.productVariantId },
            data: {
              stock: { increment: item.quantity },
            },
          });
        }
      }

      await tx.order.update({
        where: { id: orderId },
        data: { status: newStatus },
      });

      await tx.payment.updateMany({
        where: {
          orderId,
          status: PaymentStatus.PENDING,
        },
        data: {
          status: PaymentStatus.FAILED,
          errorMessage,
        },
      });
    }

    let sessionToCancel: string | null = null;
    const stripePayment = order.payments.find(
      p => p.provider === PaymentProvider.STRIPE && p.providerPaymentId,
    );
    if (stripePayment?.providerPaymentId) {
      sessionToCancel = stripePayment.providerPaymentId;
    }

    return { success: true, status: newStatus, sessionToCancel };
  });

  if (shouldCancelStripe && result.sessionToCancel) {
    const sessionId = result.sessionToCancel;
    if (sessionId.startsWith('cs_')) {
      try {
        await stripe.checkout.sessions.expire(sessionId);
        console.log(
          `[Stripe] Successfully expired session ${sessionId} for order ${orderId}`,
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.log(
          `[Stripe] Note on expiring session ${sessionId}: ${msg}`,
        );
      }
    }
  }

  return result;
}

export async function confirmOrderPaymentAtomically(
  orderId: string,
  stripeSessionId?: string,
  paymentIntentId?: string,
  rawResponse?: Record<string, unknown>,
) {
  return await prisma.$transaction(async tx => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        payments: true,
      },
    });

    if (!order) {
      return { success: false, reason: 'Order not found' };
    }

    if (order.status === OrderStatus.PAID) {
      return { success: true, alreadyPaid: true };
    }

    const isExpired =
      order.status === OrderStatus.EXPIRED ||
      order.status === OrderStatus.CANCELLED ||
      (order.status === OrderStatus.PENDING && order.expiresAt < new Date());

    if (isExpired) {
      if (order.status === OrderStatus.PENDING) {
        for (const item of order.items) {
          if (item.productVariantId) {
            await tx.productVariant.update({
              where: { id: item.productVariantId },
              data: { stock: { increment: item.quantity } },
            });
          }
        }

        await tx.order.update({
          where: { id: orderId },
          data: { status: OrderStatus.EXPIRED },
        });
      }

      if (paymentIntentId) {
        try {
          await stripe.refunds.create({ payment_intent: paymentIntentId });
        } catch (refundErr) {
          console.error('[Stripe] Failed to refund expired order:', refundErr);
        }
      }

      await tx.payment.updateMany({
        where: { orderId },
        data: {
          status: PaymentStatus.REFUNDED,
          errorMessage: 'Payment captured after inventory reservation expired',
          providerPaymentId: paymentIntentId || stripeSessionId,
          ...(rawResponse
            ? { rawResponse: rawResponse as unknown as Prisma.InputJsonValue }
            : {}),
        },
      });

      return {
        success: false,
        refunded: true,
        reason: 'Reservation expired before payment completed',
      };
    }

    await tx.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.PAID },
    });

    await tx.payment.updateMany({
      where: { orderId },
      data: {
        status: PaymentStatus.COMPLETED,
        providerPaymentId: paymentIntentId || stripeSessionId,
        ...(rawResponse
          ? { rawResponse: rawResponse as unknown as Prisma.InputJsonValue }
          : {}),
      },
    });

    return { success: true };
  });
}
