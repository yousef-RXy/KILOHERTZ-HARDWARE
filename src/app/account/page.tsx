import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import {
  AccountClient,
  SerializedAddress,
  SerializedOrder,
  SerializedUser,
} from "./AccountClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  // If authenticated user exists, find their record; otherwise fall back to first user in DB
  const dbUser = authUser?.email
    ? await prisma.user.findFirst({
        where: { email: authUser.email },
        include: {
          addresses: {
            orderBy: { isDefault: "desc" },
          },
          orders: {
            include: {
              items: true,
              address: true,
              payments: true,
            },
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      })
    : await prisma.user.findFirst({
        include: {
          addresses: {
            orderBy: { isDefault: "desc" },
          },
          orders: {
            include: {
              items: true,
              address: true,
              payments: true,
            },
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      });

  const user: SerializedUser = {
    id: dbUser?.id || authUser?.id || "kh-user-default",
    name: dbUser?.name || authUser?.user_metadata?.full_name || "Dr. Evelyn Vance",
    email: dbUser?.email || authUser?.email || "systems@workstation-labs.io",
    role: dbUser?.role || "CUSTOMER",
  };

  const addresses: SerializedAddress[] = (dbUser?.addresses || []).map((addr) => ({
    id: addr.id,
    street: addr.street,
    city: addr.city,
    state: addr.state,
    postalCode: addr.postalCode,
    country: addr.country,
    phone: addr.phone,
    lat: addr.lat,
    lng: addr.lng,
    isDefault: addr.isDefault,
  }));

  const orders: SerializedOrder[] = (dbUser?.orders || []).map((ord) => {
    const destination = ord.address
      ? `${ord.address.street}, ${ord.address.city}, ${ord.address.state || ""}`
      : "San Jose Cleanroom Receiving Bay";

    return {
      id: ord.id,
      orderNumber: `KH-${ord.id.slice(0, 8).toUpperCase()}-ORD`,
      status: ord.status,
      totalAmount: Number(ord.totalAmount),
      createdAt: ord.createdAt.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
      destination,
      items: ord.items.map((item) => ({
        id: item.id,
        title: item.titleSnapshot,
        sku: item.skuSnapshot,
        quantity: item.quantity,
        price: Number(item.priceAtPurchase),
      })),
    };
  });

  return (
    <AccountClient
      user={user}
      orders={orders}
      addresses={addresses}
      isAuthenticated={!!authUser}
    />
  );
}
