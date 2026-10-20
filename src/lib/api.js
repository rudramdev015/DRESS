const TOKEN_KEY = "tw_admin_token";

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage blocked — admin will just need to log in again */
  }
}

export async function api(path, { method = "GET", body, form, auth = false } = {}) {
  const headers = {};
  let payload;
  if (auth) headers.Authorization = `Bearer ${getToken()}`;
  if (form) payload = form;
  else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  const res = await fetch(`/api${path}`, { method, headers, body: payload });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const formatINR = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");

export const CATEGORIES = [
  { id: "Oversized", label: "Oversized Tees", blurb: "Boxy fit, heavy GSM, big back prints" },
  { id: "Classic", label: "Classic Tees", blurb: "Regular fit everyday essentials" },
  { id: "Polo", label: "Polo Tees", blurb: "Smart pique polos for work & events" },
  { id: "Custom", label: "Custom & Bulk", blurb: "Your name, your logo, your team" },
];

export const PRINT_TYPES = ["DTF", "Screen print", "Vinyl (HTV)", "DTG", "Sublimation"];
export const ALL_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "3XL"];
