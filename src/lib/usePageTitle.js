import { useEffect } from "react";

const BASE = "Trade World — Custom T-Shirt Printing, Jodhpur";

export default function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · Trade World Jodhpur` : BASE;
  }, [title]);
}
