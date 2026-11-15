// Home page content. Everything here can be changed in Admin → Home page.
// Used by the server (as defaults) and by the website (until settings load).

export const HOME_CATEGORY_IDS = ["Oversized", "Classic", "Polo", "Custom"];

export const DEFAULT_HOME = {
  hero: {
    eyebrow: "Custom T-shirt printing · Jodhpur",
    title: "Print your",
    highlight: "story.",
    subtitle:
      "Streetwear-grade tees printed in the Blue City: oversized drops, custom names, team and event orders. From one piece to a thousand.",
    image: "", // empty = show the 3D tee
  },
  stats: [
    { value: "1 → 1000+", label: "pieces per order" },
    { value: "DTF · Screen · Vinyl", label: "print methods" },
    { value: "Jodhpur", label: "printed in-house" },
  ],
  marquee: ["Oversized Tees", "Custom Names", "College Fests", "Corporate Bulk", "Event Tees", "Couple Tees", "Gym Crews", "Brand Merch"],
  categories: [
    { id: "Oversized", title: "Oversized Tees", blurb: "Boxy fit, heavy GSM, big back prints", image: "" },
    { id: "Classic", title: "Classic Tees", blurb: "Regular fit everyday essentials", image: "" },
    { id: "Polo", title: "Polo Tees", blurb: "Smart pique polos for work & events", image: "" },
    { id: "Custom", title: "Custom & Bulk", blurb: "Your name, your logo, your team", image: "" },
  ],
  gallery: [], // { image, caption } — photos of printed tees, shown as a lookbook
  bulk: {
    title: "10+ tees for your team, college or brand?",
    text: "Send us your quantity and design. We'll reply on WhatsApp with bulk pricing and a mockup.",
    points: ["From 10 pieces", "Mockup before we print", "Better price per piece"],
    image: "",
  },
  faq: [
    { q: "Is there a minimum order?", a: "No. We print a single custom tee too. Bulk pricing starts at 10 pieces." },
    {
      q: "How do I place an order?",
      a: "Add tees to your bag or tap 'Order on WhatsApp'. Your order arrives in our WhatsApp with all details filled in, and we confirm price, payment and delivery there.",
    },
    {
      q: "How long does printing take?",
      a: "Usually 2–4 working days for small orders. For bulk orders, we confirm the timeline on WhatsApp before we start.",
    },
    { q: "Can you design it for me?", a: "Yes. Tell us your idea on WhatsApp and we'll share a mockup before printing." },
  ],
};
