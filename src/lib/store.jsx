import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "./api.js";

const StoreContext = createContext(null);
const CART_KEY = "tw_cart";

function loadCart() {
  try {
    const raw = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export function StoreProvider({ children }) {
  const [settings, setSettings] = useState({ whatsapp: "", announcement: "", address: "Jodhpur, Rajasthan" });
  const [cart, setCart] = useState(loadCart);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    api("/settings").then(setSettings).catch(() => {});
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch {
      /* ignore */
    }
  }, [cart]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const addToCart = useCallback((product, { size, color, colorHex, qty }) => {
    const key = `${product.id}|${size}|${color}`;
    setCart((items) => {
      const found = items.find((i) => i.key === key);
      if (found) return items.map((i) => (i.key === key ? { ...i, qty: Math.min(i.qty + qty, 999) } : i));
      return [
        ...items,
        {
          key,
          id: product.id,
          name: product.name,
          price: product.price,
          image: product.images?.[0] || "",
          graphic: product.graphic,
          size,
          color,
          colorHex,
          qty,
        },
      ];
    });
    setToast(`Added to bag — ${product.name}`);
  }, []);

  const updateQty = useCallback(
    (key, qty) => setCart((items) => items.map((i) => (i.key === key ? { ...i, qty: Math.max(1, Math.min(qty, 999)) } : i))),
    []
  );
  const removeItem = useCallback((key) => setCart((items) => items.filter((i) => i.key !== key)), []);
  const clearCart = useCallback(() => setCart([]), []);

  const value = useMemo(
    () => ({
      settings,
      setSettings,
      cart,
      cartCount: cart.reduce((s, i) => s + i.qty, 0),
      cartTotal: cart.reduce((s, i) => s + i.qty * i.price, 0),
      addToCart,
      updateQty,
      removeItem,
      clearCart,
      toast,
      setToast,
    }),
    [settings, cart, addToCart, updateQty, removeItem, clearCart, toast]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export const useStore = () => useContext(StoreContext);

export function useProducts() {
  const [state, setState] = useState({ products: [], loading: true, error: "" });
  useEffect(() => {
    let alive = true;
    api("/products")
      .then((products) => alive && setState({ products, loading: false, error: "" }))
      .catch((e) => alive && setState({ products: [], loading: false, error: e.message }));
    return () => {
      alive = false;
    };
  }, []);
  return state;
}
