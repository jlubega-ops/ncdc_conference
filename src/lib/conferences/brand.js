import { getAppUrl } from "@/lib/email/config";
import { brandAssets } from "@/lib/assets";

/**
 * @param {any} [conference]
 */
export function organiserBrandFromConference(conference) {
  const name = String(conference?.organiserName || "").trim() || "Conference Management";
  const shortName = String(conference?.organiserShortName || "").trim();
  const logo = String(conference?.organiserLogo || "").trim() || brandAssets.logo;
  return { name, shortName, logo };
}

/**
 * @param {string | null | undefined} pathOrUrl
 * @param {string} [appUrl]
 */
export function absoluteAssetUrl(pathOrUrl, appUrl = getAppUrl()) {
  const value = String(pathOrUrl || "").trim();
  if (!value) return `${appUrl}${brandAssets.logo}`;
  if (/^https?:\/\//i.test(value)) return value;
  const path = value.startsWith("/") ? value : `/${value}`;
  return `${appUrl}${path}`;
}

/**
 * @param {any} [conference]
 */
export function emailBrandFromConference(conference) {
  const brand = organiserBrandFromConference(conference);
  return {
    name: brand.name,
    shortName: brand.shortName,
    logoUrl: absoluteAssetUrl(brand.logo),
    footerLine: brand.shortName ? `${brand.name} · ${brand.shortName}` : brand.name,
  };
}

/**
 * @param {any} [conference]
 */
export function conferenceMetadataIcons(conference) {
  const logo = String(conference?.organiserLogo || "").trim();
  if (!logo) return undefined;
  return [{ url: logo }];
}
