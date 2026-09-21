export function siteUrl(path = ""): string {
 if (!path) return import.meta.env.BASE_URL || '';

 const isExternal = /^https?:\/\//i.test(path) || path.startsWith("//");

  if (isExternal) {
    return path;
  }

  const base = (import.meta.env.BASE_URL || "").replace(/\/+$/, "");
  const cleanPath = path.replace(/^\/+/, "");

  return `${base}/${cleanPath}`;
}
