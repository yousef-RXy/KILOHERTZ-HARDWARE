import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  ProductDetailClient,
  SerializedProductDetail,
  SerializedVariant,
} from "./ProductDetailClient";

// Cache product page with ISR revalidated every 60s
export const revalidate = 60;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;

  const product = await prisma.product.findFirst({
    where: {
      slug,
      deletedAt: null,
      isActive: true,
    },
    include: {
      category: true,
      variants: {
        orderBy: {
          priceOverride: "asc",
        },
      },
    },
  });

  if (!product) {
    notFound();
  }

  const variants: SerializedVariant[] = product.variants.map((v) => {
    const attrs = (v.attributes || {}) as Record<string, any>;
    const label =
      attrs.capacity ||
      attrs.vram ||
      (attrs.cores ? `${attrs.cores} Cores` : "") ||
      v.sku;

    return {
      id: v.id,
      sku: v.sku,
      label: String(label),
      price: Number(v.priceOverride ?? product.basePrice),
      stock: v.stock,
      attributes: attrs,
    };
  });

  const firstAttrs = (product.variants[0]?.attributes || {}) as Record<string, any>;
  const defaultImage =
    firstAttrs.image ||
    "https://lh3.googleusercontent.com/aida-public/AB6AXuD_EzyUfWjECBXOZXFDPjuDg5RJxAVsOB5aUVhjTnyaIwJRaT-Gc71mDvQroT3ma47k7tbaZwY4fBt3_C2fdnVQxiDFHuTnzMhDWfEwh3hBMzPjgt13uocgGk6Tk9ZhJwnblS7KK7u-hePgpCD5jNOkYXCvkAucmM5TA-VKCUblvRAF9qA_XP0MV6pwAb68vYOi8_Khcf-SGxPTwKXWK80-9UpVtJUjOnq2XgiW-GAIsvXqou0btdHi";

  const serializedProduct: SerializedProductDetail = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    categoryName: product.category.name,
    categorySlug: product.category.slug,
    basePrice: Number(product.basePrice),
    variants,
    defaultImage,
  };

  return <ProductDetailClient product={serializedProduct} />;
}

export async function generateStaticParams() {
  try {
    const products = await prisma.product.findMany({
      where: { deletedAt: null, isActive: true },
      select: { slug: true },
    });
    return products.map((p) => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

