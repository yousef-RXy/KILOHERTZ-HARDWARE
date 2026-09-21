"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useCart } from "@/context/CartContext";
import { MarkdownContent } from "./MarkdownContent";

export interface ConciergeVariant {
  id?: string;
  sku: string;
  attributes: Record<string, any>;
  price: number;
  stock: number;
}

export interface ConciergeProduct {
  id: string;
  name: string;
  slug: string;
  description: string;
  basePrice: string | number;
  similarity?: number;
  variants: ConciergeVariant[];
}

export interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  products?: ConciergeProduct[];
  isStreaming?: boolean;
}

const DEFAULT_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuD_EzyUfWjECBXOZXFDPjuDg5RJxAVsOB5aUVhjTnyaIwJRaT-Gc71mDvQroT3ma47k7tbaZwY4fBt3_C2fdnVQxiDFHuTnzMhDWfEwh3hBMzPjgt13uocgGk6Tk9ZhJwnblS7KK7u-hePgpCD5jNOkYXCvkAucmM5TA-VKCUblvRAF9qA_XP0MV6pwAb68vYOi8_Khcf-SGxPTwKXWK80-9UpVtJUjOnq2XgiW-GAIsvXqou0btdHi";

const SUGGESTED_QUERIES = [
  "Recommend a 2TB NVMe SSD with DRAM",
  "High performance AM5 Processor",
  "PCIe 5.0 High-Speed Storage",
];

const STORAGE_KEY = "kilohertz_ai_concierge_history_v2";

const INITIAL_MESSAGE: ChatMessage = {
  id: "initial-welcome",
  sender: "assistant",
  text: "Welcome to the Kilohertz Lab. Ask me for hardware recommendations, spec verifications (PCIe lanes, DRAM cache, VRAM, thermals), or custom build pairings.",
};

// Helper to rank recommendation cards matching the AI model's actual textual response
function getOrderedRecommendations(
  products: ConciergeProduct[] | undefined,
  aiText: string,
  userQuery: string
): Array<{ product: ConciergeProduct; variant: ConciergeVariant; rank: number }> {
  if (!products || products.length === 0) return [];

  const lowerText = (aiText || "").toLowerCase();
  const lowerQuery = (userQuery || "").toLowerCase();

  const mapped = products.map((product) => {
    // 1. Find the best matching variant for this product
    let bestVariant = product.variants?.[0];
    let matchedBySku = false;

    for (const v of product.variants || []) {
      if (v.sku && lowerText.includes(v.sku.toLowerCase())) {
        bestVariant = v;
        matchedBySku = true;
        break;
      }
    }

    if (!matchedBySku) {
      // Check if query or AI text specifies a target capacity (e.g. 2TB, 4TB, 1TB)
      const targetCapacity =
        lowerQuery.match(/(\d+\s*tb|\d+\s*gb)/i)?.[0]?.replace(/\s+/g, "").toUpperCase() ||
        lowerText.match(/(\d+\s*tb|\d+\s*gb)/i)?.[0]?.replace(/\s+/g, "").toUpperCase();

      if (targetCapacity) {
        const capacityMatch = product.variants?.find((v) => {
          const cap = String(v.attributes?.capacity || "").replace(/\s+/g, "").toUpperCase();
          return cap === targetCapacity;
        });
        if (capacityMatch) {
          bestVariant = capacityMatch;
        }
      }
    }

    // 2. Find position of product/variant in AI text
    const pName = product.name.toLowerCase();
    const keywords = pName
      .split(/\s+/)
      .filter((w) => w.length > 3 && !["with", "pcie", "nvme", "m.2", "solid", "state", "drive"].includes(w));

    let earliestIndex = 999999;

    // Check SKU first
    if (bestVariant?.sku) {
      const skuIdx = lowerText.indexOf(bestVariant.sku.toLowerCase());
      if (skuIdx !== -1 && skuIdx < earliestIndex) earliestIndex = skuIdx;
    }

    // Check slug
    if (product.slug) {
      const slugIdx = lowerText.indexOf(product.slug.toLowerCase());
      if (slugIdx !== -1 && slugIdx < earliestIndex) earliestIndex = slugIdx;
    }

    // Check main keywords
    for (const kw of keywords) {
      const kwIdx = lowerText.indexOf(kw);
      if (kwIdx !== -1 && kwIdx < earliestIndex) earliestIndex = kwIdx;
    }

    return {
      product,
      variant: bestVariant,
      rank: earliestIndex,
    };
  });

  // Sort products in the exact sequence the AI recommended them
  return mapped.sort((a, b) => a.rank - b.rank);
}

