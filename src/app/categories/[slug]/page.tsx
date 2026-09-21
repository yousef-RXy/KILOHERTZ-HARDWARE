import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  CategoryClient,
  CategoryMeta,
  CategoryProduct,
} from "./CategoryClient";

// Cache category page with ISR revalidated every 60s
export const revalidate = 60;

interface PageProps {
  params: Promise<{ slug: string }>;
}

const CATEGORY_CUSTOM_DESCRIPTIONS: Record<
  string,
  {
    breadcrumb: string;
    subtitle: string;
    qualifiedFormFactors: string;
    benchmarkStd: string;
  }
> = {
  storage: {
    breadcrumb: "STORAGE & MEMORY / SOLID STATE DRIVES (NVME & SATA)",
    subtitle:
      "Enterprise and workstation solid-state storage validated for sustained thermal stability, endurance rating (TBW), and deterministic I/O performance.",
    qualifiedFormFactors: "M.2 2280 / 22110 / U.2",
    benchmarkStd: "FIO 4K QD32",
  },
  cpus: {
    breadcrumb: "PROCESSORS & COMPUTE / HIGH-TDP WORKSTATION CPUS",
    subtitle:
      "Multithreaded x86_64 workstation and enterprise processors tested for continuous 100% AVX-512 load and voltage rail jitter tolerances.",
    qualifiedFormFactors: "LGA1700 / AM5 / sTR5 / SP5",
    benchmarkStd: "SPECworkstation 3.1",
  },
  gpus: {
    breadcrumb: "ACCELERATORS / ENTERPRISE CUDA & WORKSTATION GPUS",
    subtitle:
      "Precision workstation GPUs with ECC video memory, locked driver branches, and certified hardware virtualization.",
    qualifiedFormFactors: "PCIe 4.0 / 5.0 x16 Full-Height",
    benchmarkStd: "OctaneBench / MLPerf",
  },
  displays: {
    breadcrumb: "DISPLAYS / HARDWARE-CALIBRATED COLOR REFERENCE",
    subtitle:
      "Direct-LED and IPS monitors with factory internal 14-bit 3D LUTs, Delta E < 1.0 calibration certificates, and 10-bit color pipelines.",
    qualifiedFormFactors: "VESA 100x100 / Standmount",
    benchmarkStd: "SpectraCal CalMAN Certified",
  },
  peripherals: {
    breadcrumb: "PERIPHERALS / HIGH-SPEED INTERCONNECT & POWER",
    subtitle:
      "Ultra-low latency controllers, 10GbE / 100GbE QSFP28 adapters, and precision mechanical inputs for telemetry stations.",
    qualifiedFormFactors: "PCIe / USB 3.2 Gen 2x2",
    benchmarkStd: "RFC 2544 Throughput",
  },
};

export default async function CategoryPage({ params }: PageProps) {
  const { slug } = await params;

  const category = await prisma.category.findFirst({
    where: {
      slug,
      deletedAt: null,
    },
    include: {
      products: {
        where: {
          deletedAt: null,
          isActive: true,
        },
        include: {
          variants: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!category) {
    notFound();
  }

  const custom = CATEGORY_CUSTOM_DESCRIPTIONS[category.slug] || {
    breadcrumb: `${category.name.toUpperCase()} // LAB CATALOG`,
    subtitle: `Enterprise and workstation components with verified hardware compatibility and direct laboratory dispatch.`,
    qualifiedFormFactors: "Enterprise Standards",
    benchmarkStd: "ISO Telemetry",
  };

  const categoryMeta: CategoryMeta = {
    title: category.name,
    breadcrumb: custom.breadcrumb,
    subtitle: custom.subtitle,
    qualifiedFormFactors: custom.qualifiedFormFactors,
    benchmarkStd: custom.benchmarkStd,
  };

  const products: CategoryProduct[] = category.products.map((p) => {
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
      sku: firstVariant?.sku || p.slug.toUpperCase(),
      categoryBadge: attrs.categoryBadge || category.name.toUpperCase(),
      brand: attrs.brand || "Workstation Lab Spec",
      name: p.name,
      specs,
      interface: attrs.interface || "PCIe / Standard",
      formFactor: attrs.formFactor || "Standard",
      nandType: attrs.nandType || "N/A",
      stockUnits: totalStock,
      price: Number(firstVariant?.priceOverride ?? p.basePrice),
      watts: Number(attrs.watts || 50),
      weightKg: Number(attrs.weightKg || 0.5),
      image:
        attrs.image ||
        "https://lh3.googleusercontent.com/aida-public/AB6AXuD_EzyUfWjECBXOZXFDPjuDg5RJxAVsOB5aUVhjTnyaIwJRaT-Gc71mDvQroT3ma47k7tbaZwY4fBt3_C2fdnVQxiDFHuTnzMhDWfEwh3hBMzPjgt13uocgGk6Tk9ZhJwnblS7KK7u-hePgpCD5jNOkYXCvkAucmM5TA-VKCUblvRAF9qA_XP0MV6pwAb68vYOi8_Khcf-SGxPTwKXWK80-9UpVtJUjOnq2XgiW-GAIsvXqou0btdHi",
    };
  });

  return (
    <CategoryClient
      categoryMeta={categoryMeta}
      products={products}
      categorySlug={category.slug}
    />
  );
}

export async function generateStaticParams() {
  try {
    const categories = await prisma.category.findMany({
      where: { deletedAt: null },
      select: { slug: true },
    });
    return categories.map((c) => ({ slug: c.slug }));
  } catch {
    return [];
  }
}

