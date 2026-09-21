import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import {
  confirmOrderPaymentAtomically,
  revertOrderReservationAtomically,
} from '@/lib/checkout';
import { OrderStatus } from '@prisma/client';
import Stripe from 'stripe';

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Webhook verification failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId =
          session.metadata?.orderId || session.client_reference_id;

        if (!orderId) {
          return NextResponse.json(
            { error: 'Missing order metadata' },
            { status: 400 },
          );
        }

        const paymentIntentId =
          typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.id;

        await confirmOrderPaymentAtomically(
          orderId,
          session.id,
          paymentIntentId,
          session as unknown as Record<string, unknown>,
        );
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId =
          session.metadata?.orderId || session.client_reference_id;

        if (orderId) {
          await revertOrderReservationAtomically(orderId, {
            newStatus: OrderStatus.EXPIRED,
            errorMessage: 'Stripe checkout session expired',
            cancelStripeSession: false,
          });
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const intent = event.data.object as Stripe.PaymentIntent;
        const orderId = intent.metadata?.orderId;

        if (orderId) {
          await revertOrderReservationAtomically(orderId, {
            newStatus: OrderStatus.CANCELLED,
            errorMessage: intent.last_payment_error?.message ?? 'Payment failed',
            cancelStripeSession: true,
          });
        }
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (dbError: unknown) {
    const message =
      dbError instanceof Error ? dbError.message : 'Webhook handler failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
