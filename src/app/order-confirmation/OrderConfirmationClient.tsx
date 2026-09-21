"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useCart } from "@/context/CartContext";

export interface SerializedConfirmationItem {
  id: string;
  title: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  total: number;
  image: string;
  specs: string;
  serialNumber: string;
}

export interface SerializedConfirmationOrder {
  id: string;
  orderNumber: string;
  status: "PENDING" | "PAID" | "SHIPPED" | "EXPIRED" | "CANCELLED";
  totalAmount: number;
  carrier: string;
  destination: string;
  paymentMethod: string;
  createdAt: string;
  items: SerializedConfirmationItem[];
}

import { toast } from "sonner";

interface OrderConfirmationClientProps {
  order: SerializedConfirmationOrder;
  isUnpaidStripe?: boolean;
}

export function OrderConfirmationClient({ order, isUnpaidStripe = false }: OrderConfirmationClientProps) {
  const { clearCart } = useCart();
  const clearedRef = useRef(false);

  useEffect(() => {
    if (clearedRef.current) return;
    clearedRef.current = true;

    if (isUnpaidStripe) {
      toast.error("Payment Incomplete", {
        description: "Your payment was not completed on Stripe. No funds were deducted.",
      });
    } else if (order.status === "PAID" || order.status === "SHIPPED" || order.paymentMethod.includes("Cash")) {
      clearCart();
      toast.success("Order Confirmed!", {
        description: `Order #${order.orderNumber} is locked in and being prepped for dispatch.`,
      });
    }
  }, [order.status, order.paymentMethod, order.orderNumber, isUnpaidStripe, clearCart]);

  return (
    <div className="flex flex-col min-h-screen bg-surface">
      <Header />

      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page {
                margin: 12mm;
                size: auto;
              }
              body {
                background: white !important;
                color: black !important;
              }
              body * {
                visibility: hidden !important;
              }
              #printable-receipt,
              #printable-receipt * {
                visibility: visible !important;
              }
              #printable-receipt {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
                margin: 0 !important;
                border: 1px solid #e5e7eb !important;
                box-shadow: none !important;
                background: white !important;
                color: #111827 !important;
                border-radius: 8px !important;
              }
              .print-hidden,
              .print-hidden * {
                display: none !important;
                visibility: hidden !important;
              }
            }
          `,
        }}
      />

      <main className="w-full pt-[60px] min-h-[calc(100vh-140px)] bg-surface">
        <div className="flex flex-col w-full">
          {/* Main Content Area */}
          <div className="max-w-[1000px] w-full mx-auto px-4 sm:px-8 py-10 sm:py-14">
            {/* Status Anchor */}
            {isUnpaidStripe ? (
              <div className="text-center max-w-xl mx-auto mb-10 print-hidden">
                <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4 text-amber-600">
                  <span className="material-symbols-outlined text-[28px]">
                    warning
                  </span>
                </div>
                <h1 className="font-headline-lg text-3xl text-on-surface tracking-tight mb-2 font-bold">
                  Payment Incomplete
                </h1>
                <div className="inline-block px-3 py-1 bg-surface-container-low border border-outline-variant rounded text-xs text-on-surface font-semibold mb-3 font-mono">
                  Order #{order.orderNumber}
                </div>
                <p className="font-body-md text-sm text-on-surface-variant leading-relaxed mb-6">
                  Your payment was not completed on Stripe. No funds were charged, and this order has not been dispatched.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <Link
                    href="/checkout"
                    className="bg-primary hover:bg-secondary text-on-primary font-semibold text-xs py-2.5 px-5 rounded-lg transition-colors cursor-pointer"
                  >
                    Return to Checkout
                  </Link>
                  <Link
                    href="/"
                    className="bg-surface-container-low border border-outline-variant hover:bg-surface-container text-on-surface font-semibold text-xs py-2.5 px-5 rounded-lg transition-colors cursor-pointer"
                  >
                    Continue Browsing
                  </Link>
                </div>
              </div>
            ) : (
              <div className="text-center max-w-xl mx-auto mb-10 print-hidden">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4 text-emerald-600">
                  <span className="material-symbols-outlined text-[28px]">
                    check_circle
                  </span>
                </div>
                <h1 className="font-headline-lg text-3xl text-on-surface tracking-tight mb-2 font-bold">
                  Order Confirmed
                </h1>
                <div className="inline-block px-3 py-1 bg-surface-container-low border border-outline-variant rounded text-xs text-on-surface font-semibold mb-3 font-mono">
                  Order #{order.orderNumber}
                </div>
                <p className="font-body-md text-sm text-on-surface-variant leading-relaxed">
                  Thank you for your order! We&apos;ve received your order and our team is getting your hardware packed and ready to ship.
                </p>
              </div>
            )}

            {/* Core Receipt Container */}
            <div
              id="printable-receipt"
              className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm"
            >
              {/* Print-Only Store Branding Header */}
              <div className="hidden print:flex items-center justify-between pb-4 border-b border-gray-200 px-6 pt-6">
                <div>
                  <h1 className="text-xl font-bold text-black tracking-tight">
                    KILOHERTZ // HARDWARE
                  </h1>
                  <p className="text-xs text-gray-500">Official Order Receipt</p>
                </div>
                <div className="text-right text-xs text-gray-700 font-mono">
                  <div className="font-bold">Order #{order.orderNumber}</div>
                  <div>{order.createdAt}</div>
                </div>
              </div>

              <div className="bg-surface-container-low border-b border-outline-variant px-6 py-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-primary">
                    receipt_long
                  </span>
                  <h2 className="font-headline-sm text-sm text-on-surface font-semibold">
                    Order Summary & Receipt
                  </h2>
                </div>
                <div className="text-xs text-on-surface-variant font-mono">
                  Placed on {order.createdAt}
                </div>
              </div>

              {/* Items Table */}
              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-outline-variant bg-surface-container-low/50">
                        <th className="py-2.5 px-4 text-xs uppercase text-on-surface-variant font-semibold">
                          Item
                        </th>
                        <th className="py-2.5 px-4 text-xs uppercase text-on-surface-variant font-semibold text-center">
                          Qty
                        </th>
                        <th className="py-2.5 px-4 text-xs uppercase text-on-surface-variant font-semibold text-right">
                          Price
                        </th>
                        <th className="py-2.5 px-4 text-xs uppercase text-on-surface-variant font-semibold text-right">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-container-highest">
                      {order.items.map((item) => (
                        <tr key={item.id} className="hover:bg-surface-container-low/40 transition-colors">
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-surface-container-low border border-outline-variant rounded-lg p-1 flex items-center justify-center shrink-0">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  className="w-full h-full object-contain"
                                  alt={item.title}
                                  src={item.image}
                                />
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-on-surface">
                                  {item.title}
                                </div>
                                <div className="text-xs text-on-surface-variant mt-0.5 font-mono">
                                  SKU: {item.sku}
                                  {item.specs ? ` • ${item.specs}` : ""}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-center text-sm font-mono text-on-surface">
                            {item.quantity}
                          </td>
                          <td className="py-4 px-4 text-right text-sm font-mono text-on-surface-variant">
                            ${item.unitPrice.toFixed(2)}
                          </td>
                          <td className="py-4 px-4 text-right text-sm font-mono font-semibold text-on-surface">
                            ${item.total.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Shipping & Financial Summary */}
                <div className="mt-6 pt-5 border-t border-outline-variant flex flex-col sm:flex-row justify-between gap-6">
                  <div className="text-xs text-on-surface-variant space-y-1.5">
                    <div>
                      <strong className="text-on-surface">Shipping to:</strong> {order.destination}
                    </div>
                    <div>
                      <strong className="text-on-surface">Delivery method:</strong> {order.carrier}
                    </div>
                    <div>
                      <strong className="text-on-surface">Payment:</strong> {order.paymentMethod}
                    </div>
                  </div>

                  <div className="w-full sm:w-72 space-y-2 text-xs font-mono">
                    <div className="flex justify-between text-on-surface-variant">
                      <span>Subtotal:</span>
                      <span className="text-on-surface font-semibold">
                        ${order.totalAmount.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-on-surface-variant">
                      <span>Estimated tax:</span>
                      <span className="text-on-surface font-semibold">
                        $0.00
                      </span>
                    </div>
                    <div className="flex justify-between text-on-surface-variant">
                      <span>Shipping:</span>
                      <span className="text-secondary font-semibold">
                        Free
                      </span>
                    </div>
                    <div className="flex justify-between items-baseline pt-2 border-t border-outline-variant text-base font-bold">
                      <span className="text-on-surface font-sans">Total Paid:</span>
                      <span className="text-lg text-primary">
                        ${order.totalAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-8 pt-6 border-t border-outline-variant flex flex-wrap gap-3 print-hidden print:hidden">
                  <button
                    onClick={() => window.print()}
                    type="button"
                    className="px-4 py-2 bg-surface-container-low border border-outline-variant rounded-md text-xs font-semibold text-on-surface hover:bg-surface-container transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      print
                    </span>
                    <span>Print Receipt</span>
                  </button>
                  <Link
                    href="/account"
                    className="px-4 py-2 bg-primary hover:bg-primary-container text-on-primary rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      account_circle
                    </span>
                    <span>View in My Account</span>
                  </Link>
                  <Link
                    href="/"
                    className="px-4 py-2 bg-surface-container-lowest border border-outline-variant rounded-md text-xs font-semibold text-on-surface hover:bg-surface-container transition-colors flex items-center gap-1.5"
                  >
                    <span>Continue Shopping</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
