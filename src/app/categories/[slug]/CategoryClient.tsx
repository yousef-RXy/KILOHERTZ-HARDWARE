"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useMemo } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AiAssistant } from "@/components/AiAssistant";
import { useCart } from "@/context/CartContext";

export interface CategoryProduct {
  id: string;
  slug: string;
  sku: string;
  categoryBadge: string;
  brand: string;
  name: string;
  specs: string;
  interface: string;
  formFactor: string;
  nandType: string;
  stockUnits: number;
  price: number;
  watts: number;
  weightKg: number;
  image: string;
}

export interface CategoryMeta {
  title: string;
  breadcrumb: string;
  subtitle: string;
  qualifiedFormFactors: string;
  benchmarkStd: string;
}

interface CategoryClientProps {
  categoryMeta: CategoryMeta;
  products: CategoryProduct[];
  categorySlug: string;
}

export function CategoryClient({
  categoryMeta,
  products,
  categorySlug,
}: CategoryClientProps) {
  const cart = useCart();

  // Filter States
  const [inStockOnly, setInStockOnly] = useState(false);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState("0");
  const [maxPrice, setMaxPrice] = useState("10000");
  const [appliedPriceRange, setAppliedPriceRange] = useState<[number, number]>([
    0, 10000,
  ]);
  const [sortOption, setSortOption] = useState<string>("throughput");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        if (inStockOnly && p.stockUnits <= 0) return false;
        if (p.price < appliedPriceRange[0] || p.price > appliedPriceRange[1])
          return false;
        if (selectedBrands.length > 0 && !selectedBrands.includes(p.brand))
          return false;
        return true;
      })
      .sort((a, b) => {
        if (sortOption === "price-low") return a.price - b.price;
        if (sortOption === "price-high") return b.price - a.price;
        return b.price - a.price; // default: high throughput/spec
      });
  }, [products, inStockOnly, appliedPriceRange, selectedBrands, sortOption]);

  const brands = Array.from(new Set(products.map((p) => p.brand))).filter(Boolean);

  const handleBrandToggle = (brand: string) => {
    setSelectedBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
    );
  };

  const handleApplyPrice = () => {
    const min = parseFloat(minPrice) || 0;
    const max = parseFloat(maxPrice) || 99999;
    setAppliedPriceRange([min, max]);
  };

  const handleAddToCart = (product: CategoryProduct) => {
    cart.addItem({
      id: product.id,
      sku: product.sku,
      name: product.name,
      price: product.price,
      image: product.image,
      specs: product.specs,
      badges: [product.categoryBadge, product.formFactor],
      watts: product.watts,
      weightKg: product.weightKg,
    });
  };

  return (
    <div className="flex flex-col min-h-screen bg-surface">
      <Header />

      <main className="w-full pt-[60px] min-h-[calc(100vh-140px)] bg-surface">
        <div className="flex flex-col w-full">
          {/* Top Spec & Telemetry Category Header */}
          <section className="w-full bg-surface-container-lowest border-b border-outline-variant">
            <div className="max-w-[1600px] mx-auto px-4 sm:px-8 py-6">
              {/* Breadcrumb + Node Telemetry */}
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4 font-mono">
                <nav
                  aria-label="Breadcrumbs"
                  className="flex items-center gap-2 font-label-sm text-label-sm tracking-wider uppercase text-on-surface-variant"
                >
                  <Link href="/" className="hover:text-primary transition-colors">
                    CATALOG
                  </Link>
                  <span className="text-outline-variant">/</span>
                  <span className="text-primary font-semibold">
                    {categoryMeta.breadcrumb}
                  </span>
                </nav>
              </div>

              {/* Main Category Heading */}
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pt-1">
                <div>
                  <h1 className="font-headline-lg text-headline-lg text-on-surface uppercase tracking-tight">
                    {categoryMeta.title}
                  </h1>
                  <p className="font-body-md text-body-md text-on-surface-variant mt-1.5 max-w-3xl leading-relaxed">
                    {categoryMeta.subtitle}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 shrink-0 pb-1 font-mono">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-surface border border-outline-variant rounded font-label-sm text-label-sm text-on-surface">
                    <span className="text-on-surface-variant uppercase">
                      QUALIFIED FORM FACTORS:
                    </span>
                    <span className="font-bold">
                      {categoryMeta.qualifiedFormFactors}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Two Column Layout: Filter Sidebar (Left) & Results (Right) */}
          <section className="max-w-[1600px] mx-auto w-full px-4 sm:px-8 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Filter Sidebar */}
              <aside className="lg:col-span-3 w-full bg-surface-container-lowest border border-outline-variant rounded-md p-5 space-y-6">
                <div className="flex items-center justify-between border-b border-outline-variant pb-3 font-mono">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[18px]">
                      filter_list
                    </span>
                    <span className="font-label-md text-label-md uppercase font-semibold text-primary">
                      FILTER MATRIX
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setInStockOnly(false);
                      setSelectedBrands([]);
                      setMinPrice("0");
                      setMaxPrice("10000");
                      setAppliedPriceRange([0, 10000]);
                    }}
                    className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-colors underline uppercase cursor-pointer"
                    type="button"
                  >
                    RESET
                  </button>
                </div>

                {/* Filter Group: Availability */}
                <div className="space-y-2.5">
                  <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-bold block font-mono">
                    AVAILABILITY
                  </span>
                  <label className="flex items-center justify-between text-on-surface cursor-pointer group">
                    <div className="flex items-center gap-2.5">
                      <input
                        checked={inStockOnly}
                        onChange={(e) => setInStockOnly(e.target.checked)}
                        className="w-4 h-4 rounded-none accent-primary cursor-pointer"
                        type="checkbox"
                      />
                      <span className="font-body-md text-body-md text-on-surface">
                        In-Stock Only
                      </span>
                    </div>
                    <span className="font-label-sm text-label-sm text-on-surface-variant px-1.5 py-0.2 bg-surface-container-low border border-outline-variant rounded font-mono">
                      {products.filter((p) => p.stockUnits > 0).length}
                    </span>
                  </label>
                </div>

                {/* Filter Group: Price Range */}
                <div className="border-t border-outline-variant pt-4 space-y-2.5">
                  <div className="flex items-center justify-between font-mono">
                    <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-bold">
                      PRICE BRACKET ($ USD)
                    </span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">
                      APPLY
                    </span>
                  </div>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleApplyPrice();
                    }}
                    className="flex items-center gap-2 font-mono"
                  >
                    <div className="flex-1 relative">
                      <span className="absolute left-2 top-1.5 font-label-sm text-label-sm text-on-surface-variant">
                        $
                      </span>
                      <input
                        className="w-full pl-5 pr-2 py-1.5 bg-surface-container-low border border-outline-variant rounded font-label-md text-label-md text-on-surface focus:outline-none focus:border-secondary"
                        type="number"
                        value={minPrice}
                        onChange={(e) => setMinPrice(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleApplyPrice();
                          }
                        }}
                      />
                    </div>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">
                      —
                    </span>
                    <div className="flex-1 relative">
                      <span className="absolute left-2 top-1.5 font-label-sm text-label-sm text-on-surface-variant">
                        $
                      </span>
                      <input
                        className="w-full pl-5 pr-2 py-1.5 bg-surface-container-low border border-outline-variant rounded font-label-md text-label-md text-on-surface focus:outline-none focus:border-secondary"
                        type="number"
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleApplyPrice();
                          }
                        }}
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-primary text-on-primary font-label-sm text-label-sm uppercase rounded hover:bg-primary-container transition-colors cursor-pointer"
                    >
                      SET
                    </button>
                  </form>
                </div>

                {/* Filter Group: Brand Checklist */}
                {brands.length > 0 && (
                  <div className="border-t border-outline-variant pt-4 space-y-2.5">
                    <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-bold block font-mono">
                      MANUFACTURER / FAB
                    </span>
                    <div className="space-y-1.5">
                      {brands.map((brand) => (
                        <label
                          key={brand}
                          className="flex items-center justify-between text-on-surface cursor-pointer group"
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              checked={selectedBrands.includes(brand)}
                              onChange={() => handleBrandToggle(brand)}
                              className="w-4 h-4 rounded-none accent-primary cursor-pointer"
                              type="checkbox"
                            />
                            <span className="font-body-md text-body-md text-on-surface">
                              {brand}
                            </span>
                          </div>
                          <span className="font-label-sm text-label-sm text-on-surface-variant px-1.5 py-0.2 bg-surface-container-low border border-outline-variant rounded font-mono">
                            {products.filter((p) => p.brand === brand).length}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </aside>

              {/* Right Results Grid */}
              <div className="lg:col-span-9 space-y-6">
                {/* Results Toolbar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-outline-variant gap-4">
                  <div className="flex items-center gap-3 font-mono">
                    <span className="font-label-md text-label-md font-bold text-on-surface">
                      INDEXED SPECIMENS:
                    </span>
                    <span className="font-label-sm text-label-sm px-2 py-0.5 bg-surface-container-low border border-outline-variant rounded text-primary font-semibold">
                      {filteredProducts.length} OF {products.length} ACTIVE
                    </span>
                  </div>

                  <div className="flex items-center gap-3 font-mono">
                    <div className="flex items-center border border-outline-variant rounded bg-surface-container-lowest p-0.5">
                      <button
                        onClick={() => setViewMode("grid")}
                        className={`p-1.5 rounded transition-colors ${
                          viewMode === "grid"
                            ? "bg-primary text-on-primary"
                            : "text-on-surface-variant hover:text-on-surface"
                        }`}
                        title="Grid View"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          grid_view
                        </span>
                      </button>
                      <button
                        onClick={() => setViewMode("table")}
                        className={`p-1.5 rounded transition-colors ${
                          viewMode === "table"
                            ? "bg-primary text-on-primary"
                            : "text-on-surface-variant hover:text-on-surface"
                        }`}
                        title="Tabular Matrix View"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          table_rows
                        </span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2 bg-surface-container-lowest border border-outline-variant px-3 py-1.5 rounded">
                      <span className="material-symbols-outlined text-on-surface-variant text-[16px]">
                        sort
                      </span>
                      <select
                        value={sortOption}
                        onChange={(e) => setSortOption(e.target.value)}
                        className="bg-transparent font-label-sm text-label-sm uppercase text-on-surface outline-none cursor-pointer"
                      >
                        <option value="throughput">Sort: Highest Throughput</option>
                        <option value="price-low">Price: Low to High</option>
                        <option value="price-high">Price: High to Low</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Grid View */}
                {viewMode === "grid" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredProducts.map((product) => (
                      <article
                        key={product.id}
                        className="bg-surface-container-lowest border border-outline-variant rounded hover:border-outline transition-colors p-4 flex flex-col justify-between"
                      >
                        <div>
                          {/* Image Box */}
                          <Link
                            href={`/products/${product.slug}`}
                            className="w-full h-52 bg-surface-container-lowest border border-outline-variant rounded p-3 mb-3 flex items-center justify-center relative group block overflow-hidden"
                          >
                            <span className="absolute top-2 left-2 z-10 font-label-sm text-[10px] bg-surface-container-low px-1.5 py-0.5 border border-outline-variant text-on-surface-variant uppercase font-mono">
                              {product.categoryBadge}
                            </span>
                            <Image
                              alt={product.name}
                              className="object-contain p-3 group-hover:scale-105 transition-transform duration-200"
                              src={product.image}
                              fill
                              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                            />
                          </Link>

                          {/* SKU */}
                          <div className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1 font-mono">
                            {product.sku}
                          </div>

                          {/* Title */}
                          <Link
                            href={`/products/${product.slug}`}
                            className="font-headline-sm text-headline-sm text-on-surface font-semibold leading-tight line-clamp-2 hover:text-secondary transition-colors"
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
                              In Stock ({product.stockUnits} units)
                            </span>
                          </div>
                        </div>

                        {/* Card Footer */}
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
                            <span className="material-symbols-outlined text-[15px]">
                              add
                            </span>
                            <span>Add</span>
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  /* Table View */
                  <div className="bg-surface-container-lowest border border-outline-variant rounded overflow-x-auto">
                    <table className="w-full text-left font-body-sm text-body-sm">
                      <thead>
                        <tr className="border-b border-outline-variant bg-surface-container-low font-label-sm text-label-sm text-on-surface uppercase font-mono">
                          <th className="py-2.5 px-4">Component / SKU</th>
                          <th className="py-2.5 px-3">Form Factor</th>
                          <th className="py-2.5 px-3">Interface</th>
                          <th className="py-2.5 px-3">Stock Units</th>
                          <th className="py-2.5 px-3 text-right">Net Price</th>
                          <th className="py-2.5 px-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-container font-mono text-xs">
                        {filteredProducts.map((p) => (
                          <tr key={p.id} className="hover:bg-surface-container-low/50">
                            <td className="py-3 px-4">
                              <Link
                                href={`/products/${p.slug}`}
                                className="font-semibold text-on-surface hover:text-secondary transition-colors block font-headline-sm text-xs"
                              >
                                {p.name}
                              </Link>
                              <span className="text-on-surface-variant text-[11px]">
                                {p.sku}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-on-surface-variant">
                              {p.formFactor}
                            </td>
                            <td className="py-3 px-3 text-on-surface-variant">
                              {p.interface}
                            </td>
                            <td className="py-3 px-3 text-on-surface">
                              <span className="inline-flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                                {p.stockUnits} units
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right font-metric-tabular text-sm font-bold text-on-surface">
                              ${p.price.toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => handleAddToCart(p)}
                                className="bg-primary hover:bg-primary-container text-on-primary px-3 py-1.5 rounded text-xs uppercase font-mono transition-colors"
                              >
                                Add
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>

      <AiAssistant />
      <Footer />
    </div>
  );
}
