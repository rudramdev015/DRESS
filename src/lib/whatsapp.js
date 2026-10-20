import { formatINR } from "./api.js";

export function waLink(number, text) {
  const n = String(number || "").replace(/\D/g, "");
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
}

export function openWhatsApp(number, text) {
  window.open(waLink(number, text), "_blank", "noopener");
}

const siteUrl = (path) => `${window.location.origin}${path}`;

export function productMessage(product, { size, color, qty }) {
  return [
    "Hi Trade World! 👋 I want to buy this tee:",
    "",
    `*${product.name}*`,
    `Colour: ${color || "-"}`,
    `Size: ${size || "-"}`,
    `Qty: ${qty}`,
    `Price: ${formatINR(product.price)} × ${qty} = ${formatINR(product.price * qty)}`,
    "",
    `Link: ${siteUrl(`/product/${product.id}`)}`,
    "",
    "Please confirm availability and delivery details.",
  ].join("\n");
}

export function cartMessage(items, customer) {
  const total = items.reduce((s, i) => s + i.price * i.qty, 0);
  const lines = items.map(
    (i, n) => `${n + 1}. *${i.name}* — ${i.color}, Size ${i.size}, Qty ${i.qty} = ${formatINR(i.price * i.qty)}`
  );
  return [
    "Hi Trade World! 👋 I want to place an order:",
    "",
    ...lines,
    "",
    `*Total: ${formatINR(total)}*`,
    "",
    `Name: ${customer.name || "-"}`,
    `City: ${customer.city || "-"}`,
    customer.address ? `Address: ${customer.address}` : null,
    customer.note ? `Note: ${customer.note}` : null,
  ]
    .filter((l) => l !== null)
    .join("\n");
}

export function customMessage(f) {
  return [
    "Hi Trade World! 👋 I want a *custom T-shirt print*:",
    "",
    `Name: ${f.name || "-"}`,
    `City: ${f.city || "-"}`,
    `Tee style: ${f.style}`,
    `Tee colour: ${f.color || "-"}`,
    `Quantity: ${f.qty}`,
    `Sizes: ${f.sizes || "-"}`,
    `Print placement: ${f.placement}`,
    `Print method: ${f.method}`,
    `Needed by: ${f.date || "Flexible"}`,
    "",
    `Design details: ${f.details || "-"}`,
    "",
    "I'll send my design / logo file in this chat.",
  ].join("\n");
}

export const quickMessage = (topic = "") =>
  `Hi Trade World! 👋 ${topic || "I want to know more about your T-shirt printing."}`;
