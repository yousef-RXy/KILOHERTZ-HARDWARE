"use client";

import { useCart } from "@/context/CartContext";
import { useState } from "react";

export function CartConflictModal() {
  const { conflictData, resolveMerge, resolveKeepLocal, resolveKeepRemote } = useCart();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  if (!conflictData) return null;

  const { localItems, remoteItems } = conflictData;

  const localSubtotal = localItems.reduce((acc, i) => acc + i.price * i.quantity, 0);
  const localCount = localItems.reduce((acc, i) => acc + i.quantity, 0);

  const remoteSubtotal = remoteItems.reduce((acc, i) => acc + i.price * i.quantity, 0);
  const remoteCount = remoteItems.reduce((acc, i) => acc + i.quantity, 0);

  const handleMerge = async () => {
    setLoadingAction("merge");
    try {
      await resolveMerge();
    } finally {
      setLoadingAction(null);
    }
  };

  const handleKeepLocal = async () => {
    setLoadingAction("local");
    try {
      await resolveKeepLocal();
    } finally {
      setLoadingAction(null);
    }
  };

  const handleKeepRemote = async () => {
    setLoadingAction("remote");
    try {
      await resolveKeepRemote();
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-6 border-b border-outline-variant bg-surface-container-low">
          <div className="flex items-center gap-2 text-secondary mb-1">
            <span className="material-symbols-outlined text-[20px]">sync_problem</span>
            <span className="font-label-sm text-label-sm font-bold uppercase font-mono">
              Cart Conflict Detected
            </span>
          </div>
          <h2 className="font-headline-md text-headline-md text-on-surface font-semibold">
            Choose which cart to keep
          </h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 leading-relaxed">
            You have items from your current browsing session as well as previously saved items in your account.
            Review both carts below and select how you would like to proceed.
          </p>
        </div>

        {/* Modal Body: Two Carts Comparison */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6 font-mono">
          {/* Card 1: Current Session Cart */}
          <div className="border border-outline-variant rounded-lg bg-surface flex flex-col overflow-hidden">
            <div className="p-4 bg-surface-container-low border-b border-outline-variant flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold tracking-wider uppercase text-on-surface-variant block">
                  CURRENT SESSION
                </span>
                <span className="text-xs font-bold text-on-surface">
                  This Browser
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-primary block">
                  ${localSubtotal.toFixed(2)}
                </span>
                <span className="text-[11px] text-on-surface-variant">
                  {localCount} {localCount === 1 ? "item" : "items"}
                </span>
              </div>
            </div>

            <div className="p-3 divide-y divide-surface-container overflow-y-auto max-h-60 flex-1">
              {localItems.map((item) => (
                <div key={item.id + item.sku} className="py-2.5 first:pt-0 last:pb-0 flex items-center gap-3">
                  <div className="w-10 h-10 bg-surface-container-lowest border border-outline-variant rounded p-0.5 shrink-0 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-on-surface truncate">
                      {item.name}
                    </p>
                    <p className="text-[10px] text-on-surface-variant">
                      Qty: {item.quantity} × ${item.price.toFixed(2)}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-on-surface shrink-0">
                    ${(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Card 2: Saved Account Cart */}
          <div className="border border-outline-variant rounded-lg bg-surface flex flex-col overflow-hidden">
            <div className="p-4 bg-surface-container-low border-b border-outline-variant flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold tracking-wider uppercase text-secondary block">
                  SAVED ACCOUNT
                </span>
                <span className="text-xs font-bold text-on-surface">
                  Your Account Cart
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-primary block">
                  ${remoteSubtotal.toFixed(2)}
                </span>
                <span className="text-[11px] text-on-surface-variant">
                  {remoteCount} {remoteCount === 1 ? "item" : "items"}
                </span>
              </div>
            </div>

            <div className="p-3 divide-y divide-surface-container overflow-y-auto max-h-60 flex-1">
              {remoteItems.map((item) => (
                <div key={item.id + item.sku} className="py-2.5 first:pt-0 last:pb-0 flex items-center gap-3">
                  <div className="w-10 h-10 bg-surface-container-lowest border border-outline-variant rounded p-0.5 shrink-0 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-on-surface truncate">
                      {item.name}
                    </p>
                    <p className="text-[10px] text-on-surface-variant">
                      Qty: {item.quantity} × ${item.price.toFixed(2)}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-on-surface shrink-0">
                    ${(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-5 border-t border-outline-variant bg-surface-container-low flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 font-mono">
          <button
            type="button"
            onClick={handleKeepRemote}
            disabled={!!loadingAction}
            className="px-4 py-2.5 bg-surface-container-lowest hover:bg-surface-container-highest border border-outline-variant text-on-surface rounded text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[16px]">restore</span>
            <span>Keep Saved Account Cart</span>
          </button>

          <button
            type="button"
            onClick={handleKeepLocal}
            disabled={!!loadingAction}
            className="px-4 py-2.5 bg-surface-container-lowest hover:bg-surface-container-highest border border-outline-variant text-on-surface rounded text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[16px]">swap_horiz</span>
            <span>Keep Current Cart</span>
          </button>

          <button
            type="button"
            onClick={handleMerge}
            disabled={!!loadingAction}
            className="px-5 py-2.5 bg-primary hover:bg-primary-container text-on-primary rounded text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px]">merge_type</span>
            <span>
              {loadingAction === "merge" ? "Merging Carts..." : "Merge Both Carts (Recommended)"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
