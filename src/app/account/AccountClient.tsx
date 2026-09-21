"use client";

import Link from "next/link";
import { useState, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import {
  createAddressAction,
  updateAddressAction,
  setDefaultAddressAction,
  deleteAddressAction,
} from "@/actions/address";
import type { SelectedLocation } from "@/components/AddressMapPicker";

const AddressMapPicker = dynamic(
  () => import("@/components/AddressMapPicker"),
  {
    ssr: false,
    loading: () => (
      <div className="h-56 w-full rounded-lg bg-surface-container flex items-center justify-center border border-outline-variant text-xs text-on-surface-variant">
        <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
        Loading map picker...
      </div>
    ),
  }
);

export interface SerializedOrderItem {
  id: string;
  title: string;
  sku: string;
  quantity: number;
  price: number;
}

export interface SerializedOrder {
  id: string;
  orderNumber: string;
  status: "PENDING" | "PAID" | "SHIPPED" | "EXPIRED" | "CANCELLED";
  totalAmount: number;
  createdAt: string;
  destination: string;
  items: SerializedOrderItem[];
}

export interface SerializedAddress {
  id: string;
  street: string;
  city: string;
  state: string | null;
  postalCode: string | null;
  country: string;
  phone?: string | null;
  lat?: number;
  lng?: number;
  isDefault: boolean;
}

export interface SerializedUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AccountClientProps {
  user: SerializedUser;
  orders: SerializedOrder[];
  addresses: SerializedAddress[];
  isAuthenticated?: boolean;
}

export function AccountClient({ user, orders, addresses, isAuthenticated = false }: AccountClientProps) {
  const [activeTab, setActiveTab] = useState<"orders" | "docks">("orders");
  const [orderFilter, setOrderFilter] = useState<"all" | "transit" | "delivered">("all");

  // Address state
  const [addressList, setAddressList] = useState<SerializedAddress[]>(addresses);
  useEffect(() => {
    setAddressList(addresses);
  }, [addresses]);

  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<SerializedAddress | null>(null);
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [stateVal, setStateVal] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("United States");
  const [phone, setPhone] = useState("");
  const [lat, setLat] = useState<number | undefined>(undefined);
  const [lng, setLng] = useState<number | undefined>(undefined);
  const [pickerMode, setPickerMode] = useState<"map" | "manual">("map");
  const [isDefault, setIsDefault] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  const handleOpenAdd = () => {
    setEditingAddress(null);
    setStreet("");
    setCity("");
    setStateVal("");
    setPostalCode("");
    setCountry("");
    setPhone("");
    setLat(undefined);
    setLng(undefined);
    setPickerMode("map");
    setIsDefault(addressList.length === 0);
    setModalError(null);
    setIsAddressModalOpen(true);
  };

  const handleOpenEdit = (addr: SerializedAddress) => {
    setEditingAddress(addr);
    setStreet(addr.street);
    setCity(addr.city);
    setStateVal(addr.state || "");
    setPostalCode(addr.postalCode || "");
    setCountry(addr.country || "United States");
    setPhone(addr.phone || "");
    setLat(addr.lat);
    setLng(addr.lng);
    setPickerMode(addr.lat && addr.lng ? "map" : "manual");
    setIsDefault(addr.isDefault);
    setModalError(null);
    setIsAddressModalOpen(true);
  };

  const handleLocationSelect = (loc: SelectedLocation) => {
    if (loc.street) setStreet(loc.street);
    if (loc.city) setCity(loc.city);
    if (loc.state) setStateVal(loc.state);
    if (loc.postalCode) setPostalCode(loc.postalCode);
    if (loc.country) setCountry(loc.country);
    setLat(loc.lat);
    setLng(loc.lng);
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!street.trim() || !city.trim()) {
      setModalError("Please provide both a street address and city.");
      return;
    }
    if (!phone.trim()) {
      setModalError("Please provide a phone number for delivery contact.");
      return;
    }

    setSubmitting(true);
    setModalError(null);

    try {
      if (editingAddress) {
        const res = await updateAddressAction(editingAddress.id, {
          street,
          city,
          state: stateVal,
          postalCode,
          country,
          phone,
          lat,
          lng,
          isDefault,
        });

        if (!res.success) {
          setModalError(res.error || "Failed to update address.");
          return;
        }

        setAddressList((prev) =>
          prev.map((a) => {
            if (a.id === editingAddress.id) {
              return {
                ...a,
                street,
                city,
                state: stateVal || null,
                postalCode: postalCode || null,
                country,
                phone: phone || null,
                lat,
                lng,
                isDefault,
              };
            }
            if (isDefault) {
              return { ...a, isDefault: false };
            }
            return a;
          })
        );
      } else {
        const res = await createAddressAction({
          street,
          city,
          state: stateVal,
          postalCode,
          country,
          phone,
          lat,
          lng,
          isDefault,
        });

        if (!res.success || !res.address) {
          setModalError(res.error || "Failed to add address.");
          return;
        }

        const newAddr: SerializedAddress = {
          id: res.address.id,
          street: res.address.street,
          city: res.address.city,
          state: res.address.state,
          postalCode: res.address.postalCode,
          country: res.address.country,
          phone: res.address.phone,
          lat: res.address.lat,
          lng: res.address.lng,
          isDefault: res.address.isDefault,
        };

        setAddressList((prev) => {
          const updated = isDefault
            ? prev.map((a) => ({ ...a, isDefault: false }))
            : [...prev];
          return isDefault ? [newAddr, ...updated] : [...updated, newAddr];
        });
      }

      setIsAddressModalOpen(false);
    } catch (err: any) {
      setModalError(err.message || "An error occurred while saving.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetDefault = async (id: string) => {
    setActionLoadingId(id);
    try {
      const res = await setDefaultAddressAction(id);
      if (res.success) {
        setAddressList((prev) =>
          prev.map((a) => ({
            ...a,
            isDefault: a.id === id,
          }))
        );
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this address?")) return;
    setActionLoadingId(id);
    try {
      const res = await deleteAddressAction(id);
      if (res.success) {
        setAddressList((prev) => {
          const remaining = prev.filter((a) => a.id !== id);
          const wasDefault = prev.find((a) => a.id === id)?.isDefault;
          if (wasDefault && remaining.length > 0) {
            remaining[0] = { ...remaining[0], isDefault: true };
          }
          return remaining;
        });
      } else {
        alert(res.error || "Failed to delete address.");
      }
    } catch (err: any) {
      alert(err.message || "Failed to delete address.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const lifetimeProcurement = useMemo(() => {
    return orders.reduce((sum, ord) => sum + ord.totalAmount, 0);
  }, [orders]);

  const activeInTransit = useMemo(() => {
    return orders.filter((o) => o.status === "SHIPPED").length;
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (orderFilter === "transit") return o.status === "SHIPPED";
      if (orderFilter === "delivered") return o.status === "PAID";
      return true;
    });
  }, [orders, orderFilter]);

  return (
    <div className="flex flex-col min-h-screen bg-surface">
      <Header />

      <main className="w-full pt-[60px] min-h-[calc(100vh-140px)] bg-surface">
        <div className="flex flex-col w-full">
          {/* Account Portal Header & Quick Summary Banner */}
          <section className="w-full border-b border-outline-variant bg-surface-container-lowest py-8 px-4 sm:px-8">
            <div className="max-w-[1600px] mx-auto flex flex-col gap-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="font-headline-lg text-2xl font-bold tracking-tight text-on-surface">
                      Customer Account
                    </h1>
                    <span className={`font-mono text-[11px] px-2.5 py-0.5 rounded font-bold uppercase border ${
                      isAuthenticated
                        ? "bg-secondary/10 border-secondary/40 text-secondary"
                        : "bg-surface-container-highest border-outline-variant text-on-surface-variant"
                    }`}>
                      {isAuthenticated ? "VERIFIED ACCOUNT" : "GUEST PREVIEW"}
                    </span>
                  </div>
                  <p className="font-body-md text-sm text-on-surface-variant mt-1">
                    {isAuthenticated ? (
                      <>
                        Signed in as <span className="font-mono text-on-surface font-semibold">{user.email}</span> ({user.name})
                      </>
                    ) : (
                      "Manage your hardware allocation orders and delivery addresses."
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  {isAuthenticated ? (
                    <button
                      onClick={async () => {
                        const { logoutAction } = await import("@/actions/auth");
                        await logoutAction();
                      }}
                      className="h-9 px-4 bg-surface-container-lowest border border-outline-variant hover:bg-red-500/10 hover:border-red-500/40 text-on-surface hover:text-red-500 font-headline-sm text-xs flex items-center gap-2 rounded transition-colors cursor-pointer"
                      type="button"
                      title="Terminate Authenticated Session"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        logout
                      </span>
                      <span className="font-label-sm text-label-sm uppercase font-mono font-bold">
                        Sign Out
                      </span>
                    </button>
                  ) : (
                    <Link
                      href="/login"
                      className="h-9 px-4 bg-primary hover:bg-primary-container text-on-primary font-headline-sm text-xs flex items-center gap-2 rounded transition-colors"
                      title="Authenticate Client Identity"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        login
                      </span>
                      <span className="font-label-sm text-label-sm uppercase font-mono font-bold">
                        Sign In
                      </span>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Segmented Tabs Navigation Bar */}
          <section className="w-full bg-surface-container-lowest border-b border-outline-variant sticky top-[60px] z-30 font-mono">
            <div className="max-w-[1600px] mx-auto px-4 sm:px-8">
              <div className="flex items-center space-x-2 sm:space-x-6 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab("orders")}
                  className={`flex items-center gap-2.5 py-3.5 px-3 border-b-2 font-headline-sm text-xs uppercase transition-all shrink-0 cursor-pointer ${
                    activeTab === "orders"
                      ? "border-primary text-primary font-bold"
                      : "border-transparent text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    inventory_2
                  </span>
                  <span>Order History</span>
                  <span className="font-label-sm text-[10px] bg-primary text-on-primary px-1.5 py-0.5 rounded font-bold">
                    {orders.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("docks")}
                  className={`flex items-center gap-2.5 py-3.5 px-3 border-b-2 font-headline-sm text-xs uppercase transition-all shrink-0 cursor-pointer ${
                    activeTab === "docks"
                      ? "border-primary text-primary font-bold"
                      : "border-transparent text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    location_on
                  </span>
                  <span>Saved Addresses</span>
                  <span className="font-label-sm text-[10px] bg-surface-container-high text-on-surface-variant px-1.5 py-0.5 rounded font-bold">
                    {addressList.length}
                  </span>
                </button>
              </div>
            </div>
          </section>

          {/* Main Viewport Workspace Container */}
          <section className="w-full max-w-[1600px] mx-auto px-4 sm:px-8 py-8">
            {activeTab === "orders" && (
              <div className="space-y-6">
                {/* Filter Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-surface-container-lowest p-4 rounded border border-outline-variant text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-on-surface-variant font-medium mr-1">
                      Filter:
                    </span>
                    <button
                      type="button"
                      onClick={() => setOrderFilter("all")}
                      className={`px-3 py-1 rounded cursor-pointer transition-colors ${
                        orderFilter === "all"
                          ? "bg-primary text-on-primary font-bold"
                          : "bg-surface-container-low hover:bg-surface-container text-on-surface border border-outline-variant"
                      }`}
                    >
                      All ({orders.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderFilter("transit")}
                      className={`px-3 py-1 rounded cursor-pointer transition-colors ${
                        orderFilter === "transit"
                          ? "bg-primary text-on-primary font-bold"
                          : "bg-surface-container-low hover:bg-surface-container text-on-surface border border-outline-variant"
                      }`}
                    >
                      In Transit ({activeInTransit})
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderFilter("delivered")}
                      className={`px-3 py-1 rounded cursor-pointer transition-colors ${
                        orderFilter === "delivered"
                          ? "bg-primary text-on-primary font-bold"
                          : "bg-surface-container-low hover:bg-surface-container text-on-surface border border-outline-variant"
                      }`}
                    >
                      Delivered ({orders.length - activeInTransit})
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-on-surface-variant font-mono">
                    <span className="material-symbols-outlined text-[16px] text-secondary">
                      local_shipping
                    </span>
                    <span>Live Tracking Updates</span>
                  </div>
                </div>

                {filteredOrders.length === 0 && (
                  <div className="bg-surface-container-lowest border border-outline-variant rounded p-8 text-center text-sm text-on-surface-variant">
                    No orders match the selected filter.
                  </div>
                )}

                {filteredOrders.map((order) => {
                  const isInTransit = order.status === "SHIPPED";
                  return (
                    <article
                      key={order.id}
                      className={`bg-surface-container-lowest rounded-lg overflow-hidden shadow-sm border ${
                        isInTransit ? "border-2 border-primary" : "border-outline-variant"
                      }`}
                    >
                      <div className="bg-surface-container-low px-6 py-4 border-b border-outline-variant flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-sm text-on-surface">
                            Order #{order.orderNumber}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded font-bold uppercase text-[10px] tracking-wider ${
                              isInTransit
                                ? "bg-primary text-on-primary"
                                : "bg-surface-container-high text-on-surface-variant"
                            }`}
                          >
                            {isInTransit ? "IN TRANSIT" : order.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-on-surface-variant">
                          <span>Ordered on {order.createdAt}</span>
                          <span className="text-outline-variant">•</span>
                          <span className="font-bold text-on-surface">
                            Total: ${order.totalAmount.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      <div className="p-6 space-y-4">
                        <div className="p-3 bg-surface-container-low rounded border border-outline-variant text-xs text-on-surface-variant flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <strong className="text-on-surface">Delivering to:</strong> {order.destination}
                          </div>
                          <span className="text-[11px] text-primary font-semibold">
                            Estimated delivery: Today
                          </span>
                        </div>

                        <div className="divide-y divide-surface-container-highest">
                          {order.items.map((item) => (
                            <div key={item.id} className="py-2.5 flex items-center justify-between text-xs">
                              <div>
                                <span className="font-semibold text-on-surface">
                                  {item.quantity}x {item.title}
                                </span>
                                <span className="text-on-surface-variant font-mono ml-2">
                                  ({item.sku})
                                </span>
                              </div>
                              <span className="font-mono font-bold text-on-surface">
                                ${(item.price * item.quantity).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>

                        <div className="flex gap-3 pt-2">
                          <Link
                            href={`/order-confirmation?orderId=${order.id}`}
                            className="px-4 py-2 bg-primary hover:bg-primary-container text-on-primary rounded text-xs font-semibold transition-colors"
                          >
                            View Order Details
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {activeTab === "docks" && (
              <div className="space-y-6">
                {/* Address Management Bar */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-surface-container-lowest p-5 rounded-lg border border-outline-variant shadow-sm">
                  <div>
                    <h2 className="text-base font-bold text-on-surface">Delivery Addresses</h2>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      Manage your saved shipping locations. Your default address is used automatically at checkout.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenAdd}
                    className="px-4 py-2.5 bg-primary hover:bg-primary-container text-on-primary rounded-md text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-sm shrink-0"
                  >
                    <span className="material-symbols-outlined text-[18px]">add_location_alt</span>
                    <span>Add New Address</span>
                  </button>
                </div>

                {/* Empty State */}
                {addressList.length === 0 && (
                  <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-12 text-center max-w-lg mx-auto">
                    <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                      <span className="material-symbols-outlined text-[24px]">location_off</span>
                    </div>
                    <h3 className="text-base font-bold text-on-surface mb-1">No saved addresses yet</h3>
                    <p className="text-xs text-on-surface-variant mb-5">
                      Add your shipping address so you can breeze through checkout.
                    </p>
                    <button
                      type="button"
                      onClick={handleOpenAdd}
                      className="px-4 py-2 bg-primary hover:bg-primary-container text-on-primary rounded-md text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">add</span>
                      <span>Add Address</span>
                    </button>
                  </div>
                )}

                {/* Address Cards Grid */}
                {addressList.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                    {addressList.map((addr, idx) => (
                      <div
                        key={addr.id}
                        className={`bg-surface-container-lowest border rounded-xl p-6 flex flex-col justify-between shadow-sm transition-all ${
                          addr.isDefault
                            ? "border-primary ring-1 ring-primary/20 bg-surface-container-lowest"
                            : "border-outline-variant"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between pb-3 border-b border-outline-variant mb-4">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-on-surface text-sm">
                                {addr.city ? `${addr.city} Address` : `Address ${idx + 1}`}
                              </span>
                              {typeof addr.lat === "number" && typeof addr.lng === "number" && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded font-medium">
                                  <span className="material-symbols-outlined text-[12px]">pin_drop</span>
                                  <span>Map Pinned</span>
                                </span>
                              )}
                            </div>
                            {addr.isDefault && (
                              <span className="px-2.5 py-0.5 bg-secondary text-white rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                                <span className="material-symbols-outlined text-[12px]">check_circle</span>
                                <span>Default Address</span>
                              </span>
                            )}
                          </div>

                          <div className="text-on-surface-variant leading-relaxed space-y-1 text-sm">
                            <p className="font-semibold text-on-surface">{user.name}</p>
                            <p>{addr.street}</p>
                            <p>
                              {addr.city}
                              {addr.state ? `, ${addr.state}` : ""}
                              {addr.postalCode ? ` ${addr.postalCode}` : ""}
                            </p>
                            <p className="text-xs text-on-surface-variant">{addr.country}</p>
                            {addr.phone && (
                              <p className="text-xs text-on-surface-variant flex items-center gap-1.5 pt-0.5">
                                <span className="material-symbols-outlined text-[13px] text-primary">call</span>
                                <span>{addr.phone}</span>
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Card Action Buttons */}
                        <div className="mt-6 pt-4 border-t border-outline-variant flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(addr)}
                              disabled={actionLoadingId === addr.id}
                              className="px-3 py-1.5 bg-surface-container-low hover:bg-surface-container-high border border-outline-variant text-on-surface rounded text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                            >
                              <span className="material-symbols-outlined text-[14px]">edit</span>
                              <span>Edit</span>
                            </button>

                            {!addr.isDefault && (
                              <button
                                type="button"
                                onClick={() => handleSetDefault(addr.id)}
                                disabled={actionLoadingId === addr.id}
                                className="px-3 py-1.5 bg-surface-container-lowest hover:bg-surface-container-low border border-outline-variant text-on-surface-variant hover:text-on-surface rounded text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                              >
                                <span className="material-symbols-outlined text-[14px]">check</span>
                                <span>Set as Default</span>
                              </button>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteAddress(addr.id)}
                            disabled={actionLoadingId === addr.id}
                            className="p-1.5 text-on-surface-variant hover:text-red-500 hover:bg-red-500/10 rounded transition-colors cursor-pointer disabled:opacity-50"
                            title="Delete Address"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Add / Edit Address Modal Dialog */}
          {isAddressModalOpen && (
            <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-150">
                {/* Modal Header */}
                <div className="sticky top-0 z-20 p-5 border-b border-outline-variant bg-surface-container-low/95 backdrop-blur flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-on-surface">
                      {editingAddress ? "Edit Address" : "Add New Address"}
                    </h3>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      {editingAddress
                        ? "Update your shipping address or pick a new spot on the map."
                        : "Use your GPS location, drop a pin on the map, or fill manually."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddressModalOpen(false)}
                    className="p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px]">close</span>
                  </button>
                </div>

                {/* Modal Form */}
                <form onSubmit={handleSaveAddress} className="p-6 space-y-4 text-xs">
                  {modalError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 text-xs">
                      {modalError}
                    </div>
                  )}

                  {/* Mode Selector Tabs */}
                  <div className="grid grid-cols-2 gap-2 p-1 bg-surface-container rounded-lg border border-outline-variant">
                    <button
                      type="button"
                      onClick={() => setPickerMode("map")}
                      className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                        pickerMode === "map"
                          ? "bg-primary text-on-primary shadow-sm"
                          : "text-on-surface-variant hover:text-on-surface"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">map</span>
                      <span>Pick on Map / GPS</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPickerMode("manual")}
                      className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                        pickerMode === "manual"
                          ? "bg-primary text-on-primary shadow-sm"
                          : "text-on-surface-variant hover:text-on-surface"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">edit_note</span>
                      <span>Manual Details</span>
                    </button>
                  </div>

                  {/* Map Picker if in map mode */}
                  {pickerMode === "map" && (
                    <div className="space-y-2">
                      <AddressMapPicker
                        initialLat={lat || 30.0444}
                        initialLng={lng || 31.2357}
                        onLocationSelect={handleLocationSelect}
                      />
                      <p className="text-[11px] text-on-surface-variant italic">
                        Tip: Street and city details auto-populate when moving the pin or clicking the map.
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block font-semibold text-on-surface mb-1">
                      Street Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 15 Tahrir Square, Downtown"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-md text-on-surface text-xs focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-on-surface mb-1">
                        City <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Cairo"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-md text-on-surface text-xs focus:outline-none focus:border-primary transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-on-surface mb-1">
                        State / Province
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Cairo Governorate"
                        value={stateVal}
                        onChange={(e) => setStateVal(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-md text-on-surface text-xs focus:outline-none focus:border-primary transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-on-surface mb-1">
                        Postal / ZIP Code
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 11511"
                        value={postalCode}
                        onChange={(e) => setPostalCode(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-md text-on-surface text-xs focus:outline-none focus:border-primary transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-on-surface mb-1">
                        Country
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Egypt"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-md text-on-surface text-xs focus:outline-none focus:border-primary transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-on-surface mb-1">
                      Phone Number (For Delivery Contact) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. +20 10 1234 5678"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-md text-on-surface text-xs focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>

                  <div className="pt-2">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isDefault}
                        onChange={(e) => setIsDefault(e.target.checked)}
                        className="w-4 h-4 rounded text-primary border-outline-variant focus:ring-0 cursor-pointer"
                      />
                      <span className="text-xs text-on-surface font-medium">
                        Set as default shipping address
                      </span>
                    </label>
                  </div>

                  {/* Modal Footer Actions */}
                  <div className="pt-4 border-t border-outline-variant flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setIsAddressModalOpen(false)}
                      disabled={submitting}
                      className="px-4 py-2 bg-surface-container-low hover:bg-surface-container-high border border-outline-variant text-on-surface rounded-md text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-5 py-2 bg-primary hover:bg-primary-container text-on-primary rounded-md text-xs font-bold transition-colors cursor-pointer shadow-sm flex items-center gap-2 disabled:opacity-50"
                    >
                      {submitting ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <span>{editingAddress ? "Update Address" : "Save Address"}</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
