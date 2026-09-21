import { prisma } from "@/lib/prisma";
import { HomePageClient, SerializedCategory, SerializedProduct } from "./HomePageClient";

// Cache homepage using Incremental Static Regeneration (ISR) revalidated every 60 seconds
export const revalidate = 60;

const CATEGORY_META: Record<string, { code: string; tag: string }> = {
  storage: { code: "CAT-MEM-01", tag: "PCIe 4 / 5 • NVMe" },
  cpus: { code: "CAT-CPU-02", tag: "x86_64 / AM5 / LGA" },
  gpus: { code: "CAT-GPU-03", tag: "CUDA / ECC / ML" },
  displays: { code: "CAT-DSP-04", tag: "10-BIT / 3D-LUT" },
  peripherals: { code: "CAT-PER-05", tag: "PCIe / QSFP28" },
};

export default async function HomePage() {
  const dbCategories = await prisma.category.findMany({
    where: { deletedAt: null },
    include: {
      products: {
        where: { deletedAt: null, isActive: true },
        include: { variants: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const categories: SerializedCategory[] = dbCategories.map((c, idx) => {
    const meta = CATEGORY_META[c.slug] || {
      code: `CAT-SYS-${String(idx + 1).padStart(2, "0")}`,
      tag: "ENTERPRISE",
    };
    return {
      id: c.id,
      code: meta.code,
      title: c.name,
      models: `${c.products.length} models available`,
      tag: meta.tag,
      href: `/categories/${c.slug}`,
    };
  });

  const dbProducts = await prisma.product.findMany({
    where: { deletedAt: null, isActive: true },
    include: {
      category: true,
      variants: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const products: SerializedProduct[] = dbProducts.map((p) => {
    const firstVariant = p.variants[0];
    const totalStock = p.variants.reduce((acc, v) => acc + v.stock, 0);
    const attrs = (firstVariant?.attributes || {}) as Record<string, any>;

    let specs = p.description;
    if (attrs.speed && attrs.tbw) {
      specs = `${attrs.speed} Read | ${attrs.tbw} | ${attrs.nandType || "TLC"}`;
    } else if (attrs.cores && attrs.threads) {
      specs = `${attrs.cores} Cores | ${attrs.threads} Threads | ${attrs.speed || ""}`;
    } else if (attrs.vram) {
      specs = `${attrs.vram} | PCIe 4.0 x16 | ${attrs.watts || 300}W TDP`;
    } else if (attrs.resolution) {
      specs = `${attrs.resolution} | 99% Adobe RGB | Calibrated`;
    }

    return {
      id: p.id,
      slug: p.slug,
      categoryBadge: attrs.categoryBadge || p.category.name.toUpperCase(),
      sku: firstVariant?.sku || p.slug.toUpperCase(),
      name: p.name,
      specs,
      stockText: totalStock > 0 ? `In Stock (${totalStock} units)` : "Awaiting Batch",
      stockUnits: totalStock,
      price: Number(firstVariant?.priceOverride ?? p.basePrice),
      image:
        attrs.image ||
        "https://lh3.googleusercontent.com/aida-public/AB6AXuD_EzyUfWjECBXOZXFDPjuDg5RJxAVsOB5aUVhjTnyaIwJRaT-Gc71mDvQroT3ma47k7tbaZwY4fBt3_C2fdnVQxiDFHuTnzMhDWfEwh3hBMzPjgt13uocgGk6Tk9ZhJwnblS7KK7u-hePgpCD5jNOkYXCvkAucmM5TA-VKCUblvRAF9qA_XP0MV6pwAb68vYOi8_Khcf-SGxPTwKXWK80-9UpVtJUjOnq2XgiW-GAIsvXqou0btdHi",
      watts: Number(attrs.watts || 65),
      weightKg: Number(attrs.weightKg || 0.5),
    };
  });

  return <HomePageClient categories={categories} products={products} />;
}
