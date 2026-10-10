import { MOCK_ARTICLES_LIST } from "./data/mockArticle";

export interface ImageObject {
  url?: string;
  alt?: string;
  [key: string]: any;
}

export interface ArticleApiDTO {
  id: string;
  slug?: string;
  title: string;
  content: string;
  description?: Record<string, any> | string;
  imageUrl?: ImageObject | string;
  published: boolean;
  publishedAt?: Record<string, any> | string | null;
  createdAt: string;
  updatedAt: string;
  level?: string;
  readingTime?: string;
  publishDate?: string;
}
const API_BASE_URL: string | undefined = import.meta.env.PUBLIC_API_URL?.replace(/\/$/, "");

function getApiUrl(endpoint: string): string {
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL || ""}${cleanEndpoint}`;
}

export async function fetchPostById(id: string): Promise<ArticleApiDTO> {
  if (!API_BASE_URL) {
    const article = MOCK_ARTICLES_LIST.find((p) => p.id === id);
    if (!article) throw new Error(`Article not found: ${id}`);
    return article;
  }

  const response = await fetch(getApiUrl(`/panel/posts/${id}`));

  if (!response.ok) {
    throw new Error(`خطا در دریافت پست با شناسه ${id} - وضعیت: ${response.status}`);
  }

  const result = await response.json();
  return result?.data || result;
}

export async function fetchAllArticles(): Promise<ArticleApiDTO[]> {
  if (!API_BASE_URL) {
    return MOCK_ARTICLES_LIST;
  }

  const response = await fetch(getApiUrl("/panel/posts"));

  if (!response.ok) {
    throw new Error(`خطا در دریافت لیست مقالات: ${response.statusText}`);
  }

  const result = await response.json();
  return Array.isArray(result) ? result : result?.data || [];
}

export function calculateReadingTime(htmlContent?: string): string {
  if (!htmlContent) return "۳ دقیقه";
  const cleanText = htmlContent.replace(/<[^>]*>/g, " ");
  const wordsCount = cleanText.trim().split(/\s+/).length;
  const minutes = Math.max(1, Math.ceil(wordsCount / 200));
  return `${minutes} دقیقه`;
}

export function formatPersianDate(dateInput: any): string {
  if (!dateInput) return "نامشخص";
  try {
    const dateStr =
      typeof dateInput === "string" ? dateInput : dateInput.date || dateInput.value || dateInput.toString();
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat("fa-IR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  } catch {
    return "نامشخص";
  }
}

export function resolveImageUrl(image: ImageObject | string | undefined): string {
  if (!image) return "/placeholder-banner.jpg";
  if (typeof image === "string") return image;
  return image.url || image.src || "/placeholder-banner.jpg";
}
