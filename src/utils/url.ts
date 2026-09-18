export function siteUrl(path = ""): string {
  const base = import.meta.env.BASE_URL.replace(/\/+$/, "");
  const cleanPath = path.replace(/^\/+/, "");

  return `${base}/${cleanPath}`;
}
