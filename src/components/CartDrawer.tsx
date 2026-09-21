"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useCart } from "@/context/CartContext";

export function CartDrawer() {
  const {
    items,
    isOpen,
    closeCart,
    removeItem,
    updateQuantity,
    itemCount,
    subtotal,
    clearCart,
  } = useCart();

  const [secondsRemaining, setSecondsRemaining] = useState(899); // 14:59

  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 899));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 top-[60px] bg-primary/40 backdrop-blur-[2px] z-50 transition-opacity duration-200"
        onClick={closeCart}
      />

      {/* Slide-In Drawer */}
      <div className="fixed top-[60px] right-0 bottom-0 w-full sm:w-[490px] bg-surface-container-lowest border-l border-outline-variant z-50 flex flex-col shadow-2xl animate-in slide-in-from-right duration-250">
        {/* Top Realtime Bar */}
        <div className="bg-surface-container-high px-6 py-2 border-b border-outline-variant flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
            <span className="text-xs text-on-surface-variant font-medium">
              Shopping Cart
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <button
              onClick={() => clearCart()}
              className="px-2 py-0.5 text-on-surface-variant hover:text-error transition-colors cursor-pointer"
              title="Empty Cart"
            >
              Clear Cart
            </button>
          </div>
        </div>

        {/* Header */}
        <header className="bg-surface-container-low/80 px-6 py-4 border-b border-outline-variant flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-on-surface">
                  Your Cart
                </h2>
                <span className="text-xs bg-surface-container-highest px-2 py-0.5 rounded text-on-surface font-semibold border border-outline-variant">
                  {itemCount} {itemCount === 1 ? "item" : "items"}
                </span>
              </div>

            </div>
          </div>
          <button
            onClick={closeCart}
            aria-label="Close cart"
            className="w-8 h-8 rounded border border-outline-variant bg-surface-container-lowest hover:bg-surface-container text-on-surface flex items-center justify-center transition-colors cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </header>

        {/* Content Area */}
        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-surface-container-low border border-outline-variant flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-outline text-[32px]">
                shopping_bag
              </span>
            </div>
            <h3 className="text-base font-bold text-on-surface mb-1">
              Your cart is empty
            </h3>
            <p className="text-xs text-on-surface-variant max-w-xs mb-6">
              Looks like you haven&apos;t added any hardware components yet.
            </p>
            <Link
              href="/categories/cpus"
              onClick={closeCart}
              className="bg-primary hover:bg-primary-container text-on-primary px-5 py-2.5 rounded text-xs font-semibold transition-colors"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          <>
            {/* Scrollable Items List */}
            <div className="flex-1 overflow-y-auto divide-y divide-surface-container p-6 space-y-4">
              {items.map((item, itemIdx) => {
                const uniqueKey = item.sku ? `cart-${item.sku}` : (item.id ? `cart-${item.id}` : `cart-${itemIdx}`);
                const itemIdentifier = item.sku || item.id;

                return (
                  <article
                    key={uniqueKey}
                    className="pt-4 first:pt-0 flex flex-col gap-3 group"
                  >
                    <div className="flex items-start gap-3">
                      {/* Thumbnail */}
                      <div className="w-16 h-16 rounded bg-surface-container-low border border-outline-variant p-1 flex items-center justify-center shrink-0 relative overflow-hidden">
                        <Image
                          alt={item.name}
                          className="object-contain p-1"
                          src={item.image}
                          fill
                          sizes="64px"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider truncate font-mono">
                            {item.sku}
                          </span>
                            <button
                              onClick={() => removeItem(itemIdentifier)}
                              className="font-label-sm text-label-sm text-on-surface-variant hover:text-error transition-colors flex items-center gap-0.5 cursor-pointer font-mono"
                              type="button"
                            >
                              <span className="material-symbols-outlined text-[14px]">
                                delete
                              </span>
                            </button>
                          </div>
                          <h3 className="font-headline-sm text-headline-sm text-on-surface mt-0.5 truncate">
                            {item.name}
                          </h3>
                          {/* Spec Pills */}
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5 font-mono">
                            {item.badges.map((b, idx) => (
                              <span
                                key={idx}
                                className="font-label-sm text-label-sm bg-surface-container px-1.5 py-0.5 rounded text-on-surface"
                              >
                                {b}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Metric Row: Quantity Stepper + Tabular Price */}
                      <div className="flex items-center justify-between pt-1 border-t border-surface-container-low pl-[76px]">
                        <div className="flex items-center border border-outline-variant rounded bg-surface-container-lowest">
                          <button
                            onClick={() => updateQuantity(itemIdentifier, -1)}
                            className="w-6 h-6 flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-colors font-label-sm text-label-sm font-bold cursor-pointer"
                            type="button"
                          >
                            -
                          </button>
                          <span className="w-8 text-center font-metric-tabular text-sm font-bold">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(itemIdentifier, 1)}
                            className="w-6 h-6 flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-colors font-label-sm text-label-sm font-bold cursor-pointer"
                            type="button"
                          >
                            +
                          </button>
                        </div>

                        <div className="text-right">
                          <span className="font-metric-tabular text-sm font-bold text-on-surface">
                            ${(item.price * item.quantity).toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

            {/* Footer Summary & Checkout Action */}
            <div className="border-t border-outline-variant bg-surface-container-low/60 p-6 space-y-4 shrink-0">
              {/* Price Breakdown */}
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-on-surface-variant">
                  <span>Subtotal:</span>
                  <span className="font-metric-tabular text-on-surface font-semibold">
                    ${subtotal.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="flex justify-between text-on-surface-variant">
                  <span>Shipping:</span>
                  <span className="font-metric-tabular text-secondary font-semibold">
                    calculated at checkout
                  </span>
                </div>
                <div className="flex justify-between items-baseline pt-2 border-t border-outline-variant text-base font-bold">
                  <span className="text-on-surface">Total:</span>
                  <span className="font-metric-tabular text-xl text-primary">
                    ${subtotal.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <Link
                  href="/checkout"
                  onClick={closeCart}
                  className="w-full bg-primary hover:bg-primary-container text-on-primary py-3 px-4 rounded text-sm font-semibold flex items-center justify-center gap-2 transition-colors tracking-wide"
                >
                  <span>Proceed to Checkout</span>
                  <span className="material-symbols-outlined text-[18px]">
                    arrow_forward
                  </span>
                </Link>
                <button
                  onClick={closeCart}
                  className="w-full bg-surface-container-lowest border border-outline-variant hover:bg-surface-container text-on-surface py-2 px-4 rounded text-xs transition-colors cursor-pointer"
                >
                  Continue Shopping
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
