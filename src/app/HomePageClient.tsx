"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AiAssistant } from "@/components/AiAssistant";
import { useCart } from "@/context/CartContext";

export interface SerializedCategory {
  id: string;
  code: string;
  title: string;
  models: string;
  tag: string;
  href: string;
}

export interface SerializedProduct {
  id: string;
  slug: string;
  categoryBadge: string;
  sku: string;
  name: string;
  specs: string;
  stockText: string;
  stockUnits: number;
  price: number;
  image: string;
  watts: number;
  weightKg: number;
}

interface HomePageClientProps {
  categories: SerializedCategory[];
  products: SerializedProduct[];
}

const TELEMETRY_NODES = [
  {
    code: "SYS-NODE-A409",
    formFactor: "2U Rackmount",
    targetVoltage: "1.250V Core",
    interfaceLane: "PCIe 5.0 x16",
    thermalDelta: "+18.4°C ΔT",
    burnInState: "PASS [48H]",
  },
  {
    code: "SYS-NODE-C812",
    formFactor: "Pedestal EATX",
    targetVoltage: "1.310V Core",
    interfaceLane: "PCIe 4.0 x16",
    thermalDelta: "+21.1°C ΔT",
    burnInState: "PASS [72H]",
  },
  {
    code: "MEM-ARRAY-M01",
    formFactor: "DIMM Bank 8x",
    targetVoltage: "1.100V VDD",
    interfaceLane: "DDR5-5600 JEDEC",
    thermalDelta: "+11.0°C ΔT",
    burnInState: "ZERO-MEMTEST",
  },
];

