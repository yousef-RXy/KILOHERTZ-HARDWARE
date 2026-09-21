"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AiAssistant } from "@/components/AiAssistant";
import { useCart } from "@/context/CartContext";

export interface SerializedVariant {
  id: string;
  sku: string;
  label: string;
  price: number;
  stock: number;
  attributes: Record<string, any>;
}

export interface SerializedProductDetail {
  id: string;
  name: string;
  slug: string;
  description: string;
  categoryName: string;
  categorySlug: string;
  basePrice: number;
  variants: SerializedVariant[];
  defaultImage: string;
}

interface ProductDetailClientProps {
  product: SerializedProductDetail;
}

const DEFAULT_ANGLES = [
  {
    id: 0,
    label: "01",
    readout: "01 / 04",
    alt: "Top view with heatsink",
  },
  {
    id: 1,
    label: "02",
    readout: "02 / 04",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAASwbQjojVduaowfWCuGwMAi6Eh5pqUOpAVsJ70lZNI0wIQKLGwpbh8YHsibcw4pBLPIJZBzMqhnGCg58J9q7VzdEwGxb05SE3H2sUflo1G5bECI7zN4ul8bROX87P0YmWRuFUTVACetxLDpqS5beTug3v1vbG1JeyvP581N1lKBbUhcGZxGQketQLO-IEAiWd78b4D5UMIW9jwZ0TcLRVQ84GU16yhhdI1xD6XiB0NLp1MUbqaszO",
    alt: "Reverse side view",
  },
  {
    id: 2,
    label: "03",
    readout: "03 / 04",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuB1j2jA52ZigTTl8phNt3NQGIWSi4UTVDqDxEm4rGrgOMfZY3GuY5PUh54jWSD0-fUyHVfexOx-uNBmA0296Lpv5BlYs8AqgZz1hsbaJm6qWyoHiQViIOLlMWUEnFHeFoGUYjvsPHniotJQsmK3hnxUqmMF-tKBLBO2Lg0gV6epmylafxWg8FAIA_JSNp2LIo_z7dBU2XUyColOkx18UfTnIJsP_V-_H5tWgeHIFq2V1rId_wPISCHo",
    alt: "Profile side view",
  },
  {
    id: 3,
    label: "04",
    readout: "04 / 04",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuADmpCtLssl17XJ83tp_GSITeMuvffe4tBMqaiaogGI4p-kIdwFVfYq7guG-E2-Gke2uYkQDQXrbJLp4JEzyXGVoZiTqXxlhScF72giPHK4UZLoivUYWqyw7zYothHc4-6-y16akgF7jnidoQpk5gCJepuNaZO8zqgTPw4ol1RpI_f_gBArLmShoPDqwl_uwfHYaALtoclJY2h1YEBJomWpv6AQFX67pYDsG5LuDhQYcQ_KxviQZmA7",
    alt: "Product packaging",
  },
];