export function AiAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});
  const [confirmingItemKey, setConfirmingItemKey] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);

  const router = useRouter();
  const { addItem, openCart } = useCart();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Restore chat history from sessionStorage on mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Save chat history to sessionStorage on change
  useEffect(() => {
    try {
      if (messages.length > 1 || (messages.length === 1 && messages[0].id !== "initial-welcome")) {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
      }
    } catch {
      // ignore
    }
  }, [messages]);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isLoading]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const handleClearHistory = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: "assistant",
        text: "Conversation cleared. Ask me anything about lab components, specs, or hardware recommendations.",
      },
    ]);
    setConfirmingItemKey(null);
    setAddedIds({});
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  // Step 1: Open inline confirmation for this specific item
  const handleInitiateAdd = (e: React.MouseEvent, itemKey: string) => {
    e.stopPropagation();
    e.preventDefault();
    setConfirmingItemKey(itemKey);
  };

  const handleCancelConfirm = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setConfirmingItemKey(null);
  };

  // Step 2: Confirm adding to cart (without force-pushing/opening the cart drawer)
  const handleConfirmAddToCart = (
    e: React.MouseEvent,
    product: ConciergeProduct,
    variant?: ConciergeVariant
  ) => {
    e.stopPropagation();
    e.preventDefault();

    const selectedVariant = variant || product.variants[0];
    const attrs = selectedVariant?.attributes || {};
    const itemKey = selectedVariant?.sku || product.id;

    addItem({
      id: selectedVariant?.id || product.id,
      sku: selectedVariant?.sku || product.slug,
      name: product.name,
      price: Number(selectedVariant?.price ?? product.basePrice),
      image: attrs.image || DEFAULT_IMAGE,
      specs: attrs.capacity || attrs.speed || attrs.formFactor || "Precision Spec",
      badges: [attrs.brand || attrs.categoryBadge || "Hardware"].filter(Boolean),
      watts: attrs.watts,
      weightKg: attrs.weightKg,
    });

    setConfirmingItemKey(null);
    setAddedIds((prev) => ({ ...prev, [itemKey]: true }));
    setTimeout(() => {
      setAddedIds((prev) => ({ ...prev, [itemKey]: false }));
    }, 3500);

    // Notice: We deliberately do NOT call openCart() here so the cart drawer
    // does not cover the chat window. The user gets an inline confirmation with a "View Cart" link.
  };

  const handleOpenProduct = (slug: string) => {
    if (!slug) return;
    router.push(`/products/${slug}`);
  };

  const executeSend = async (queryText: string) => {
    const trimmed = queryText.trim();
    if (!trimmed || isLoading) return;

    const userMessageId = `user-${Date.now()}`;
    const assistantMessageId = `assistant-${Date.now()}`;

    // Build chat history array to send to the backend
    const currentHistory = messages
      .filter((m) => m.text && m.text.trim())
      .map((m) => ({
        role: m.sender === "user" ? "user" : "assistant",
        content: m.text,
      }));

    setMessages((prev) => [
      ...prev,
      { id: userMessageId, sender: "user", text: trimmed },
      {
        id: assistantMessageId,
        sender: "assistant",
        text: "",
        products: [],
        isStreaming: true,
      },
    ]);

    setInputMessage("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai/concierge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: trimmed,
          history: currentHistory,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      if (!response.body) {
        throw new Error("No response body available");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split(/\n\n/);
        buffer = parts.pop() || "";

        for (const part of parts) {
          if (!part.trim()) continue;

          let eventType = "delta";
          let dataStr = "";

          const lines = part.split(/\n/);
          for (const line of lines) {
            if (line.startsWith("event:")) {
              eventType = line.replace(/^event:\s*/, "").trim();
            } else if (line.startsWith("data:")) {
              dataStr = line.replace(/^data:\s*/, "").trim();
            }
          }

          if (eventType === "metadata" && dataStr) {
            try {
              const meta = JSON.parse(dataStr);
              if (Array.isArray(meta.matchedProducts)) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessageId
                      ? { ...m, products: meta.matchedProducts }
                      : m
                  )
                );
              }
            } catch (err) {
              console.error("Failed to parse metadata event", err);
            }
          } else if (eventType === "delta" && dataStr) {
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.text) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessageId
                      ? { ...m, text: m.text + parsed.text }
                      : m
                  )
                );
              }
            } catch (err) {
              console.error("Failed to parse delta event", err);
            }
          } else if (eventType === "done") {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMessageId ? { ...m, isStreaming: false } : m
              )
            );
          }
        }
      }
    } catch (err) {
      console.error("Concierge query failed:", err);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessageId
            ? {
                ...m,
                text:
                  m.text ||
                  "Sorry, our lab hardware assistant encountered an error connecting to the inventory service. Please check your query or try again shortly.",
                isStreaming: false,
              }
            : m
        )
      );
    } finally {
      setIsLoading(false);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessageId ? { ...m, isStreaming: false } : m
        )
      );
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    executeSend(inputMessage);
  };

  return (
    <aside className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {isOpen && (
        <section
          aria-label="AI Hardware Concierge"
          className="w-[360px] sm:w-[500px] md:w-[560px] max-w-[calc(100vw-24px)] max-h-[85vh] bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden flex flex-col mb-3 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200"
        >
          {/* Header */}
          <header className="bg-surface-container-low border-b border-outline-variant px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary text-on-primary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[18px]">
                  memory
                </span>
              </div>
              <div className="flex flex-col">
                <span className="font-headline-sm text-sm text-on-surface font-bold leading-tight">
                  Hardware Concierge
                </span>
                <div className="flex items-center gap-1.5 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-label-sm text-[11px] text-on-surface-variant">
                    Live Lab Assistant
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Clear History Button */}
              <button
                onClick={handleClearHistory}
                className="text-on-surface-variant hover:text-error p-1.5 rounded hover:bg-surface-container transition-colors cursor-pointer"
                type="button"
                title="Clear conversation history"
                aria-label="Clear conversation history"
              >
                <span className="material-symbols-outlined text-[18px]">
                  delete_sweep
                </span>
              </button>

              {/* Close Button */}
              <button
                onClick={() => setIsOpen(false)}
                className="text-on-surface-variant hover:text-on-surface p-1.5 rounded hover:bg-surface-container transition-colors cursor-pointer"
                type="button"
                aria-label="Close Assistant"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
          </header>

          {/* Messages Scroll Area */}
          <div className="h-[380px] sm:h-[450px] p-4 space-y-4 overflow-y-auto bg-surface-container-lowest font-body-sm text-body-sm">
            {messages.map((msg, index) => {
              // Find the corresponding user prompt for this assistant message
              const userPrompt =
                msg.sender === "assistant" && index > 0
                  ? messages[index - 1]?.text || ""
                  : "";

              // Compute intelligently ordered recommendation cards matching the AI text
              const orderedItems =
                msg.sender === "assistant" && msg.products && msg.products.length > 0
                  ? getOrderedRecommendations(msg.products, msg.text, userPrompt)
                  : [];

              return (
                <div
                  key={msg.id}
                  className={
                    msg.sender === "user"
                      ? "bg-surface-container-low text-on-surface p-3 rounded-lg border border-outline-variant max-w-[85%] ml-auto"
                      : "bg-surface-container-lowest text-on-surface p-3.5 rounded-lg border border-outline-variant max-w-[100%] space-y-3"
                  }
                >
                  {/* Message Body */}
                  {msg.sender === "assistant" ? (
                    <MarkdownContent
                      content={msg.text}
                      isStreaming={msg.isStreaming}
                    />
                  ) : (
                    <div className="whitespace-pre-wrap leading-relaxed text-[13px] text-on-surface">
                      {msg.text}
                    </div>
                  )}

                  {/* Recommendation Cards */}
                  {orderedItems.length > 0 && (
                    <div className="space-y-2.5 pt-1">
                      <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-secondary font-bold">
                        <span className="material-symbols-outlined text-[14px]">
                          verified
                        </span>
                        <span>Verified Lab Recommendations</span>
                      </div>

                      <div className="space-y-2">
                        {orderedItems.map(({ product, variant }, rankIndex) => {
                          const attrs = variant?.attributes || {};
                          const price = variant?.price ?? Number(product.basePrice);
                          const itemKey = variant?.sku || product.id;
                          const isConfirming = confirmingItemKey === itemKey;
                          const isAdded = !!addedIds[itemKey];
                          const imageUrl = attrs.image || DEFAULT_IMAGE;

                          return (
                            <div
                              key={product.id}
                              onClick={() => handleOpenProduct(product.slug)}
                              className={`group bg-surface-container-low hover:bg-surface-container border ${
                                isConfirming
                                  ? "border-secondary ring-1 ring-secondary/30"
                                  : "border-outline-variant hover:border-secondary"
                              } rounded-lg p-2.5 flex flex-col gap-2 cursor-pointer transition-all duration-150 shadow-sm`}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleOpenProduct(product.slug);
                              }}
                              title={`View details for ${product.name}`}
                            >
                              {/* Main Card Content */}
                              <div className="flex items-center gap-3">
                                {/* Product Thumbnail */}
                                <div className="w-12 h-12 rounded border border-outline-variant bg-surface-container-lowest p-1 flex items-center justify-center shrink-0 overflow-hidden relative">
                                  <Image
                                    src={imageUrl}
                                    alt={product.name}
                                    width={44}
                                    height={44}
                                    className="object-contain w-full h-full"
                                    unoptimized
                                  />
                                </div>

                                {/* Product Info */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    {rankIndex === 0 && (
                                      <span className="text-[9px] font-mono font-bold bg-primary text-on-primary px-1.5 py-0.2 rounded uppercase">
                                        Top Pick
                                      </span>
                                    )}
                                    <div className="font-headline-sm text-xs text-on-surface font-semibold truncate group-hover:text-secondary transition-colors">
                                      {product.name}
                                    </div>
                                  </div>

                                  <div className="font-label-sm text-[11px] text-on-surface-variant truncate font-mono mt-0.5">
                                    {attrs.capacity ? `${attrs.capacity} • ` : ""}
                                    {attrs.speed ? `${attrs.speed} • ` : ""}
                                    {attrs.interface || variant?.sku || "Precision Spec"}
                                  </div>

                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="font-metric-tabular text-xs text-on-surface font-bold">
                                      ${price.toFixed(2)}
                                    </span>
                                    {variant?.stock !== undefined && (
                                      <span className="text-[10px] font-mono text-emerald-600 font-medium">
                                        {variant.stock > 0 ? "In Stock" : "Backorder"}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Add Action Button */}
                                {!isConfirming && (
                                  <button
                                    type="button"
                                    onClick={(e) => handleInitiateAdd(e, itemKey)}
                                    className={`shrink-0 flex items-center gap-1 font-mono text-[11px] uppercase font-bold px-2.5 py-1.5 rounded transition-all cursor-pointer ${
                                      isAdded
                                        ? "bg-emerald-600 text-white"
                                        : "bg-primary hover:bg-secondary text-on-primary"
                                    }`}
                                    title="Add to cart"
                                  >
                                    <span className="material-symbols-outlined text-[14px]">
                                      {isAdded ? "done" : "add_shopping_cart"}
                                    </span>
                                    <span>{isAdded ? "Added" : "Add"}</span>
                                  </button>
                                )}
                              </div>

                              {/* Inline Confirmation Card: Ask before putting into cart */}
                              {isConfirming && (
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  className="pt-2 border-t border-outline-variant/60 flex items-center justify-between gap-2 bg-surface-container-lowest p-2 rounded-md animate-in fade-in slide-in-from-top-1 duration-150"
                                >
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="material-symbols-outlined text-secondary text-[16px] shrink-0">
                                      help_outline
                                    </span>
                                    <span className="text-[11px] font-medium text-on-surface truncate">
                                      Add to cart for{" "}
                                      <span className="font-bold text-primary">
                                        ${price.toFixed(2)}
                                      </span>
                                      ?
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                      type="button"
                                      onClick={handleCancelConfirm}
                                      className="text-[10px] font-mono uppercase px-2 py-1 rounded border border-outline-variant hover:bg-surface-container-high text-on-surface cursor-pointer transition-colors"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) =>
                                        handleConfirmAddToCart(e, product, variant)
                                      }
                                      className="text-[10px] font-mono uppercase px-2.5 py-1 rounded bg-primary hover:bg-secondary text-on-primary font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                    >
                                      <span className="material-symbols-outlined text-[13px]">
                                        check
                                      </span>
                                      Confirm
                                    </button>
                                  </div>
                                </div>
                              )}

                              {/* Added Confirmation Banner with optional View Cart link */}
                              {isAdded && (
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  className="pt-1.5 border-t border-emerald-500/20 flex items-center justify-between text-[11px] font-mono text-emerald-600 animate-in fade-in duration-150"
                                >
                                  <div className="flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[14px]">
                                      check_circle
                                    </span>
                                    <span className="font-bold">Item added to cart</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openCart();
                                    }}
                                    className="underline text-secondary hover:text-primary cursor-pointer font-bold"
                                  >
                                    View Cart →
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Quick Suggestion Chips on initial load or empty query */}
            {messages.length === 1 && !isLoading && (
              <div className="pt-2">
                <p className="text-[11px] font-mono uppercase tracking-wider text-on-surface-variant mb-2">
                  Quick Prompts:
                </p>
                <div className="flex flex-col gap-1.5">
                  {SUGGESTED_QUERIES.map((query) => (
                    <button
                      key={query}
                      type="button"
                      onClick={() => executeSend(query)}
                      className="text-left text-xs bg-surface-container-low hover:bg-surface-container border border-outline-variant hover:border-outline text-on-surface px-3 py-2 rounded-md transition-colors cursor-pointer flex items-center justify-between group"
                    >
                      <span>{query}</span>
                      <span className="material-symbols-outlined text-[14px] text-on-surface-variant group-hover:text-secondary group-hover:translate-x-0.5 transition-transform">
                        arrow_forward
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <form
            onSubmit={handleSend}
            className="border-t border-outline-variant p-2.5 bg-surface-container-low flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              disabled={isLoading}
              onChange={(e) => setInputMessage(e.target.value)}
              className="flex-1 bg-surface-container-lowest border border-outline-variant px-3 py-2 text-on-surface font-body-sm text-xs rounded-lg placeholder:text-on-surface-variant focus:outline-none focus:border-secondary disabled:opacity-50"
              placeholder="Ask a question or request clarification..."
            />

            <button
              type="submit"
              disabled={!inputMessage.trim() || isLoading}
              className="w-8 h-8 bg-primary hover:bg-secondary disabled:opacity-40 text-on-primary flex items-center justify-center rounded-lg transition-colors cursor-pointer shrink-0"
              aria-label="Send query"
            >
              <span className="material-symbols-outlined text-[16px]">
                {isLoading ? "hourglass_empty" : "send"}
              </span>
            </button>
          </form>
        </section>
      )}

      {/* Floating Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle AI Hardware Assistant"
        className="w-12 h-12 bg-surface-container-lowest border border-outline-variant text-on-surface hover:text-secondary flex items-center justify-center rounded-full hover:bg-surface-container-low cursor-pointer transition-all shadow-md hover:shadow-lg hover:scale-105 active:scale-95"
      >
        <span className="material-symbols-outlined text-[24px]">
          {isOpen ? "close" : "smart_toy"}
        </span>
      </button>
    </aside>
  );
}
