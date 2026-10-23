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

export function siteUrl(path = ""): string {
  if (!path) return import.meta.env.BASE_URL || "";

  const isExternal = /^https?:\/\//i.test(path) || path.startsWith("//");

  if (isExternal) {
    return path;
  }

  const base = (import.meta.env.BASE_URL || "").replace(/\/+$/, "");
  const cleanPath = path.replace(/^\/+/, "");

  return `${base}/${cleanPath}`;
}
