import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { OrderStatus } from "@prisma/client";
import {
  confirmOrderPaymentAtomically,
  revertOrderReservationAtomically,
} from "@/lib/checkout";
import {
  OrderConfirmationClient,
  SerializedConfirmationItem,
  SerializedConfirmationOrder,
} from "./OrderConfirmationClient";

export const revalidate = 0;

interface PageProps {
  searchParams: Promise<{ orderId?: string; session_id?: string }>;
}

export default async function OrderConfirmationPage({ searchParams }: PageProps) {
  const { orderId, session_id } = await searchParams;

  // 1. Verify Stripe Checkout Session if returning with session_id
  if (session_id) {
    try {
      const session = await stripe.checkout.sessions.retrieve(session_id);
      const targetOrderId =
        orderId ||
        (session.metadata?.orderId as string | undefined) ||
        (session.client_reference_id as string | undefined);

      if (targetOrderId) {
        if (session.payment_status === "paid") {
          // Payment confirmed! Atomically lock order and finalize stock reduction
          await confirmOrderPaymentAtomically(
            targetOrderId,
            session.id,
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : session.id
          );
        } else {
          // Payment did NOT go through: atomically revert stock reservation & cancel Stripe session
          await revertOrderReservationAtomically(targetOrderId, {
            newStatus: OrderStatus.CANCELLED,
            errorMessage: "Payment not completed on Stripe",
            cancelStripeSession: true,
          });
        }
      }
    } catch (err) {
      console.error("Failed to verify Stripe checkout session:", err);
    }
  }

  // 2. Fetch the specific order requested
  if (!orderId) {
    redirect("/");
  }

  const dbOrder = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          variant: {
            include: { product: true },
          },
        },
      },
      address: true,
      payments: true,
    },
  });

  if (!dbOrder) {
    redirect("/");
  }

  // 3. If reservation expired while pending, revert stock and cancel Stripe session
  if (dbOrder.status === OrderStatus.PENDING && dbOrder.expiresAt < new Date()) {
    await revertOrderReservationAtomically(dbOrder.id, {
      newStatus: OrderStatus.EXPIRED,
      errorMessage: "Reservation window expired",
      cancelStripeSession: true,
    });
    dbOrder.status = OrderStatus.EXPIRED;
  }

  const payment = dbOrder.payments?.[0];
  const isStripe = payment?.provider === "STRIPE";
  const isPaid = dbOrder.status === OrderStatus.PAID;
  const isPending = dbOrder.status === OrderStatus.PENDING;

  // If a Stripe order is still unpaid or cancelled/expired
  const isUnpaidStripe = isStripe && (!isPaid || dbOrder.status === OrderStatus.CANCELLED || dbOrder.status === OrderStatus.EXPIRED);

  // If pending Stripe order without paid session, cancel it and release stock
  if (isStripe && isPending && !session_id) {
    await revertOrderReservationAtomically(dbOrder.id, {
      newStatus: OrderStatus.CANCELLED,
      errorMessage: "Customer returned without paying",
      cancelStripeSession: true,
    });
    dbOrder.status = OrderStatus.CANCELLED;
  }

  const destination = dbOrder.address
    ? `${dbOrder.address.street}, ${dbOrder.address.city}, ${dbOrder.address.state || ""} ${dbOrder.address.postalCode || ""}`
    : "Registered Delivery Address";

  const defaultImage =
    "https://lh3.googleusercontent.com/aida-public/AB6AXuD_EzyUfWjECBXOZXFDPjuDg5RJxAVsOB5aUVhjTnyaIwJRaT-Gc71mDvQroT3ma47k7tbaZwY4fBt3_C2fdnVQxiDFHuTnzMhDWfEwh3hBMzPjgt13uocgGk6Tk9ZhJwnblS7KK7u-hePgpCD5jNOkYXCvkAucmM5TA-VKCUblvRAF9qA_XP0MV6pwAb68vYOi8_Khcf-SGxPTwKXWK80-9UpVtJUjOnq2XgiW-GAIsvXqou0btdHi";

  const items: SerializedConfirmationItem[] = (dbOrder.items || []).map((item, idx) => {
    const attrs = (item.variant?.attributes || {}) as Record<string, any>;
    const img = attrs.image || defaultImage;
    const specs = attrs.speed || attrs.clock || attrs.vram || "";

    return {
      id: item.id,
      title: item.titleSnapshot,
      sku: item.skuSnapshot,
      quantity: item.quantity,
      unitPrice: Number(item.priceAtPurchase),
      total: Number(item.priceAtPurchase) * item.quantity,
      image: img,
      specs,
      serialNumber: `SN-${item.skuSnapshot.slice(0, 4)}-${String(idx + 8812).padStart(6, "0")}`,
    };
  });

  const serializedOrder: SerializedConfirmationOrder = {
    id: dbOrder.id,
    orderNumber: `KH-${dbOrder.id.slice(0, 8).toUpperCase()}`,
    status: dbOrder.status,
    totalAmount: Number(dbOrder.totalAmount),
    createdAt: dbOrder.createdAt.toISOString(),
    carrier: "KILOHERTZ DIRECT FREIGHT",
    destination,
    paymentMethod: payment?.provider === "CASH_ON_DELIVERY" ? "Cash on Delivery" : "Credit Card / Stripe",
    items,
  };

  return <OrderConfirmationClient order={serializedOrder} isUnpaidStripe={isUnpaidStripe} />;
}
