import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import { OrderStatus } from '@prisma/client';

interface SuccessPageProps {
  searchParams: Promise<{ session_id?: string }>;
}

export default async function CheckoutSuccessPage({
  searchParams,
}: SuccessPageProps) {
  const { session_id } = await searchParams;

  if (!session_id) {
    redirect('/');
  }

  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(session_id);
  } catch {
    notFound();
  }

  const orderId = session.metadata?.orderId || session.client_reference_id;

  if (!orderId) {
    notFound();
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      payments: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!order) {
    notFound();
  }

  const latestPayment = order.payments[0];
  const isPaid = order.status === OrderStatus.PAID;

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="border border-neutral-800 bg-neutral-900/60 backdrop-blur rounded-xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
            <div>
              <span className="text-xs uppercase tracking-widest text-emerald-400 font-semibold">
                Payment Received
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mt-1">
                Order Confirmed
              </h1>
            </div>
            <div className="text-right">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                  isPaid
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}
              >
                {order.status}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-neutral-400 pt-2">
            <div>
              <span className="block text-xs uppercase tracking-wider text-neutral-500 font-medium">
                Order ID
              </span>
              <span className="font-mono text-neutral-200 break-all">
                {order.id}
              </span>
            </div>
            <div>
              <span className="block text-xs uppercase tracking-wider text-neutral-500 font-medium">
                Transaction ID
              </span>
              <span className="font-mono text-neutral-200 break-all">
                {latestPayment?.providerPaymentId || session.id}
              </span>
            </div>
          </div>
        </div>

        <div className="border border-neutral-800 bg-neutral-900/60 backdrop-blur rounded-xl p-6 sm:p-8 space-y-6">
          <h2 className="text-lg font-semibold text-white tracking-wide border-b border-neutral-800 pb-3">
            Hardware Summary
          </h2>

          <div className="divide-y divide-neutral-800">
            {order.items.map(item => {
              const unitPrice = Number(item.priceAtPurchase);
              const lineTotal = unitPrice * item.quantity;

              return (
                <div
                  key={item.id}
                  className="py-4 flex items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <p className="font-medium text-neutral-100">
                      {item.titleSnapshot}
                    </p>
                    <p className="font-mono text-xs text-neutral-400">
                      SKU: {item.skuSnapshot}
                    </p>
                    <p className="text-xs text-neutral-400">
                      Qty: {item.quantity} &times; ${unitPrice.toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right font-mono font-medium text-neutral-200">
                    ${lineTotal.toFixed(2)}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t border-neutral-800 pt-4 space-y-2 text-sm">
            <div className="flex justify-between text-neutral-400">
              <span>Subtotal</span>
              <span className="font-mono">
                ${Number(order.totalAmount).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-neutral-400">
              <span>Shipping & Handling</span>
              <span className="font-mono">$0.00</span>
            </div>
            <div className="flex justify-between text-base font-semibold text-white pt-2 border-t border-neutral-800">
              <span>Total Paid</span>
              <span className="font-mono text-emerald-400">
                ${Number(order.totalAmount).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 pt-2">
          <Link
            href="/"
            className="flex-1 text-center bg-neutral-100 hover:bg-white text-neutral-900 font-medium py-3 px-6 rounded-lg transition"
          >
            Continue Shopping
          </Link>
          <Link
            href="/account/orders"
            className="flex-1 text-center bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 font-medium py-3 px-6 rounded-lg transition"
          >
            View Order History
          </Link>
        </div>
      </div>
    </main>
  );
}
