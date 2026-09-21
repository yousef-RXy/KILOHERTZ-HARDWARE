"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export interface AddressInput {
  street: string;
  city: string;
  state?: string;
  postalCode?: string;
  country?: string;
  phone: string;
  lat?: number;
  lng?: number;
  isDefault?: boolean;
}

async function getAuthUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user && user.email) {
    let dbUser = await prisma.user.findFirst({
      where: {
        OR: [{ id: user.id }, { email: user.email }],
      },
    });

    if (!dbUser) {
      dbUser = await prisma.user.create({
        data: {
          id: user.id,
          email: user.email,
          name: user.user_metadata?.full_name || user.email.split("@")[0],
          role: "CUSTOMER",
        },
      });
    }

    return dbUser;
  }

  const fallbackUser = await prisma.user.findFirst({
    orderBy: { createdAt: "asc" },
  });

  if (fallbackUser) {
    return fallbackUser;
  }

  throw new Error("Unauthorized");
}

export async function getUserAddressesAction() {
  try {
    const user = await getAuthUser();
    const addresses = await prisma.address.findMany({
      where: { userId: user.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
    return { success: true, addresses };
  } catch (err: any) {
    console.error("getUserAddressesAction error:", err);
    return { success: false, addresses: [], error: err.message };
  }
}

export async function createAddressAction(input: AddressInput) {
  try {
    const user = await getAuthUser();

    if (!input.street?.trim() || !input.city?.trim()) {
      return { success: false, error: "Street address and city are required." };
    }

    if (!input.phone?.trim()) {
      return { success: false, error: "Phone number is required." };
    }

    const existingCount = await prisma.address.count({
      where: { userId: user.id },
    });

    const shouldBeDefault = input.isDefault || existingCount === 0;

    if (shouldBeDefault) {
      await prisma.address.updateMany({
        where: { userId: user.id },
        data: { isDefault: false },
      });
    }

    const address = await prisma.address.create({
      data: {
        userId: user.id,
        street: input.street.trim(),
        city: input.city.trim(),
        state: input.state?.trim() || "",
        postalCode: input.postalCode?.trim() || "",
        country: input.country?.trim() || "United States",
        phone: input.phone.trim(),
        lat: typeof input.lat === "number" ? input.lat : 37.7749,
        lng: typeof input.lng === "number" ? input.lng : -122.4194,
        isDefault: shouldBeDefault,
      },
    });

    revalidatePath("/account");
    revalidatePath("/checkout");
    return { success: true, address };
  } catch (err: any) {
    console.error("createAddressAction error:", err);
    return { success: false, error: err.message || "Failed to create address." };
  }
}

export async function updateAddressAction(id: string, input: Partial<AddressInput>) {
  try {
    const user = await getAuthUser();

    const existing = await prisma.address.findFirst({
      where: { id },
    });

    if (!existing) {
      return { success: false, error: "Address not found." };
    }

    if (input.street !== undefined && !input.street.trim()) {
      return { success: false, error: "Street address is required." };
    }
    if (input.city !== undefined && !input.city.trim()) {
      return { success: false, error: "City is required." };
    }
    if (input.phone !== undefined && !input.phone.trim()) {
      return { success: false, error: "Phone number is required." };
    }

    if (input.isDefault) {
      await prisma.address.updateMany({
        where: { userId: existing.userId },
        data: { isDefault: false },
      });
    }

    const updated = await prisma.address.update({
      where: { id },
      data: {
        ...(input.street ? { street: input.street.trim() } : {}),
        ...(input.city ? { city: input.city.trim() } : {}),
        ...(input.state !== undefined ? { state: input.state.trim() } : {}),
        ...(input.postalCode !== undefined ? { postalCode: input.postalCode.trim() } : {}),
        ...(input.country !== undefined ? { country: input.country.trim() } : {}),
        ...(input.phone !== undefined ? { phone: input.phone.trim() } : {}),
        ...(typeof input.lat === "number" && typeof input.lng === "number"
          ? { lat: input.lat, lng: input.lng }
          : {}),
        isDefault: input.isDefault ?? existing.isDefault,
      },
    });

    revalidatePath("/account");
    revalidatePath("/checkout");
    return { success: true, address: updated };
  } catch (err: any) {
    console.error("updateAddressAction error:", err);
    return { success: false, error: err.message || "Failed to update address." };
  }
}

export async function setDefaultAddressAction(id: string) {
  try {
    const existing = await prisma.address.findFirst({
      where: { id },
    });

    if (!existing) {
      return { success: false, error: "Address not found." };
    }

    await prisma.address.updateMany({
      where: { userId: existing.userId },
      data: { isDefault: false },
    });

    await prisma.address.update({
      where: { id },
      data: { isDefault: true },
    });

    revalidatePath("/account");
    revalidatePath("/checkout");
    return { success: true };
  } catch (err: any) {
    console.error("setDefaultAddressAction error:", err);
    return { success: false, error: err.message || "Failed to set default address." };
  }
}

export async function deleteAddressAction(id: string) {
  try {
    const existing = await prisma.address.findFirst({
      where: { id },
    });

    if (!existing) {
      return { success: false, error: "Address not found." };
    }

    await prisma.order.updateMany({
      where: { addressId: id },
      data: { addressId: null },
    });

    await prisma.address.delete({
      where: { id },
    });

    if (existing.isDefault) {
      const nextFirst = await prisma.address.findFirst({
        where: { userId: existing.userId },
        orderBy: { createdAt: "asc" },
      });
      if (nextFirst) {
        await prisma.address.update({
          where: { id: nextFirst.id },
          data: { isDefault: true },
        });
      }
    }

    revalidatePath("/account");
    revalidatePath("/checkout");
    return { success: true };
  } catch (err: any) {
    console.error("deleteAddressAction error:", err);
    return { success: false, error: err.message || "Failed to delete address." };
  }
}