export function HomePageClient({ categories, products }: HomePageClientProps) {
  const cart = useCart();
  const [filterTab, setFilterTab] = useState<"all" | "instock" | "new">("all");
  const [addedItem, setAddedItem] = useState<string | null>(null);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (filterTab === "instock") return p.stockUnits > 0;
      if (filterTab === "new") return p.categoryBadge.includes("GEN 5") || p.categoryBadge.includes("NEW") || p.categoryBadge.includes("FLAGSHIP");
      return true;
    });
  }, [products, filterTab]);

  const handleAddToCart = (product: SerializedProduct) => {
    cart.addItem({
      id: product.id,
      sku: product.sku,
      name: product.name,
      price: product.price,
      image: product.image,
      specs: product.specs,
      badges: [product.categoryBadge],
      watts: product.watts,
      weightKg: product.weightKg,
    });
    setAddedItem(product.name);
    setTimeout(() => setAddedItem(null), 2000);
  };

  return (
    <div className="flex flex-col min-h-screen bg-surface">
      <Header />

      <main className="w-full pt-[60px] min-h-[calc(100vh-140px)] bg-surface">
        <div className="flex flex-col w-full">
          {/* System Status Bar */}
          <div className="max-w-[1600px] w-full mx-auto px-4 sm:px-8 py-8 flex flex-col">
            {/* SECTION 1: HERO SECTION */}
            <section className="bg-surface-container-low border border-outline-variant rounded-lg p-6 sm:p-8 mb-12 flex flex-col lg:flex-row items-center justify-between gap-10">
              {/* Left Column */}
              <div className="flex-1 min-w-0">
                <h1 className="font-display text-display text-on-surface font-semibold tracking-tight max-w-xl">
                  Precision Hardware for High-Compute Workloads.
                </h1>
                <p className="font-body-lg text-body-lg text-on-surface-variant mt-3 max-w-lg">
                  Enterprise and enthusiast components in stock with verified compatibility and direct laboratory testing.
                </p>
                <div className="flex flex-wrap items-center gap-3 mt-6">
                  <Link
                    href="/categories/storage"
                    className="bg-primary hover:bg-primary-container text-on-primary font-headline-sm text-headline-sm font-medium px-5 py-2.5 rounded transition-colors inline-flex items-center gap-2"
                  >
                    <span>Browse Catalog</span>
                    <span className="material-symbols-outlined text-[16px]">
                      arrow_forward
                    </span>
                  </Link>
                  <Link
                    href="/categories/cpus"
                    className="bg-surface-container-lowest border border-outline-variant hover:bg-surface-container-high text-on-surface font-headline-sm text-headline-sm font-medium px-5 py-2.5 rounded transition-colors inline-flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px] text-on-surface-variant">
                      terminal
                    </span>
                    <span>High-Compute Processors</span>
                  </Link>
                </div>
                <div className="font-label-sm text-label-sm text-on-surface-variant mt-8 pt-4 border-t border-outline-variant flex flex-wrap items-center gap-2 tracking-wider font-mono">
                  <span className="text-on-surface font-semibold">VERIFIED ECC SUPPORT</span>
                  <span>•</span>
                  <span className="text-on-surface font-semibold">
                    DIRECT DIE COOLING COMPATIBLE
                  </span>
                  <span>•</span>
                  <span className="text-on-surface font-semibold">GEN 5.0 READY</span>
                </div>
              </div>

              {/* Right Column: Specimen Preview */}
              <div className="shrink-0 flex items-center justify-center w-full sm:w-auto">
                <div className="bg-surface-container-lowest border border-outline-variant rounded p-3 w-full sm:w-[460px] h-[330px] flex flex-col justify-between">
                  <div className="flex items-center justify-between pb-2 border-b border-outline-variant font-label-sm text-label-sm text-on-surface-variant font-mono">
                    <span className="font-bold text-on-surface">SPECIMEN // MB-EATX-09</span>
                    <span>PRO-GRADE WORKSTATION MOUNT</span>
                  </div>
                  <div className="relative w-full h-[250px] flex items-center justify-center overflow-hidden bg-surface-container-lowest">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      alt="Studio product photography of a high-end workstation ATX motherboard"
                      className="w-full h-full object-contain p-1"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuAcuXZVWoKLK8WEZHedd8RNY2wh7CzEX3a-shH7dF3b4sOVyjShKp53ms6pS20ypbACfYKK7kdpRO-9bj2h75U43AzG9hxQBnaRIPNMg3_BhGeWHW_bhSpL-DeAf-JD1_NJacsRkiOoEvlJ1BothDOu0gROgz_YnmVXsnaaQp_ON6zKQXa0mVjpQlPg764IRt7PmNh9KTYCCfm4Es0v_AAWb1-mz4x4IKuGP08KW5BGqb0zdubBbXIU"
                    />
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-outline-variant font-label-sm text-label-sm text-on-surface-variant font-mono">
                    <span>SOCKET sTR5 // 8x DDR5 RDIMM</span>
                    <span className="text-on-surface font-semibold text-secondary">
                      THERMAL PASS: 100%
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* SECTION 2: CATEGORY GRID */}
            <section className="mb-12">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-4 pb-3 border-b border-outline-variant gap-2">
                <div>
                  <h2 className="font-headline-lg text-headline-lg text-on-surface font-semibold tracking-tight">
                    Component Categories
                  </h2>
                  <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">
                    Validated hardware categories synchronized with inventory database
                  </p>
                </div>
                <div className="font-label-sm text-label-sm text-on-surface-variant uppercase font-mono">
                  CATEGORIES LOADED: {categories.length}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {categories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={cat.href}
                    className="group bg-surface-container-lowest border border-outline-variant hover:border-primary transition-colors p-5 rounded flex flex-col justify-between h-32 cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-label-sm text-label-sm text-on-surface-variant block mb-1 font-mono">
                          {cat.code}
                        </span>
                        <span className="font-headline-md text-headline-md text-on-surface group-hover:text-secondary transition-colors">
                          {cat.title}
                        </span>
                      </div>
                      <span className="material-symbols-outlined text-on-surface-variant group-hover:translate-x-0.5 group-hover:text-primary transition-transform text-[20px]">
                        arrow_right_alt
                      </span>
                    </div>
                    <div className="font-body-sm text-body-sm text-on-surface-variant flex items-center justify-between border-t border-surface-container pt-2">
                      <span>{cat.models}</span>
                      <span className="font-label-sm text-label-sm text-on-surface font-semibold font-mono">
                        {cat.tag}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            {/* SECTION 3: FEATURED PRODUCTS GRID */}
            <section className="mb-16">
              <div className="flex flex-col md:flex-row md:items-center justify-between pb-3 border-b border-outline-variant gap-4 mb-6">
                <div>
                  <h2 className="font-headline-lg text-headline-lg text-on-surface font-semibold tracking-tight">
                    Featured Inventory
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                    <span className="font-label-sm text-label-sm text-on-surface-variant uppercase font-mono">
                      Synchronized with PostgreSQL ({products.length} catalog items)
                    </span>
                  </div>
                </div>

                {/* Inventory filter tabs */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="inline-flex bg-surface-container-lowest border border-outline-variant rounded p-0.5">
                    <button
                      type="button"
                      onClick={() => setFilterTab("all")}
                      className={`px-3 py-1 font-label-sm text-label-sm rounded uppercase font-medium font-mono transition-colors ${
                        filterTab === "all"
                          ? "bg-primary text-on-primary"
                          : "text-on-surface hover:bg-surface-container-high"
                      }`}
                    >
                      All ({products.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterTab("instock")}
                      className={`px-3 py-1 font-label-sm text-label-sm rounded uppercase font-medium font-mono transition-colors ${
                        filterTab === "instock"
                          ? "bg-primary text-on-primary"
                          : "text-on-surface hover:bg-surface-container-high"
                      }`}
                    >
                      In Stock Only
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterTab("new")}
                      className={`px-3 py-1 font-label-sm text-label-sm rounded uppercase font-medium font-mono transition-colors ${
                        filterTab === "new"
                          ? "bg-primary text-on-primary"
                          : "text-on-surface hover:bg-surface-container-high"
                      }`}
                    >
                      Flagship & Gen 5
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {filteredProducts.map((product) => (
                  <article
                    key={product.id}
                    className="bg-surface-container-lowest border border-outline-variant rounded hover:border-outline transition-colors p-4 flex flex-col justify-between"
                  >
                    <div>
                      {/* Image Area */}
                      <Link
                        href={`/products/${product.slug}`}
                        className="w-full h-52 bg-surface-container-lowest border border-outline-variant rounded p-3 mb-3 flex items-center justify-center relative block group"
                      >
                        <span className="absolute top-2 left-2 font-label-sm text-[10px] bg-surface-container-low px-1.5 py-0.5 border border-outline-variant text-on-surface-variant uppercase font-mono">
                          {product.categoryBadge}
                        </span>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          alt={product.name}
                          className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-200"
                          src={product.image}
                        />
                      </Link>
                      {/* SKU */}
                      <div className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1 font-mono">
                        {product.sku}
                      </div>
                      {/* Name */}
                      <Link
                        href={`/products/${product.slug}`}
                        className="font-headline-sm text-headline-sm text-on-surface font-semibold leading-tight line-clamp-1 hover:text-secondary transition-colors block"
                      >
                        {product.name}
                      </Link>
                      {/* Specs Box */}
                      <div className="font-label-sm text-[11px] text-on-surface-variant bg-surface-container-low p-2 rounded border border-outline-variant mt-2.5 leading-relaxed font-mono line-clamp-2">
                        {product.specs}
                      </div>
                      {/* Stock Status */}
                      <div className="flex items-center gap-1.5 mt-3 font-mono">
                        <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                        <span className="font-label-sm text-label-sm text-on-surface-variant">
                          {product.stockText}
                        </span>
                      </div>
                    </div>
                    {/* Footer Action */}
                    <div className="flex items-center justify-between pt-4 mt-4 border-t border-outline-variant">
                      <div>
                        <span className="font-label-sm text-[10px] text-on-surface-variant uppercase block font-mono">
                          NET PRICE
                        </span>
                        <span className="font-metric-tabular text-metric-tabular text-on-surface font-bold text-base">
                          ${product.price.toFixed(2)}
                        </span>
                      </div>
                      <button
                        onClick={() => handleAddToCart(product)}
                        className="bg-primary hover:bg-primary-container text-on-primary font-headline-sm text-xs font-medium px-4 py-2 rounded transition-colors inline-flex items-center gap-1 cursor-pointer font-mono"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[15px]">add</span>
                        <span>Add</span>
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            {/* SECTION 4: ARCHITECTURE & TECHNICAL TRUST BAR */}
            <section className="mb-12">
              <div className="bg-surface-container-low border border-outline-variant rounded p-6 grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-outline-variant">
                <div className="pb-6 md:pb-0 md:pr-6 flex flex-col justify-start">
                  <div className="flex items-center gap-2 mb-2 font-mono">
                    <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">
                      01 // PROTOCOL
                    </span>
                  </div>
                  <h4 className="font-headline-sm text-headline-sm text-on-surface font-semibold mb-2">
                    Individual Hardware Verification
                  </h4>
                  <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                    All components tested on open test benches prior to catalog
                    classification. Full trace capture on voltage rails and clock jitter
                    tolerances.
                  </p>
                  <div className="font-label-sm text-[11px] text-on-surface font-mono mt-4 pt-3 border-t border-outline-variant flex items-center gap-2">
                    <span className="material-symbols-outlined text-[14px] text-secondary">
                      verified
                    </span>
                    <span>OSCILLOSCOPE VALIDATED</span>
                  </div>
                </div>

                <div className="py-6 md:py-0 md:px-6 flex flex-col justify-start">
                  <div className="flex items-center gap-2 mb-2 font-mono">
                    <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">
                      02 // TRANSPARENCY
                    </span>
                  </div>
                  <h4 className="font-headline-sm text-headline-sm text-on-surface font-semibold mb-2">
                    Exact Spec Guarantee
                  </h4>
                  <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                    Monospace timing sheets, NAND manufacturer disclosures, and controller
                    revisions stated upfront. No silent hardware revision substitutions.
                  </p>
                  <div className="font-label-sm text-[11px] text-on-surface font-mono mt-4 pt-3 border-t border-outline-variant flex items-center gap-2">
                    <span className="material-symbols-outlined text-[14px] text-secondary">
                      memory
                    </span>
                    <span>BOM LOCK COMMITMENT</span>
                  </div>
                </div>

                <div className="pt-6 md:pt-0 md:pl-6 flex flex-col justify-start">
                  <div className="flex items-center gap-2 mb-2 font-mono">
                    <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">
                      03 // FULFILLMENT
                    </span>
                  </div>
                  <h4 className="font-headline-sm text-headline-sm text-on-surface font-semibold mb-2">
                    Enterprise Logistics
                  </h4>
                  <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                    Anti-static hermetic packaging, climate-controlled storage, and insured
                    expedited freight. Serial-tracked pallets for institutional manifests.
                  </p>
                  <div className="font-label-sm text-[11px] text-on-surface font-mono mt-4 pt-3 border-t border-outline-variant flex items-center gap-2">
                    <span className="material-symbols-outlined text-[14px] text-secondary">
                      inventory_2
                    </span>
                    <span>ESD CLASS 0 CERTIFIED</span>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>

      <AiAssistant />
      <Footer />
    </div>
  );
}
