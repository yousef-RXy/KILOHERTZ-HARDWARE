"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useCart } from "@/context/CartContext";
import { createClient } from "@/lib/supabase/client";

const CATEGORY_TABS = [
  { name: "CPUs", href: "/categories/cpus" },
  { name: "GPUs", href: "/categories/gpus" },
  { name: "Storage", href: "/categories/storage" },
  { name: "Displays", href: "/categories/displays" },
  { name: "Peripherals", href: "/categories/peripherals" },
];

const DEFAULT_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuD_EzyUfWjECBXOZXFDPjuDg5RJxAVsOB5aUVhjTnyaIwJRaT-Gc71mDvQroT3ma47k7tbaZwY4fBt3_C2fdnVQxiDFHuTnzMhDWfEwh3hBMzPjgt13uocgGk6Tk9ZhJwnblS7KK7u-hePgpCD5jNOkYXCvkAucmM5TA-VKCUblvRAF9qA_XP0MV6pwAb68vYOi8_Khcf-SGxPTwKXWK80-9UpVtJUjOnq2XgiW-GAIsvXqou0btdHi";

export interface SearchProductItem {
  id: string;
  name: string;
  slug: string;
  basePrice: number;
  description: string;
  similarity: number;
  rrfScore: number;
  variants: Array<{
    id: string;
    sku: string;
    stock: number;
    priceOverride: number | null;
    attributes?: Record<string, any>;
  }>;
}

interface HeaderProps {
  cartCount?: number;
  onCartClick?: () => void;
  minimal?: boolean;
}

