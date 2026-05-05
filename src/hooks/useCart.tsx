import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";

export interface CartItem {
  id: string; // unique key (productId + variant label)
  product_id: string;
  product_name: string;
  image_url?: string | null;
  variant_label?: string | null;
  unit_price: number;
  quantity: number;
  unit_type?: string | null;
}

interface CartCtx {
  items: CartItem[];
  count: number;
  total: number;
  addItem: (item: Omit<CartItem, "id"> & { id?: string }) => void;
  updateQty: (id: string, qty: number) => void;
  removeItem: (id: string) => void;
  clear: () => void;
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

const Ctx = createContext<CartCtx | null>(null);

const STORAGE_KEY = "km_shop_cart_v1";

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const [isOpen, setOpen] = useState(false);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {}
  }, [items]);

  const addItem: CartCtx["addItem"] = useCallback((item) => {
    const id = item.id || `${item.product_id}::${item.variant_label || ""}`;
    setItems(prev => {
      const idx = prev.findIndex(x => x.id === id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + item.quantity };
        return next;
      }
      return [...prev, { ...item, id }];
    });
  }, []);

  const updateQty = useCallback((id: string, qty: number) => {
    setItems(prev => prev.map(x => x.id === id ? { ...x, quantity: Math.max(1, qty) } : x));
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(x => x.id !== id));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const count = items.reduce((s, x) => s + x.quantity, 0);
  const total = items.reduce((s, x) => s + x.unit_price * x.quantity, 0);

  return (
    <Ctx.Provider value={{ items, count, total, addItem, updateQty, removeItem, clear, isOpen, open: () => setOpen(true), close: () => setOpen(false) }}>
      {children}
    </Ctx.Provider>
  );
};

export const useCart = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart must be inside CartProvider");
  return c;
};
