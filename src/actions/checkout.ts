'use server';

import { redirect } from 'next/navigation';
import { stripe } from '@/lib/stripe';
import {
  createOrderAtomically,
  createDirectOrderAtomically,
  revertOrderReservationAtomically,
  CheckoutItemInput,
} from '@/lib/checkout';
import { prisma } from '@/lib/prisma';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { createClient } from '@/lib/supabase/server';

export async function checkoutAction(
  userId: string,
  items: CheckoutItemInput[],
  addressId?: string,
) {
  if (!userId) {
    throw new Error('Unauthorized');
  }

  if (!items || !items.length) {
    throw new Error('Cart is empty');
  }

  const { order } = await createOrderAtomically(userId, items, addressId);

  const orderWithItems = await prisma.order.findUniqueOrThrow({
    where: { id: order.id },
    include: { items: true },
  });

  const lineItems = orderWithItems.items.map(item => ({
    price_data: {
      currency: 'usd',
      product_data: {
        name: item.titleSnapshot,
        metadata: {
          sku: item.skuSnapshot,
        },
      },
      unit_amount: Math.round(Number(item.priceAtPurchase) * 100),
    },
    quantity: item.quantity,
  }));

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: lineItems,
      client_reference_id: order.id,
      expires_at: Math.floor(order.expiresAt.getTime() / 1000),
      metadata: {
        orderId: order.id,
        userId,
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/cancel?orderId=${order.id}`,
    });

    if (!session.url) {
      throw new Error('Failed to initialize Stripe checkout session');
    }

    if (session.id) {
      await prisma.payment.updateMany({
        where: { orderId: order.id },
        data: { providerPaymentId: session.id },
      });
    }

    redirect(session.url);
  } catch (stripeErr) {
    console.error('[Checkout] Error initializing Stripe, reverting atomic reservation:', stripeErr);
    await revertOrderReservationAtomically(order.id, {
      newStatus: OrderStatus.CANCELLED,
      errorMessage: 'Stripe initialization failed',
      cancelStripeSession: false,
    });
    throw stripeErr;
  }
}

export interface DirectOrderInput {
  name: string;
  email: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
  phone?: string;
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

export async function submitDirectOrderAction(input: DirectOrderInput) {
  if (!input.items || input.items.length === 0) {
    throw new Error('Cannot checkout with an empty manifest.');
  }

  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  const userEmail = authUser?.email || input.email;
  const userName =
    authUser?.user_metadata?.full_name ||
    authUser?.user_metadata?.name ||
    input.name;

  let user = await prisma.user.findFirst({
    where: {
      OR: [
        ...(authUser?.id ? [{ id: authUser.id }] : []),
        { email: userEmail },
      ],
    },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        id: authUser?.id,
        email: userEmail,
        name: userName,
        role: 'CUSTOMER',
      },
    });
  }

  let targetAddressId = input.addressId;

  if (!targetAddressId) {
    const address = await prisma.address.create({
      data: {
        userId: user.id,
        street: input.street,
        city: input.city,
        state: input.state,
        postalCode: input.postalCode,
        country: input.country || 'Egypt',
        phone: input.phone || null,
        lat: 30.0444,
        lng: 31.2357,
        isDefault: false,
      },
    });
    targetAddressId = address.id;
  }

  const { order, resolvedOrderItems, freightCost } =
    await createDirectOrderAtomically({
      userId: user.id,
      addressId: targetAddressId,
      paymentMethod: input.paymentMethod,
      freightMethod: input.freightMethod,
      items: input.items,
    });

  if (input.paymentMethod === 'card') {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const lineItems = resolvedOrderItems.map(item => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.titleSnapshot,
          metadata: {
            sku: item.skuSnapshot,
          },
        },
        unit_amount: Math.round(Number(item.priceAtPurchase) * 100),
      },
      quantity: item.quantity,
    }));

    if (freightCost > 0) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Express Overnight Delivery Freight',
            metadata: { sku: 'FREIGHT-OVERNIGHT' },
          },
          unit_amount: Math.round(freightCost * 100),
        },
        quantity: 1,
      });
    }

    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        line_items: lineItems,
        customer_email: userEmail,
        client_reference_id: order.id,
        expires_at: Math.floor(order.expiresAt.getTime() / 1000),
        metadata: {
          orderId: order.id,
          userId: user.id,
        },
        success_url: `${appUrl}/order-confirmation?orderId=${order.id}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/checkout?cancelled=true&orderId=${order.id}`,
      });

      if (session.id) {
        await prisma.payment.updateMany({
          where: { orderId: order.id },
          data: { providerPaymentId: session.id },
        });
      }

      if (session.url) {
        return { orderId: order.id, stripeUrl: session.url };
      }
    } catch (stripeErr) {
      console.error(
        '[Checkout] Stripe session initialization failed, reverting atomic stock reservation:',
        stripeErr,
      );
      await revertOrderReservationAtomically(order.id, {
        newStatus: OrderStatus.CANCELLED,
        errorMessage: 'Stripe checkout initialization failed',
        cancelStripeSession: false,
      });
      throw new Error(
        'Unable to initialize secure payment session. All items in your order remain available in stock.',
      );
    }
  }

  return { orderId: order.id, stripeUrl: null };
}

export async function cancelPendingOrderAction(orderId: string) {
  if (!orderId) return { success: false };

  try {
    return await revertOrderReservationAtomically(orderId, {
      newStatus: OrderStatus.CANCELLED,
      errorMessage: 'Checkout abandoned or cancelled by customer',
      cancelStripeSession: true,
    });
  } catch (err) {
    console.error('Failed to cancel pending order:', err);
    return { success: false, error: String(err) };
  }
}