export function Header({ cartCount, onCartClick, minimal = false }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchProductItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const cart = useCart();
  const displayCount =
    cartCount !== undefined ? cartCount : cart.isHydrated ? cart.itemCount : 0;
  const handleCartTrigger = onCartClick || cart.openCart;

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Authentication status check
  useEffect(() => {
    try {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data }) => {
        setUserEmail(data.user?.email || null);
      });
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        setUserEmail(session?.user?.email || null);
      });
      return () => subscription.unsubscribe();
    } catch {
      // Fallback gracefully if Supabase environment variables not yet populated
    }
  }, []);

  // Global Ctrl+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced API search calling /api/search?q=...
  useEffect(() => {
    const query = searchQuery.trim();
    if (!query) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setSelectedIndex(-1);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error("Search failed");
        const data = await res.json();
        setSearchResults(data.results || []);
        setIsSearchOpen(true);
      } catch (err) {
        console.error("Hardware search error:", err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 220);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectProduct = (slug: string) => {
    setIsSearchOpen(false);
    setSearchQuery("");
    router.push(`/products/${slug}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isSearchOpen && searchResults.length > 0) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setIsSearchOpen(true);
        return;
      }
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < searchResults.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev > 0 ? prev - 1 : searchResults.length - 1
      );
    } else if (e.key === "Enter") {
      if (selectedIndex >= 0 && searchResults[selectedIndex]) {
        e.preventDefault();
        handleSelectProduct(searchResults[selectedIndex].slug);
      }
    } else if (e.key === "Escape") {
      setIsSearchOpen(false);
      searchInputRef.current?.blur();
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-surface-container-lowest/95 backdrop-blur-sm border-b border-outline-variant">
      <div className="h-[60px] max-w-[1600px] mx-auto px-4 sm:px-8 flex items-center justify-between gap-6">
        {/* Left Branding */}
        <div className="flex items-center gap-4 shrink-0">
          <Link href="/" className="flex items-center gap-3 group">
            <span className="font-label-md text-label-md tracking-wider uppercase text-primary font-bold group-hover:text-secondary transition-colors">
              KILOHERTZ // HARDWARE
            </span>
          </Link>
          {!minimal && (
            <div className="hidden xl:flex items-center gap-1.5 px-2 py-0.5 border border-outline-variant bg-surface-container-low rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
              <span className="font-label-sm text-label-sm uppercase text-on-surface-variant font-mono">
                STATION ONLINE
              </span>
            </div>
          )}
        </div>

        {/* Center Navigation */}
        {!minimal && (
          <nav className="hidden lg:flex items-center gap-8">
            {CATEGORY_TABS.map((tab) => {
              const isActive =
                pathname === tab.href || pathname.startsWith(tab.href + "/");
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`font-body-md text-body-md py-4 transition-colors border-b-2 ${
                    isActive
                      ? "text-primary font-semibold border-primary"
                      : "text-on-surface-variant hover:text-on-surface border-transparent"
                  }`}
                >
                  {tab.name}
                </Link>
              );
            })}
          </nav>
        )}

        {/* Right Search & Controls */}
        <div className="flex items-center gap-4 shrink-0">
          {!minimal && (
            <div ref={searchContainerRef} className="relative flex items-center">
              {/* Search Input Box */}
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-2.5 text-on-surface-variant text-[18px] pointer-events-none">
                  search
                </span>

                <input
                  ref={searchInputRef}
                  id="catalog-search-input"
                  type="text"
                  value={searchQuery}
                  onFocus={() => {
                    if (searchQuery.trim().length > 0) setIsSearchOpen(true);
                  }}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (!isSearchOpen) setIsSearchOpen(true);
                  }}
                  onKeyDown={handleKeyDown}
                  className="w-56 sm:w-72 pl-8 pr-16 py-1.5 bg-surface-container-lowest border border-outline-variant text-on-surface font-body-sm text-xs sm:text-sm rounded-lg placeholder:text-on-surface-variant focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
                  placeholder="Search hardware..."
                  autoComplete="off"
                />

                {/* Right Indicator: Loading Spinner, Clear Button, or Ctrl+K */}
                <div className="absolute right-2 flex items-center gap-1">
                  {isSearching ? (
                    <span className="w-3.5 h-3.5 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
                  ) : searchQuery ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        setSearchResults([]);
                        setIsSearchOpen(false);
                      }}
                      className="text-on-surface-variant hover:text-on-surface p-0.5 rounded cursor-pointer"
                      title="Clear search"
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        close
                      </span>
                    </button>
                  ) : (
                    <span className="hidden sm:inline-block bg-surface-container-low border border-outline-variant text-[10px] font-label-sm px-1.5 py-0.5 rounded text-on-surface-variant select-none font-mono">
                      Ctrl+K
                    </span>
                  )}
                </div>
              </div>

              {/* Hybrid Search Results Dropdown */}
              {isSearchOpen && searchQuery.trim().length > 0 && (
                <div className="absolute top-full right-0 mt-2 w-[340px] sm:w-[480px] bg-surface-container-lowest border border-outline-variant rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  {/* Dropdown Header */}
                  <div className="px-3.5 py-2.5 bg-surface-container-low border-b border-outline-variant flex items-center justify-between">
                    <span className="font-mono text-[11px] uppercase text-on-surface-variant font-bold tracking-wider">
                      {isSearching
                        ? "Scanning catalog..."
                        : `Matching Hardware (${searchResults.length})`}
                    </span>

                  </div>

                  {/* Results List */}
                  <div className="max-h-[380px] overflow-y-auto divide-y divide-outline-variant/40">
                    {searchResults.length > 0 ? (
                      searchResults.map((product, idx) => {
                        const variant = product.variants[0];
                        const attrs = variant?.attributes || {};
                        const price =
                          variant?.priceOverride ?? product.basePrice;
                        const imageUrl = attrs.image || DEFAULT_IMAGE;
                        const isSelected = selectedIndex === idx;

                        return (
                          <div
                            key={product.id}
                            onClick={() => handleSelectProduct(product.slug)}
                            onMouseEnter={() => setSelectedIndex(idx)}
                            className={`p-3 flex items-center gap-3 cursor-pointer transition-colors ${
                              isSelected
                                ? "bg-surface-container-high"
                                : "hover:bg-surface-container-low"
                            }`}
                          >
                            {/* Thumbnail */}
                            <div className="w-11 h-11 rounded border border-outline-variant bg-surface-container-lowest p-1 flex items-center justify-center shrink-0 overflow-hidden relative">
                              <Image
                                src={imageUrl}
                                alt={product.name}
                                width={40}
                                height={40}
                                className="object-contain w-full h-full"
                                unoptimized
                              />
                            </div>

                            {/* Product Info */}
                            <div className="flex-1 min-w-0">
                              <div className="font-headline-sm text-xs font-semibold text-on-surface truncate">
                                {product.name}
                              </div>

                              <div className="font-label-sm text-[11px] text-on-surface-variant truncate font-mono mt-0.5">
                                {attrs.capacity ? `${attrs.capacity} • ` : ""}
                                {attrs.speed ? `${attrs.speed} • ` : ""}
                                {attrs.interface || variant?.sku || "Precision Spec"}
                              </div>

                              <div className="flex items-center gap-2 mt-1">
                                <span className="font-metric-tabular text-xs font-bold text-on-surface">
                                  ${Number(price).toFixed(2)}
                                </span>
                                {variant?.stock !== undefined && (
                                  <span className="text-[10px] font-mono text-emerald-600 font-medium">
                                    {variant.stock > 0 ? "In Stock" : "Backorder"}
                                  </span>
                                )}
                              </div>
                            </div>

                            <span className="material-symbols-outlined text-[16px] text-on-surface-variant shrink-0">
                              arrow_forward
                            </span>
                          </div>
                        );
                      })
                    ) : !isSearching ? (
                      <div className="p-6 text-center text-on-surface-variant font-body-sm text-xs space-y-1">
                        <span className="material-symbols-outlined text-2xl text-outline mb-1">
                          search_off
                        </span>
                        <p className="font-semibold text-on-surface">
                          No hardware matched &ldquo;{searchQuery}&rdquo;
                        </p>
                        <p className="text-[11px]">
                          Try searching for NVMe, 2TB, PCIe 5.0, AM5, or RTX.
                        </p>
                      </div>
                    ) : null}
                  </div>

                  {/* Dropdown Footer Navigation Hint */}
                  <div className="px-3.5 py-1.5 bg-surface-container-low border-t border-outline-variant text-[10px] font-mono text-on-surface-variant flex items-center justify-between select-none">
                    <span>↑↓ navigate • Enter select</span>
                    <span>Esc to close</span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div
            className={`flex items-center gap-3 ${
              !minimal ? "pl-2 border-l border-outline-variant" : ""
            }`}
          >
            <button
              type="button"
              onClick={handleCartTrigger}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-surface-container-lowest border border-outline-variant hover:bg-surface-container-low rounded text-on-surface transition-colors cursor-pointer"
              title="Shopping Cart"
            >
              <span className="material-symbols-outlined text-[18px]">
                shopping_bag
              </span>
              <span className="font-label-sm text-label-sm bg-primary text-on-primary px-1.5 py-0.2 rounded font-bold font-mono">
                {displayCount}
              </span>
            </button>

            {userEmail ? (
              <Link
                href="/account"
                className="relative w-8 h-8 rounded-full bg-primary hover:bg-primary-container flex items-center justify-center transition-colors"
                title={`Your Account (${userEmail})`}
              >
                <span className="material-symbols-outlined text-on-primary text-[18px]">
                  person
                </span>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-secondary border-2 border-surface-container-lowest rounded-full" />
              </Link>
            ) : (
              <Link
                href="/login"
                className="h-8 px-3 bg-surface-container-low border border-outline-variant hover:bg-primary hover:text-on-primary hover:border-primary text-on-surface flex items-center gap-1.5 rounded transition-all text-xs font-medium"
                title="Sign In"
              >
                <span className="material-symbols-outlined text-[16px]">
                  login
                </span>
                <span className="hidden sm:inline font-semibold">
                  Sign In
                </span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
