"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { createClient } from "@/lib/supabase/client";
import {
  getDbCartAction,
  saveDbCartAction,
  mergeDbCartAction,
  clearDbCartAction,
} from "@/actions/cart";

export interface CartItem {
  id: string;
  sku: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  specs: string;
  badges: string[];
  watts?: number;
  weightKg?: number;
}

export interface ConflictData {
  localItems: CartItem[];
  remoteItems: CartItem[];
}

interface CartContextType {
  items: CartItem[];
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, delta: number) => void;
  clearCart: () => void;
  itemCount: number;
  subtotal: number;
  totalWatts: number;
  totalWeightKg: number;
  isHydrated: boolean;
  user: any;
  conflictData: ConflictData | null;
  resolveMerge: () => Promise<void>;
  resolveKeepLocal: () => Promise<void>;
  resolveKeepRemote: () => Promise<void>;
}

const STORAGE_KEY = "kilohertz_cart_items";

const CartContext = createContext<CartContextType | undefined>(undefined);

function saveToLocalStorage(items: CartItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.error("Failed to save cart to localStorage", err);
  }
}

function getFromLocalStorage(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function areCartsIdentical(a: CartItem[], b: CartItem[]): boolean {
  if (a.length !== b.length) return false;
  const aSorted = [...a].sort((x, y) => (x.sku || x.id).localeCompare(y.sku || y.id));
  const bSorted = [...b].sort((x, y) => (x.sku || x.id).localeCompare(y.sku || y.id));
  return aSorted.every(
    (item, i) =>
      (item.sku && bSorted[i].sku ? item.sku === bSorted[i].sku : item.id === bSorted[i].id) &&
      item.quantity === bSorted[i].quantity
  );
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [conflictData, setConflictData] = useState<ConflictData | null>(null);

  const userRef = useRef<any>(null);
  userRef.current = user;

  // Reconcile cart between local guest items and DB remote items
  const reconcileCart = useCallback(async (currentUser: any) => {
    try {
      const dbItems = await getDbCartAction();
      const localItems = getFromLocalStorage();

      if (!dbItems || dbItems.length === 0) {
        if (localItems.length > 0) {
          const res = await saveDbCartAction(localItems);
          const next = (res.items && res.items.length > 0) ? res.items : localItems;
          setItems(next);
          saveToLocalStorage([]);
        } else {
          setItems([]);
        }
      } else {
        if (localItems.length > 0 && !areCartsIdentical(localItems, dbItems)) {
          setConflictData({ localItems, remoteItems: dbItems });
        } else {
          setItems(dbItems);
          saveToLocalStorage([]);
        }
      }
    } catch (err) {
      console.error("Failed to reconcile cart", err);
    }
  }, []);

  // Initial mount & Supabase auth subscription
  useEffect(() => {
    const initialLocal = getFromLocalStorage();
    setItems(initialLocal);
    setIsHydrated(true);

    const supabase = createClient();

    // Check if user is already signed in
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user);
        userRef.current = data.user;
        reconcileCart(data.user);
      } else {
        setUser(null);
        userRef.current = null;
      }
    }).catch((err) => {
      console.error("Auth init check failed", err);
      setUser(null);
      userRef.current = null;
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const nextUser = session?.user || null;
      setUser(nextUser);
      userRef.current = nextUser;

      if (event === "SIGNED_IN" && nextUser) {
        await reconcileCart(nextUser);
      } else if (event === "SIGNED_OUT") {
        setConflictData(null);
        setUser(null);
        userRef.current = null;
        setItems([]);
        saveToLocalStorage([]);
      }
    });

    // Cross-tab sync for guest cart
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        if (e.newValue) {
          try {
            const parsed = JSON.parse(e.newValue);
            if (Array.isArray(parsed)) setItems(parsed);
          } catch {
            // ignore
          }
        } else {
          setItems([]);
        }
      }
    };
    window.addEventListener("storage", handleStorageChange);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [reconcileCart]);

  // Conflict resolution handlers
  const resolveMerge = async () => {
    if (!conflictData) return;
    try {
      const res = await mergeDbCartAction(conflictData.localItems);
      const next = (res.items && res.items.length > 0) ? res.items : conflictData.localItems;
      setItems(next);
      saveToLocalStorage([]);
      setConflictData(null);
    } catch (err) {
      console.error("Failed to merge carts", err);
    }
  };

  const resolveKeepLocal = async () => {
    if (!conflictData) return;
    try {
      const res = await saveDbCartAction(conflictData.localItems);
      const next = (res.items && res.items.length > 0) ? res.items : conflictData.localItems;
      setItems(next);
      saveToLocalStorage([]);
      setConflictData(null);
    } catch (err) {
      console.error("Failed to overwrite cart with local items", err);
    }
  };

  const resolveKeepRemote = async () => {
    if (!conflictData) return;
    try {
      const next = conflictData.remoteItems;
      setItems(next);
      saveToLocalStorage([]);
      setConflictData(null);
    } catch (err) {
      console.error("Failed to restore remote cart", err);
    }
  };

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);
  const toggleCart = useCallback(() => setIsOpen((prev) => !prev), []);

  const addItem = useCallback((item: Omit<CartItem, "quantity">) => {
    setItems((prev) => {
      const existing = prev.find((i) =>
        item.sku && i.sku ? i.sku === item.sku : i.id === item.id
      );
      const next = existing
        ? prev.map((i) =>
            (item.sku && i.sku ? i.sku === item.sku : i.id === item.id)
              ? { ...i, quantity: i.quantity + 1 }
              : i
          )
        : [...prev, { ...item, quantity: 1 }];

      if (!userRef.current) {
        saveToLocalStorage(next);
      } else {
        setTimeout(() => {
          saveDbCartAction(next).then((res) => {
            if (res.unauthorized) {
              setUser(null);
              userRef.current = null;
              saveToLocalStorage(next);
            }
          }).catch(console.error);
        }, 0);
      }

      return next;
    });
    setIsOpen(true);
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.id !== id && i.sku !== id);
      if (!userRef.current) {
        saveToLocalStorage(next);
      } else {
        setTimeout(() => {
          saveDbCartAction(next).then((res) => {
            if (res.unauthorized) {
              setUser(null);
              userRef.current = null;
              saveToLocalStorage(next);
            }
          }).catch(console.error);
        }, 0);
      }

      return next;
    });
  }, []);

  const updateQuantity = useCallback((id: string, delta: number) => {
    setItems((prev) => {
      const next = prev
        .map((i) => {
          if (i.id === id || i.sku === id) {
            const nextQty = i.quantity + delta;
            return nextQty > 0 ? { ...i, quantity: nextQty } : null;
          }
          return i;
        })
        .filter(Boolean) as CartItem[];

      if (!userRef.current) {
        saveToLocalStorage(next);
      } else {
        setTimeout(() => {
          saveDbCartAction(next).then((res) => {
            if (res.unauthorized) {
              setUser(null);
              userRef.current = null;
              saveToLocalStorage(next);
            }
          }).catch(console.error);
        }, 0);
      }

      return next;
    });
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    if (!userRef.current) {
      saveToLocalStorage([]);
    } else {
      setTimeout(() => {
        clearDbCartAction().catch(console.error);
      }, 0);
    }
  }, []);

  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = items.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );
  const totalWatts = items.reduce(
    (acc, item) => acc + (item.watts || 0) * item.quantity,
    0
  );
  const totalWeightKg = items.reduce(
    (acc, item) => acc + (item.weightKg || 0.2) * item.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        items,
        isOpen,
        openCart,
        closeCart,
        toggleCart,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        itemCount,
        subtotal,
        totalWatts,
        totalWeightKg,
        isHydrated,
        user,
        conflictData,
        resolveMerge,
        resolveKeepLocal,
        resolveKeepRemote,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
