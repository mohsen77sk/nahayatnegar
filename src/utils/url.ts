export const URLS = {
  moboTraderAppAddress: "https://mobotrader.nahayatnegar.com/",
  neoTraderAppAddress: "https://neotrader.nahayatnegar.com/",
  proTraderAppAddress: "https://neotrader.nahayatnegar.com/",
  registerAddress: "https://reg.nahayatnegar.com/",
  sejamAddress: "https://www.sejam.ir/",
};

export const CommunicationURLS = {
  instagram: "https://www.instagram.com/nahayatnegar.official",
  linkedin: "https://www.linkedin.com/company/nahayatnegar-broker/",
  telegram: "https://t.me/NahayatNegar_Analysis",
};

function withBaseUrl(path: string, base: string): string {
  if (!path) return base;
  const isExternal = /^https?:\/\//i.test(path) || path.startsWith("//");

  if (isExternal) {
    return path;
  }

  const cleanBase = base.replace(/\/+$/, "");
  const cleanPath = path.replace(/^\/+/, "");

  return `${cleanBase}/${cleanPath}`;
}

export function siteUrl(path = ""): string {
  return withBaseUrl(path, import.meta.env.BASE_URL || "");
}

export function assetUrl(path = ""): string {
  return withBaseUrl(path, import.meta.env.PUBLIC_BASE_ASSETS_URL || import.meta.env.BASE_URL || "");
}