export function ProductDetailClient({ product }: ProductDetailClientProps) {
  const cart = useCart();
  const [selectedVariantIdx, setSelectedVariantIdx] = useState(0);
  const [selectedAngle, setSelectedAngle] = useState(0);
  const [heatsinkOption, setHeatsinkOption] = useState<"integrated" | "bare">("integrated");
  const [quantity, setQuantity] = useState(1);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const currentVariant = product.variants[selectedVariantIdx] || product.variants[0];
  const attrs = currentVariant?.attributes || {};

  const mainImage = attrs.image || product.defaultImage;

  const angles = DEFAULT_ANGLES.map((a, i) => {
    if (i === 0) {
      return { ...a, image: mainImage };
    }
    return a;
  });

  const activeAngle = angles[selectedAngle] || angles[0];

  const handleAllocate = () => {
    const unitPrice = currentVariant.price;
    cart.addItem({
      id: currentVariant.id,
      sku: currentVariant.sku,
      name: `${product.name}${product.variants.length > 1 ? ` (${currentVariant.label})` : ""}`,
      price: unitPrice,
      image: mainImage,
      specs: `${attrs.speed || attrs.clock || attrs.vram || attrs.resolution || ""} | ${heatsinkOption === "integrated" ? "With Heatsink" : "Bare Drive"}`,
      badges: [currentVariant.label || attrs.formFactor || "Verified"],
      watts: Number(attrs.watts || 50),
      weightKg: Number(attrs.weightKg || 0.4),
    });
    setToastMessage(`Added ${quantity}x ${product.name} to cart`);
    setTimeout(() => setToastMessage(null), 2500);
  };

  return (
    <div className="flex flex-col min-h-screen bg-surface">
      <Header />

      <main className="w-full pt-[60px] min-h-[calc(100vh-140px)] bg-surface">
        <div className="flex flex-col w-full">
          {/* Breadcrumbs */}
          <section className="w-full bg-surface-container-low px-4 sm:px-8 py-2.5 sm:py-3 border-b border-outline-variant">
            <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-3 text-xs sm:text-sm">
              <div className="flex items-center gap-1.5 sm:gap-2 text-on-surface-variant flex-wrap text-xs sm:text-sm">
                <Link href="/" className="text-primary font-medium hover:text-secondary transition-colors shrink-0">
                  Home
                </Link>
                <span className="shrink-0">/</span>
                <Link
                  href={`/categories/${product.categorySlug}`}
                  className="hover:text-primary transition-colors shrink-0"
                >
                  {product.categoryName}
                </Link>
                <span className="shrink-0">/</span>
                <span className="text-on-surface font-semibold truncate max-w-[200px] sm:max-w-none">
                  {product.name}
                </span>
              </div>
            </div>
          </section>

          {/* Toast */}
          {toastMessage && (
            <div className="fixed top-20 right-4 sm:right-8 z-50 bg-primary text-on-primary px-4 py-2.5 rounded-lg shadow-xl border border-outline-variant flex items-center gap-2 text-sm font-medium animate-in fade-in slide-in-from-top-2">
              <span className="material-symbols-outlined text-[18px] text-emerald-400">
                check_circle
              </span>
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Main Viewport: Two Column Specification & Acquisition Matrix */}
          <div className="w-full px-3 sm:px-8 py-4 sm:py-8">
            <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8 items-start">
              {/* Left Column: Image Viewer and Thumbnails */}
              <div className="lg:col-span-7 flex flex-col gap-4">
                {/* Main Product Viewer */}
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-3 sm:p-8 flex flex-col justify-between relative min-h-[300px] sm:min-h-[440px]">
                  {/* Top Spec Badges & Counter Header - Responsive Flex Row */}
                  <div className="w-full flex items-start justify-between gap-2 z-10">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-mono">
                      {attrs.formFactor && (
                        <span className="bg-surface-container-low px-2 py-0.5 sm:py-1 rounded text-on-surface font-medium border border-outline-variant">
                          {attrs.formFactor}
                        </span>
                      )}
                      {attrs.interface && (
                        <span className="bg-surface-container-low px-2 py-0.5 sm:py-1 rounded text-on-surface font-medium border border-outline-variant">
                          {attrs.interface}
                        </span>
                      )}
                      {currentVariant.stock > 0 && (
                        <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 sm:py-1 rounded font-medium border border-emerald-200">
                          In Stock
                        </span>
                      )}
                    </div>

                    {/* Image Counter Overlay Badge */}
                    <div className="shrink-0 text-[11px] sm:text-xs bg-surface-container-low px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md text-on-surface-variant flex items-center gap-1 font-mono border border-outline-variant">
                      <span className="material-symbols-outlined text-[13px] sm:text-[14px]">
                        photo_camera
                      </span>
                      <span>{activeAngle.readout}</span>
                    </div>
                  </div>

                  {/* Primary Product Image */}
                  <div className="w-full max-w-[540px] h-[220px] sm:h-[340px] mx-auto flex items-center justify-center relative my-2 sm:my-4">
                    <Image
                      alt={activeAngle.alt}
                      className="object-contain filter drop-shadow-sm transition-opacity duration-150"
                      src={activeAngle.image}
                      fill
                      priority
                      sizes="(max-width: 768px) 100vw, 540px"
                    />
                  </div>
                </div>

                {/* Interactive Angle Gallery Thumbnails (Only retain the number of the image) */}
                <div className="grid grid-cols-4 gap-3">
                  {angles.map((angle) => (
                    <button
                      key={angle.id}
                      type="button"
                      onClick={() => setSelectedAngle(angle.id)}
                      className={`p-2 rounded-lg flex flex-col items-center gap-1.5 text-center cursor-pointer transition-all border ${
                        selectedAngle === angle.id
                          ? "bg-surface-container-high border-primary ring-1 ring-primary"
                          : "bg-surface-container-lowest border-outline-variant hover:bg-surface-container-low"
                      }`}
                    >
                      <div className="w-full h-16 bg-surface-container-low rounded flex items-center justify-center overflow-hidden relative">
                        <Image
                          alt={`View ${angle.label}`}
                          className="object-contain p-1"
                          src={angle.image}
                          fill
                          sizes="120px"
                        />
                      </div>
                      <div className="w-full text-center">
                        <span className="text-primary font-bold font-mono text-xs">
                          {angle.label}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Clean Spec Summary Bar */}
                <div className="bg-surface-container-lowest border border-outline-variant p-4 rounded-xl flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
                  <div className="flex items-center gap-1.5 text-on-surface">
                    <span className="text-on-surface-variant">Form Factor:</span>
                    <span className="font-bold">
                      {attrs.formFactor || "M.2 2280"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-on-surface">
                    <span className="text-on-surface-variant">Weight:</span>
                    <span className="font-bold">
                      {attrs.weightKg ? `${(attrs.weightKg * 1000).toFixed(0)} g` : "120 g"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-on-surface">
                    <span className="text-on-surface-variant">Power:</span>
                    <span className="font-semibold">{attrs.watts || 65}W TDP</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Pricing, Configuration & Purchase */}
              <div className="lg:col-span-5 flex flex-col gap-5">
                <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wider text-secondary font-bold font-mono">
                      {attrs.brand || "Hardware"}
                    </span>
                  </div>

                  <h1 className="font-headline-lg text-xl sm:text-2xl text-on-surface leading-snug font-bold">
                    {product.name}
                  </h1>

                  {/* SKU & Stock Info */}
                  <div className="bg-surface-container-low border border-outline-variant p-2.5 rounded-lg text-xs text-on-surface-variant flex flex-wrap items-center justify-between gap-2 font-mono">
                    <span>
                      <strong className="text-on-surface">SKU:</strong> {currentVariant.sku}
                    </span>
                    <span className="text-emerald-700 font-semibold">
                      {currentVariant.stock > 0 ? `${currentVariant.stock} available` : "Backorder"}
                    </span>
                  </div>

                  {/* Live Stock Notification */}
                  <div className="flex items-center gap-2.5 text-xs bg-surface-container-low/70 px-3 py-2 rounded-lg border border-outline-variant">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span className="text-on-surface font-medium">
                      In Stock — {currentVariant.stock} units ready to ship
                    </span>
                  </div>

                  {/* Variant / Capacity Selector */}
                  {product.variants.length > 1 && (
                    <div className="space-y-2 pt-2 border-t border-outline-variant">
                      <span className="text-xs font-semibold text-on-surface block">
                        Select Capacity
                      </span>
                      <div className="grid grid-cols-3 gap-2">
                        {product.variants.map((variant, idx) => (
                          <button
                            key={variant.id}
                            type="button"
                            onClick={() => setSelectedVariantIdx(idx)}
                            className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                              selectedVariantIdx === idx
                                ? "border-primary bg-primary text-on-primary shadow-sm"
                                : "border-outline-variant bg-surface-container-lowest hover:bg-surface-container-low text-on-surface"
                            }`}
                          >
                            <div className="font-headline-sm text-sm font-bold truncate">
                              {variant.label}
                            </div>
                            <div
                              className={`text-xs mt-0.5 font-mono ${
                                selectedVariantIdx === idx
                                  ? "text-surface-container-highest"
                                  : "text-on-surface-variant"
                              }`}
                            >
                              ${variant.price.toFixed(2)}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Heatsink Options */}
                  <div className="space-y-2 pt-2 border-t border-outline-variant">
                    <span className="text-xs font-semibold text-on-surface block">
                      Heatsink Option
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setHeatsinkOption("integrated")}
                        className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                          heatsinkOption === "integrated"
                            ? "border-primary bg-surface-container-high text-on-surface font-semibold"
                            : "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low"
                        }`}
                      >
                        <div className="text-xs font-bold text-on-surface">
                          With Heatsink
                        </div>
                        <div className="text-[11px] text-on-surface-variant mt-0.5">
                          Factory pre-installed cooler
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setHeatsinkOption("bare")}
                        className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                          heatsinkOption === "bare"
                            ? "border-primary bg-surface-container-high text-on-surface font-semibold"
                            : "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low"
                        }`}
                      >
                        <div className="text-xs font-bold text-on-surface">
                          Without Heatsink
                        </div>
                        <div className="text-[11px] text-on-surface-variant mt-0.5">
                          For motherboard covers
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Price & Add to Cart */}
                  <div className="pt-4 border-t border-outline-variant space-y-4">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-on-surface-variant font-medium">
                        Total Price:
                      </span>
                      <span className="font-metric-tabular text-3xl font-bold text-primary">
                        ${(currentVariant.price * quantity).toFixed(2)}
                      </span>
                    </div>

                    <div className="flex gap-3">
                      <div className="flex items-center border border-outline-variant rounded-lg bg-surface-container-lowest">
                        <button
                          type="button"
                          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                          className="w-10 h-11 flex items-center justify-center text-on-surface hover:bg-surface-container-low text-base font-bold cursor-pointer"
                        >
                          -
                        </button>
                        <span className="w-10 text-center font-metric-tabular text-base font-bold">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQuantity((q) => q + 1)}
                          className="w-10 h-11 flex items-center justify-center text-on-surface hover:bg-surface-container-low text-base font-bold cursor-pointer"
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={handleAllocate}
                        className="flex-1 bg-primary hover:bg-secondary text-on-primary py-3 px-6 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer text-sm"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          add_shopping_cart
                        </span>
                        <span>Add to Cart</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Technical Specifications */}
                <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-xl space-y-4">
                  <div className="border-b border-outline-variant pb-2">
                    <span className="text-xs uppercase font-bold text-on-surface font-mono tracking-wider">
                      Technical Specifications
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                    <div className="p-2.5 bg-surface-container-low rounded-lg border border-outline-variant">
                      <span className="text-[10px] text-on-surface-variant block uppercase">
                        Read / Write Speed
                      </span>
                      <span className="font-metric-tabular text-sm font-bold text-on-surface">
                        {attrs.speed || attrs.clock || "High Speed"}
                      </span>
                    </div>
                    <div className="p-2.5 bg-surface-container-low rounded-lg border border-outline-variant">
                      <span className="text-[10px] text-on-surface-variant block uppercase">
                        Endurance (TBW)
                      </span>
                      <span className="font-metric-tabular text-sm font-bold text-on-surface">
                        {attrs.tbw || attrs.vram || "Standard"}
                      </span>
                    </div>
                    <div className="p-2.5 bg-surface-container-low rounded-lg border border-outline-variant">
                      <span className="text-[10px] text-on-surface-variant block uppercase">
                        Power (TDP)
                      </span>
                      <span className="font-metric-tabular text-sm font-bold text-on-surface">
                        {attrs.watts || 65}W TDP
                      </span>
                    </div>
                    <div className="p-2.5 bg-surface-container-low rounded-lg border border-outline-variant">
                      <span className="text-[10px] text-on-surface-variant block uppercase">
                        Interface
                      </span>
                      <span className="font-metric-tabular text-sm font-bold text-on-surface">
                        {attrs.interface || "PCIe"}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-surface-container-low rounded-lg border border-outline-variant text-xs space-y-1 text-on-surface-variant leading-relaxed">
                    <div>
                      <strong className="text-on-surface">Overview:</strong> {product.description}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <AiAssistant />
      <Footer />
    </div>
  );
}
