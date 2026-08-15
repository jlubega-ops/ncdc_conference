"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { brandAssets } from "@/lib/assets";

const OrganiserBrandContext = createContext({
  brand: null,
  setBrand: () => {},
});

export function OrganiserBrandProvider({ children }) {
  const [brand, setBrand] = useState(null);
  const value = useMemo(() => ({ brand, setBrand }), [brand]);
  return (
    <OrganiserBrandContext.Provider value={value}>{children}</OrganiserBrandContext.Provider>
  );
}

export function useOrganiserBrand() {
  return useContext(OrganiserBrandContext);
}

/**
 * Applies organiser logo/name on conference pages (header + favicon).
 * @param {{ name?: string; shortName?: string; logo?: string } | null} brand
 */
export function OrganiserBrandSetter({ brand }) {
  const { setBrand } = useOrganiserBrand();

  useEffect(() => {
    setBrand(brand || null);
    return () => setBrand(null);
  }, [brand, setBrand]);

  useEffect(() => {
    const href = brand?.logo || brandAssets.logo;
    let link = document.querySelector("link[rel='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    const previous = link.getAttribute("href");
    link.setAttribute("href", href);
    return () => {
      if (previous) link.setAttribute("href", previous);
    };
  }, [brand]);

  return null;
}
