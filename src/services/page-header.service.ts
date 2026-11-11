export interface PageHeaderMedia {
  url: string;
  mimetype?: string;
  size?: number;
}

export interface PageHeader {
  id?: string;
  page: string;
  layout: number;
  theme: "dark" | "light";
  text: string;
  description: string;
  ctas: { label: string; link: string; variant: "primary" | "secondary" }[];
  slides: {
    mediaType: "image" | "video";
    desktop?: PageHeaderMedia | null;
    mobile?: PageHeaderMedia | null;
  }[];
  isActive: boolean;
}

// Used only in Astro frontmatter: requests run during static generation.
export async function fetchPageHeader(
  pageKey: string,
  apiBaseUrl: string | undefined = import.meta.env.PUBLIC_ADMIN_API_URL,
): Promise<PageHeader | null> {
  const baseUrl = apiBaseUrl?.replace(/\/+$/, "");
  if (!baseUrl) return null;

  const response = await fetch(`${baseUrl}/page-headers/${encodeURIComponent(pageKey)}`, {
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch page header "${pageKey}" (HTTP ${response.status}).`);
  }

  const result = await response.json();
  if (!result || typeof result !== "object") {
    return null;
  }

  const header: PageHeader = result?.data ?? result;
  if (!header || typeof header.isActive !== "boolean") {
    throw new Error(`Invalid page header response for "${pageKey}".`);
  }
  if (!header.isActive) return header;
  if (
    header.page !== pageKey ||
    typeof header.layout !== "number" ||
    !["dark", "light"].includes(header.theme) ||
    typeof header.text !== "string" ||
    typeof header.description !== "string" ||
    !Array.isArray(header.ctas) ||
    !Array.isArray(header.slides) ||
    !header.ctas.every(
      (cta) =>
        cta &&
        typeof cta.label === "string" &&
        typeof cta.link === "string" &&
        ["primary", "secondary"].includes(cta.variant),
    ) ||
    !header.slides.every(
      (slide) =>
        slide &&
        ["image", "video"].includes(slide.mediaType) &&
        [slide.desktop, slide.mobile].some((media) => media && typeof media.url === "string" && media.url.trim()) &&
        [slide.desktop, slide.mobile].every((media) => !media || (typeof media.url === "string" && media.url.trim())),
    )
  ) {
    throw new Error(`Invalid active page header response for "${pageKey}".`);
  }

  // Upload paths belong to the API origin, not the frontend deployment base.
  for (const slide of header.slides) {
    for (const media of [slide.desktop, slide.mobile]) {
      if (media) media.url = new URL(media.url, `${baseUrl}/`).href;
    }
  }
  return header;
}
