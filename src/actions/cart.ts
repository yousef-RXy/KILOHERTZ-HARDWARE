"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { CartItem } from "@/context/CartContext";

function formatCartItemFromDb(item: any): CartItem {
  const v = item.variant;
  const p = v?.product;
  const attrs = (v?.attributes || {}) as Record<string, any>;

  let specs = p?.description || "";
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
    id: v?.id || item.productVariantId || item.id,
    sku: v?.sku || item.sku || "SPECIMEN",
    name: p?.name || "Hardware Component",
    price: Number(v?.priceOverride ?? p?.basePrice ?? 0),
    quantity: item.quantity,
    image:
      attrs.image ||
      "https://lh3.googleusercontent.com/aida-public/AB6AXuD_EzyUfWjECBXOZXFDPjuDg5RJxAVsOB5aUVhjTnyaIwJRaT-Gc71mDvQroT3ma47k7tbaZwY4fBt3_C2fdnVQxiDFHuTnzMhDWfEwh3hBMzPjgt13uocgGk6Tk9ZhJwnblS7KK7u-hePgpCD5jNOkYXCvkAucmM5TA-VKCUblvRAF9qA_XP0MV6pwAb68vYOi8_Khcf-SGxPTwKXWK80-9UpVtJUjOnq2XgiW-GAIsvXqou0btdHi",
    specs,
    badges: [
      attrs.categoryBadge || "HARDWARE",
      attrs.formFactor || "Standard",
    ].filter(Boolean),
    watts: Number(attrs.watts || 50),
    weightKg: Number(attrs.weightKg || 0.5),
  };
}

async function getOrCreateUserCart(userId: string, email: string, name?: string) {
  let user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        id: userId,
        email,
        name: name || email.split("@")[0],
        role: "CUSTOMER",
      },
    });
  }

  let cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          variant: {
            include: {
              product: true,
            },
          },
        },
      },
    },
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: {
        userId,
      },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });
  }

  return cart!;
}

export async function getDbCartAction(): Promise<CartItem[] | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return null;
  }

  const cart = await getOrCreateUserCart(
    user.id,
    user.email,
    user.user_metadata?.full_name || user.user_metadata?.name
  );

  return (cart.items || []).map(formatCartItemFromDb);
}

export async function saveDbCartAction(items: CartItem[]): Promise<{ success: boolean; unauthorized?: boolean; items: CartItem[] }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return { success: false, unauthorized: true, items };
  }

  const cart = await getOrCreateUserCart(
    user.id,
    user.email,
    user.user_metadata?.full_name || user.user_metadata?.name
  );

  await prisma.cartItem.deleteMany({
    where: { cartId: cart.id },
  });

  const variantQtyMap = new Map<string, number>();

  for (const item of items) {
    let variant = item.sku
      ? await prisma.productVariant.findUnique({
          where: { sku: item.sku },
        })
      : null;

    if (!variant && item.id) {
      variant = await prisma.productVariant.findUnique({
        where: { id: item.id },
      });
    }

    if (!variant && item.id) {
      variant = await prisma.productVariant.findFirst({
        where: { productId: item.id },
      });
    }

    if (!variant && item.name) {
      variant = await prisma.productVariant.findFirst({
        where: {
          product: {
            OR: [
              { name: { contains: item.name.split(" ")[0] } },
              { slug: { contains: (item.sku || "").toLowerCase() } },
            ],
          },
        },
      });
    }

    if (variant) {
      const currentQty = variantQtyMap.get(variant.id) || 0;
      variantQtyMap.set(variant.id, currentQty + (item.quantity || 1));
    }
  }

  for (const [variantId, quantity] of variantQtyMap.entries()) {
    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productVariantId: variantId,
        quantity,
      },
    });
  }

  const updatedCart = await prisma.cart.findUnique({
    where: { id: cart.id },
    include: {
      items: {
        include: {
          variant: {
            include: {
              product: true,
            },
          },
        },
      },
    },
  });

  const formattedItems = (updatedCart?.items || []).map(formatCartItemFromDb);

  return {
    success: true,
    items: formattedItems.length > 0 ? formattedItems : items,
  };
}

export async function mergeDbCartAction(localItems: CartItem[]): Promise<{ success: boolean; unauthorized?: boolean; items: CartItem[] }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return { success: false, unauthorized: true, items: localItems };
  }

  const cart = await getOrCreateUserCart(
    user.id,
    user.email,
    user.user_metadata?.full_name || user.user_metadata?.name
  );

  const existingDbItems = (cart.items || []).map(formatCartItemFromDb);

  const mergedMap = new Map<string, CartItem>();

  for (const item of existingDbItems) {
    mergedMap.set(item.sku, { ...item });
  }

  for (const localItem of localItems) {
    if (mergedMap.has(localItem.sku)) {
      const existing = mergedMap.get(localItem.sku)!;
      mergedMap.set(localItem.sku, {
        ...existing,
        quantity: existing.quantity + localItem.quantity,
      });
    } else {
      mergedMap.set(localItem.sku, { ...localItem });
    }
  }

  const mergedItems = Array.from(mergedMap.values());
  return await saveDbCartAction(mergedItems);
}

export async function clearDbCartAction(): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false };
  }

  const cart = await prisma.cart.findUnique({
    where: { userId: user.id },
  });

  if (cart) {
    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });
  }

  return { success: true };
}
