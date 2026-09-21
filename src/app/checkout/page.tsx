"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { useCart } from "@/context/CartContext";
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

interface SavedAddress {
  id: string;
  street: string;
  city: string;
  state: string | null;
  postalCode: string | null;
  country: string;
  phone: string | null;
  lat: number;
  lng: number;
  isDefault: boolean;
}

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cart = useCart();

  const isCancelled = searchParams.get("cancelled") === "true";
  const cancelledOrderId = searchParams.get("orderId");
  const [cancelProcessed, setCancelProcessed] = useState(false);

  useEffect(() => {
    if (isCancelled && cancelledOrderId && !cancelProcessed) {
      setCancelProcessed(true);
      toast.warning("Checkout Incomplete", {
        description:
          "You returned from payment without completing the transaction. Your items are still safely saved in your cart.",
      });
      import("@/actions/checkout").then(({ cancelPendingOrderAction }) => {
        cancelPendingOrderAction(cancelledOrderId);
      });
    }
  }, [isCancelled, cancelledOrderId, cancelProcessed]);

  const [freightMethod, setFreightMethod] = useState<"priority" | "dedicated">(
    "priority"
  );
  const [paymentMethod, setPaymentMethod] = useState<"card" | "po">("card");
  const [esdPackaging, setEsdPackaging] = useState(true);
  const [nitrogenPurge, setNitrogenPurge] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Contact inputs
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [facility, setFacility] = useState("");

  // Saved Addresses State
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(true);

  // Selected Address Details (sent with order)
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postal, setPostal] = useState("");
  const [phone, setPhone] = useState("");

  // Modal State for Adding New Address
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalStreet, setModalStreet] = useState("");
  const [modalCity, setModalCity] = useState("");
  const [modalState, setModalState] = useState("");
  const [modalPostal, setModalPostal] = useState("");
  const [modalCountry, setModalCountry] = useState("Egypt");
  const [modalPhone, setModalPhone] = useState("");
  const [modalLat, setModalLat] = useState<number | undefined>(undefined);
  const [modalLng, setModalLng] = useState<number | undefined>(undefined);
  const [modalIsDefault, setModalIsDefault] = useState(false);
  const [modalPickerMode, setModalPickerMode] = useState<"map" | "manual">("map");
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Load User Data & Saved Addresses
  useEffect(() => {
    async function initCheckout() {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();

        if (!data.user) {
          router.push("/login?returnTo=/checkout");
          return;
        }

        if (data.user.email) setEmail(data.user.email);
        if (data.user.user_metadata?.full_name) {
          setFullName(data.user.user_metadata.full_name);
        } else if (data.user.user_metadata?.name) {
          setFullName(data.user.user_metadata.name);
        }

        // Fetch User Addresses
        const { getUserAddressesAction } = await import("@/actions/address");
        const res = await getUserAddressesAction();

        if (res.success && res.addresses && res.addresses.length > 0) {
          setAddresses(res.addresses as SavedAddress[]);

          // Pre-select default address if available, otherwise first address
          const defaultAddr =
            res.addresses.find((a: any) => a.isDefault) || res.addresses[0];

          selectAddress(defaultAddr as SavedAddress);
        }
      } catch (err) {
        console.error("Auth / Address fetch error:", err);
      } finally {
        setIsLoadingAddresses(false);
      }
    }

    initCheckout();
  }, [router]);

  const selectAddress = (addr: SavedAddress) => {
    setSelectedAddressId(addr.id);
    setStreet(addr.street);
    setCity(addr.city);
    setState(addr.state || "");
    setPostal(addr.postalCode || "");
    if (addr.phone) setPhone(addr.phone);
  };

  const handleOpenAddModal = () => {
    setModalStreet("");
    setModalCity("");
    setModalState("");
    setModalPostal("");
    setModalCountry("");
    setModalPhone(phone || "");
    setModalLat(undefined);
    setModalLng(undefined);
    setModalIsDefault(addresses.length === 0);
    setModalPickerMode("map");
    setModalError(null);
    setIsAddModalOpen(true);
  };

  const handleLocationSelect = (loc: SelectedLocation) => {
    if (loc.street) setModalStreet(loc.street);
    if (loc.city) setModalCity(loc.city);
    if (loc.state) setModalState(loc.state);
    if (loc.postalCode) setModalPostal(loc.postalCode);
    if (loc.country) setModalCountry(loc.country);
    setModalLat(loc.lat);
    setModalLng(loc.lng);
  };

  const handleSaveNewAddress = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!modalStreet.trim() || !modalCity.trim()) {
      setModalError("Please provide both street address and city.");
      return;
    }

    if (!modalPhone.trim()) {
      setModalError("Phone number is required for delivery contact.");
      return;
    }

    setModalSubmitting(true);
    setModalError(null);

    try {
      const { createAddressAction } = await import("@/actions/address");
      const res = await createAddressAction({
        street: modalStreet,
        city: modalCity,
        state: modalState,
        postalCode: modalPostal,
        country: modalCountry || "Egypt",
        phone: modalPhone,
        lat: modalLat,
        lng: modalLng,
        isDefault: modalIsDefault,
      });

      if (!res.success || !res.address) {
        setModalError(res.error || "Failed to save address.");
        toast.error("Address Error", {
          description: res.error || "Failed to save address.",
        });
        return;
      }

      const newAddr = res.address as SavedAddress;

      // Update address list and automatically select the new address
      setAddresses((prev) => {
        const updated = modalIsDefault
          ? prev.map((a) => ({ ...a, isDefault: false }))
          : [...prev];
        return [newAddr, ...updated];
      });

      selectAddress(newAddr);
      setIsAddModalOpen(false);
      toast.success("Address Saved", {
        description: "New shipping address was added and selected.",
      });
    } catch (err: any) {
      const errMsg = err.message || "An unexpected error occurred.";
      setModalError(errMsg);
      toast.error("Address Save Failed", { description: errMsg });
    } finally {
      setModalSubmitting(false);
    }
  };

  const freightCost = freightMethod === "dedicated" ? 45.0 : 0.0;
  const grandTotal = cart.subtotal + freightCost;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (cart.items.length === 0) {
      toast.error("Cart is Empty", {
        description: "Please add hardware products before checking out.",
      });
      return;
    }

    if (!street || !city) {
      toast.error("Delivery Address Missing", {
        description: "Please select or add a shipping address to proceed.",
      });
      return;
    }

    if (!phone) {
      toast.error("Contact Phone Required", {
        description: "Please provide a contact phone number for dispatch verification.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { submitDirectOrderAction } = await import("@/actions/checkout");
      const res = await submitDirectOrderAction({
        name: fullName,
        email,
        phone,
        street,
        city,
        state,
        postalCode: postal,
        addressId: selectedAddressId || undefined,
        paymentMethod,
        freightMethod,
        items: cart.items.map((i) => ({
          sku: i.sku,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
        })),
      });

      if (res.stripeUrl) {
        // Do NOT clear cart before payment is confirmed; order-confirmation will clear upon verified payment
        window.location.href = res.stripeUrl;
      } else {
        cart.clearCart();
        toast.success("Order Placed Successfully", {
          description: "Your direct dispatch order has been scheduled.",
        });
        router.push(`/order-confirmation?orderId=${res.orderId}`);
      }
    } catch (err: any) {
      toast.error("Order Reservation Failed", {
        description: err.message || "Failed to process order. Please try again.",
      });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-surface text-on-surface font-body-md min-h-screen flex flex-col antialiased">
      {/* Header */}
      <header className="border-b border-outline-variant bg-surface-container-lowest sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="font-label-md text-label-md tracking-tight font-bold text-primary flex items-center gap-2 uppercase"
            >
              <span>KILOHERTZ // HARDWARE</span>
            </Link>
          </div>

          <div className="flex items-center gap-6 text-xs font-mono">
            <Link
              href="/"
              className="text-on-surface-variant hover:text-primary flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">
                arrow_back
              </span>
              <span>Return to Catalog</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Checkout Progress Bar */}
      <div className="bg-surface-container-low border-b border-outline-variant py-2.5 px-4 sm:px-8 font-mono">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between text-[11px] tracking-wider text-on-surface-variant uppercase">
          <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
            <span className="text-primary font-bold flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-primary text-on-primary flex items-center justify-center text-[10px]">
                1
              </span>
              Contact & Shipping
            </span>
            <span className="text-outline-variant">/</span>
            <span className="text-primary font-bold flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-primary text-on-primary flex items-center justify-center text-[10px]">
                2
              </span>
              Delivery Options
            </span>
            <span className="text-outline-variant">/</span>
            <span className="text-primary font-bold flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-primary text-on-primary flex items-center justify-center text-[10px]">
                3
              </span>
              Payment & Review
            </span>
          </div>
        </div>
      </div>

      {/* Main Checkout Workspace */}
      <main className="flex-1 max-w-[1600px] mx-auto w-full px-4 sm:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Form */}
          <section className="lg:col-span-7 space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {isCancelled && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 animate-fade-in">
                  <span className="material-symbols-outlined text-amber-400 text-xl shrink-0 mt-0.5">
                    info
                  </span>
                  <div className="text-xs">
                    <p className="font-bold uppercase tracking-wide">
                      Checkout Not Completed
                    </p>
                    <p className="mt-1">
                      You returned from payment without completing the transaction. Your items are still safely saved in your cart below. You can choose Cash on Delivery or try Card checkout again.
                    </p>
                  </div>
                </div>
              )}
              {/* UNIFIED PANEL 1: Contact & Delivery Address */}
              <div className="border border-outline-variant rounded-xl bg-surface-container-lowest p-6 space-y-6 shadow-sm">
                <div className="flex items-center justify-between pb-4 border-b border-outline-variant">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold font-mono">
                      1
                    </span>
                    <h2 className="text-sm font-bold text-on-surface uppercase tracking-tight">
                      Contact & Shipping Address
                    </h2>
                  </div>
                  <span className="text-[11px] text-on-surface-variant font-mono">
                    Order details & delivery location
                  </span>
                </div>

                {/* Contact Information */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                    Recipient Information
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                    <div>
                      <label className="block uppercase text-on-surface-variant mb-1 font-semibold text-[11px]">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Yousef Nasr"
                        className="w-full h-10 px-3 bg-surface-container-low border border-outline-variant rounded text-on-surface focus:outline-none focus:border-secondary"
                      />
                    </div>

                    <div>
                      <label className="block uppercase text-on-surface-variant mb-1 font-semibold text-[11px]">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. name@domain.com"
                        className="w-full h-10 px-3 bg-surface-container-low border border-outline-variant rounded text-on-surface focus:outline-none focus:border-secondary"
                      />
                    </div>
                  </div>
                </div>

                {/* Delivery Address Selection */}
                <div className="pt-4 border-t border-outline-variant space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface">
                        Shipping Address
                      </h3>
                      <p className="text-[11px] text-on-surface-variant">
                        Select a saved address or add a new one for this order.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleOpenAddModal}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-md text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">add_location_alt</span>
                      <span>+ Add New Address</span>
                    </button>
                  </div>

                  {isLoadingAddresses ? (
                    <div className="p-8 text-center text-xs text-on-surface-variant">
                      <span className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin inline-block mr-2" />
                      Loading your saved addresses...
                    </div>
                  ) : addresses.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {addresses.map((addr) => {
                        const isSelected = selectedAddressId === addr.id;
                        return (
                          <div
                            key={addr.id}
                            onClick={() => selectAddress(addr)}
                            className={`p-4 rounded-lg border transition-all cursor-pointer relative flex flex-col justify-between ${
                              isSelected
                                ? "border-primary bg-primary/5 ring-1 ring-primary shadow-sm"
                                : "border-outline-variant bg-surface-container-low hover:border-outline"
                            }`}
                          >
                            <div>
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="radio"
                                    name="checkout_selected_address"
                                    checked={isSelected}
                                    onChange={() => selectAddress(addr)}
                                    className="w-4 h-4 text-primary focus:ring-0 cursor-pointer"
                                  />
                                  <span className="font-bold text-xs text-on-surface">
                                    {addr.city ? `${addr.city} Address` : "Shipping Address"}
                                  </span>
                                </div>
                                {addr.isDefault && (
                                  <span className="px-2 py-0.5 bg-secondary text-white rounded-full text-[9px] font-bold uppercase tracking-wider">
                                    Default
                                  </span>
                                )}
                              </div>

                              <div className="text-xs text-on-surface-variant space-y-0.5 pl-6 font-mono">
                                <p className="text-on-surface font-semibold">{addr.street}</p>
                                <p>
                                  {addr.city}
                                  {addr.state ? `, ${addr.state}` : ""}
                                  {addr.postalCode ? ` ${addr.postalCode}` : ""}
                                </p>
                                <p className="text-[11px]">{addr.country}</p>
                                {addr.phone && (
                                  <p className="text-primary font-semibold flex items-center gap-1 text-[11px] pt-1">
                                    <span className="material-symbols-outlined text-[13px]">call</span>
                                    <span>{addr.phone}</span>
                                  </p>
                                )}
                              </div>
                            </div>

                            {isSelected && (
                              <div className="mt-3 pt-2 border-t border-primary/20 flex items-center gap-1.5 text-[10px] text-primary font-bold uppercase tracking-wider pl-6">
                                <span className="material-symbols-outlined text-[14px]">check_circle</span>
                                <span>Selected for this delivery</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-6 border border-dashed border-outline-variant rounded-lg bg-surface-container-low text-center space-y-2">
                      <span className="material-symbols-outlined text-3xl text-on-surface-variant">location_off</span>
                      <p className="text-xs text-on-surface font-semibold">No saved addresses on file</p>
                      <p className="text-[11px] text-on-surface-variant">
                        Add an address using GPS or the interactive map to proceed with checkout.
                      </p>
                      <button
                        type="button"
                        onClick={handleOpenAddModal}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-on-primary rounded text-xs font-bold transition-colors cursor-pointer mt-2"
                      >
                        <span className="material-symbols-outlined text-[16px]">add_location_alt</span>
                        <span>Add Delivery Address</span>
                      </button>
                    </div>
                  )}

                  {/* Active Delivery Summary */}
                  {selectedAddressId && (
                    <div className="p-3 bg-surface-container-low rounded-lg border border-outline-variant flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-2 truncate">
                        <span className="material-symbols-outlined text-primary text-[18px]">local_shipping</span>
                        <span className="text-on-surface-variant">Shipping to:</span>
                        <span className="text-on-surface font-semibold truncate">{street}, {city}</span>
                        {phone && <span className="text-primary truncate">({phone})</span>}
                      </div>
                      <button
                        type="button"
                        onClick={handleOpenAddModal}
                        className="text-primary text-[11px] font-bold hover:underline shrink-0 ml-2"
                      >
                        Add Another
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION 2: Shipping Method */}
              <div className="border border-outline-variant rounded-xl bg-surface-container-lowest p-6 shadow-sm">
                <div className="flex items-center justify-between pb-4 mb-5 border-b border-outline-variant">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold font-mono">
                      2
                    </span>
                    <h2 className="text-sm font-bold text-on-surface uppercase tracking-tight">
                      Shipping Method
                    </h2>
                  </div>
                  <span className="text-[11px] text-secondary font-bold font-mono">
                    TRACKED & INSURED
                  </span>
                </div>

                <div className="space-y-3 font-mono">
                  {/* Option 1: Standard */}
                  <label
                    onClick={() => setFreightMethod("priority")}
                    className={`flex items-start justify-between p-3.5 rounded border cursor-pointer transition-colors ${
                      freightMethod === "priority"
                        ? "border-primary bg-surface-container-low"
                        : "border-outline-variant bg-surface-container-lowest hover:bg-surface-container-low/50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        checked={freightMethod === "priority"}
                        onChange={() => setFreightMethod("priority")}
                        className="mt-0.5 accent-primary cursor-pointer"
                      />
                      <div>
                        <div className="font-headline-sm text-xs font-bold text-on-surface">
                          Standard Shipping (Insured)
                        </div>
                        <div className="text-[11px] text-on-surface-variant mt-0.5">
                          Estimated delivery in 2-3 business days • Tracking included
                        </div>
                      </div>
                    </div>
                    <span className="font-metric-tabular font-bold text-secondary text-xs">
                      FREE
                    </span>
                  </label>

                  {/* Option 2: Express */}
                  <label
                    onClick={() => setFreightMethod("dedicated")}
                    className={`flex items-start justify-between p-3.5 rounded border cursor-pointer transition-colors ${
                      freightMethod === "dedicated"
                        ? "border-primary bg-surface-container-low"
                        : "border-outline-variant bg-surface-container-lowest hover:bg-surface-container-low/50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        checked={freightMethod === "dedicated"}
                        onChange={() => setFreightMethod("dedicated")}
                        className="mt-0.5 accent-primary cursor-pointer"
                      />
                      <div>
                        <div className="font-headline-sm text-xs font-bold text-on-surface">
                          Express Overnight Delivery
                        </div>
                        <div className="text-[11px] text-on-surface-variant mt-0.5">
                          Next business day delivery • Signature required
                        </div>
                      </div>
                    </div>
                    <span className="font-metric-tabular font-bold text-on-surface text-xs">
                      $45.00
                    </span>
                  </label>

                  {/* Packaging Options */}
                  <div className="pt-3 border-t border-surface-container space-y-2 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer text-on-surface">
                      <input
                        type="checkbox"
                        checked={esdPackaging}
                        onChange={(e) => setEsdPackaging(e.target.checked)}
                        className="accent-primary cursor-pointer"
                      />
                      <span>Protective anti-static packaging (Recommended)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-on-surface">
                      <input
                        type="checkbox"
                        checked={nitrogenPurge}
                        onChange={(e) => setNitrogenPurge(e.target.checked)}
                        className="accent-primary cursor-pointer"
                      />
                      <span>Tamper-evident security seal & premium padding</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* SECTION 3: Payment Method */}
              <div className="border border-outline-variant rounded-xl bg-surface-container-lowest p-6 shadow-sm">
                <div className="flex items-center justify-between pb-4 mb-5 border-b border-outline-variant">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold font-mono">
                      3
                    </span>
                    <h2 className="text-sm font-bold text-on-surface uppercase tracking-tight">
                      Payment Method
                    </h2>
                  </div>
                  <span className="text-[11px] text-on-surface-variant uppercase font-mono">
                    SECURE 256-BIT ENCRYPTION
                  </span>
                </div>

                <div className="space-y-4 font-mono">
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("po")}
                      className={`p-3.5 rounded-lg border text-left cursor-pointer transition-colors ${
                        paymentMethod === "po"
                          ? "border-primary bg-surface-container-high text-on-surface font-semibold shadow-sm"
                          : "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low"
                      }`}
                    >
                      <div className="flex items-center gap-2 text-xs font-bold">
                        <span className="material-symbols-outlined text-[18px] text-secondary">
                          payments
                        </span>
                        <span>Cash on Delivery</span>
                      </div>
                      <p className="text-[10px] text-on-surface-variant mt-1">
                        Pay in cash upon physical arrival
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod("card")}
                      className={`p-3.5 rounded-lg border text-left cursor-pointer transition-colors ${
                        paymentMethod === "card"
                          ? "border-primary bg-surface-container-high text-on-surface font-semibold shadow-sm"
                          : "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low"
                      }`}
                    >
                      <div className="flex items-center gap-2 text-xs font-bold">
                        <span className="material-symbols-outlined text-[18px] text-primary">
                          credit_card
                        </span>
                        <span>Credit / Debit Card</span>
                      </div>
                      <p className="text-[10px] text-on-surface-variant mt-1">
                        Secure Stripe Checkout
                      </p>
                    </button>
                  </div>

                  {paymentMethod === "card" ? (
                    <div className="p-4 bg-surface-container-low border border-outline-variant rounded-lg space-y-2 text-xs">
                      <div className="flex items-center gap-2 text-on-surface font-semibold">
                        <span className="material-symbols-outlined text-primary text-[18px]">lock</span>
                        <span>Stripe Encrypted Checkout</span>
                      </div>
                      <p className="text-on-surface-variant text-[11px] leading-relaxed">
                        Clicking the button below will immediately redirect you to Stripe to complete your credit or debit card payment securely.
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 bg-surface-container-low border border-outline-variant rounded-lg space-y-2 text-xs">
                      <div className="flex items-center gap-2 text-on-surface font-semibold">
                        <span className="material-symbols-outlined text-secondary text-[18px]">payments</span>
                        <span>Pay in cash upon delivery</span>
                      </div>
                      <p className="text-on-surface-variant text-[11px] leading-relaxed">
                        Our courier will collect payment in cash when delivering your order to your verified address.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Order Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || cart.items.length === 0}
                  className="w-full py-3.5 px-6 bg-primary hover:bg-primary/90 text-on-primary font-bold text-sm rounded-xl uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>
                        {paymentMethod === "card"
                          ? "Connecting to Stripe..."
                          : "Processing Order..."}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">
                        {paymentMethod === "card" ? "open_in_new" : "lock"}
                      </span>
                      <span>
                        {paymentMethod === "card"
                          ? `Proceed to Stripe • $${grandTotal.toFixed(2)}`
                          : `Place Order (Cash on Delivery) • $${grandTotal.toFixed(2)}`}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>

          {/* Right Column: Order Summary */}
          <aside className="lg:col-span-5 space-y-6">
            <div className="border border-outline-variant rounded-xl bg-surface-container-lowest p-6 shadow-sm sticky top-24">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-outline-variant">
                <h2 className="text-sm font-bold text-on-surface uppercase tracking-tight">
                  Order Summary
                </h2>
                <span className="text-xs text-on-surface-variant font-mono">
                  {cart.items.reduce((sum, i) => sum + i.quantity, 0)} items
                </span>
              </div>

              {/* Items list */}
              <div className="divide-y divide-outline-variant/60 max-h-80 overflow-y-auto pr-1">
                {cart.items.map((item) => (
                  <div key={item.sku} className="py-3 flex items-start gap-3 text-xs">
                    <div className="w-12 h-12 rounded bg-surface-container-low border border-outline-variant flex items-center justify-center p-1 shrink-0">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <span className="material-symbols-outlined text-on-surface-variant text-[20px]">
                          memory
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-on-surface truncate">{item.name}</p>
                      <p className="text-[11px] text-on-surface-variant font-mono">
                        Qty: {item.quantity} • ${item.price.toFixed(2)} each
                      </p>
                    </div>
                    <span className="font-bold text-on-surface font-mono shrink-0">
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Price Calculation */}
              <div className="pt-4 border-t border-outline-variant space-y-2 text-xs font-mono">
                <div className="flex justify-between text-on-surface-variant">
                  <span>Subtotal:</span>
                  <span>${cart.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-on-surface-variant">
                  <span>Shipping:</span>
                  <span>
                    {freightCost === 0 ? "FREE" : `$${freightCost.toFixed(2)}`}
                  </span>
                </div>
                <div className="pt-3 border-t border-outline-variant flex justify-between items-baseline text-base font-bold text-on-surface">
                  <span>Total:</span>
                  <span className="text-lg text-primary">
                    ${grandTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* Add New Address Modal (Checkout) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="sticky top-0 z-20 p-5 border-b border-outline-variant bg-surface-container-low/95 backdrop-blur flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-on-surface">
                  Add Delivery Address
                </h3>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Pick on the map or enter manually. It will save to your account and be selected.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveNewAddress} className="p-6 space-y-4 text-xs">
              {modalError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 text-xs">
                  {modalError}
                </div>
              )}

              {/* Mode Selector Tabs */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-surface-container rounded-lg border border-outline-variant">
                <button
                  type="button"
                  onClick={() => setModalPickerMode("map")}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    modalPickerMode === "map"
                      ? "bg-primary text-on-primary shadow-sm"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">map</span>
                  <span>Pick on Map / GPS</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModalPickerMode("manual")}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    modalPickerMode === "manual"
                      ? "bg-primary text-on-primary shadow-sm"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">edit_note</span>
                  <span>Manual Details</span>
                </button>
              </div>

              {/* Map Picker if in map mode */}
              {modalPickerMode === "map" && (
                <div className="space-y-2">
                  <AddressMapPicker
                    initialLat={modalLat || 30.0444}
                    initialLng={modalLng || 31.2357}
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
                  value={modalStreet}
                  onChange={(e) => setModalStreet(e.target.value)}
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
                    value={modalCity}
                    onChange={(e) => setModalCity(e.target.value)}
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
                    value={modalState}
                    onChange={(e) => setModalState(e.target.value)}
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
                    value={modalPostal}
                    onChange={(e) => setModalPostal(e.target.value)}
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
                    value={modalCountry}
                    onChange={(e) => setModalCountry(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-md text-on-surface text-xs focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>

              {/* Phone Number Required */}
              <div>
                <label className="block font-semibold text-on-surface mb-1">
                  Phone Number (For Delivery Contact) <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. +20 10 1234 5678"
                  value={modalPhone}
                  onChange={(e) => setModalPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-md text-on-surface text-xs focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={modalIsDefault}
                    onChange={(e) => setModalIsDefault(e.target.checked)}
                    className="w-4 h-4 rounded text-primary border-outline-variant focus:ring-0 cursor-pointer"
                  />
                  <span className="text-xs text-on-surface font-medium">
                    Set as default shipping address
                  </span>
                </label>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-outline-variant flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={modalSubmitting}
                  className="px-4 py-2 bg-surface-container-low hover:bg-surface-container-high border border-outline-variant text-on-surface rounded-md text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="px-5 py-2 bg-primary hover:bg-primary/90 text-on-primary rounded-md text-xs font-bold transition-colors cursor-pointer shadow-sm flex items-center gap-2 disabled:opacity-50"
                >
                  {modalSubmitting ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save & Use Address</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-surface flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
