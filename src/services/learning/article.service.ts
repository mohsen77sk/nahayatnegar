import { MOCK_ARTICLES_LIST } from "./mockArticle";

export type ArticleLevel = "beginner" | "intermediate" | "advanced";

export const ARTICLE_LEVELS: { label: string; value: ArticleLevel }[] = [
  { label: "مقدماتی", value: "beginner" },
  { label: "متوسط", value: "intermediate" },
  { label: "پیشرفته", value: "advanced" },
];

export interface PostsResponseDto {
  id: string;
  title: string;
  slug: string;
  content: string;
  description: string;
  imageUrl: string;
  published: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  level: string;
  headings: any[];
}

export interface PostsListResponseDto {
  count: number;
  page: number;
  per_page: number;
  total_page: number;
  items: PostsResponseDto[];
}

export type PostsSortOrder = "asc" | "desc";

export interface PostsQueryParams {
  from?: string;
  to?: string;
  search?: string;
  page?: number;
  per_page?: number;
  sort_by?: string;
  order?: PostsSortOrder;
}

const API_BASE_URL: string | undefined = import.meta.env.PUBLIC_ADMIN_API_URL;
const BUILD_POSTS_LIMIT = 100;

function getApiUrl(endpoint: string): string {
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL || ""}${cleanEndpoint}`;
}

export async function fetchPostById(id: string): Promise<PostsResponseDto> {
  if (!API_BASE_URL) {
    const article = MOCK_ARTICLES_LIST.find((p) => p.id === id);
    if (!article) throw new Error(`Article not found: ${id}`);
    return article;
  }

  const response = await fetch(getApiUrl(`/posts/${id}`));

  if (!response.ok) {
    throw new Error(`خطا در دریافت پست با شناسه ${id} - وضعیت: ${response.status}`);
  }

  const result = await response.json();
  return result?.data ?? result;
}

export async function fetchAllArticles(params: PostsQueryParams = {}): Promise<PostsListResponseDto> {
  if (!API_BASE_URL) {
    return {
      count: MOCK_ARTICLES_LIST.length,
      page: 1,
      per_page: MOCK_ARTICLES_LIST.length,
      total_page: 1,
      items: MOCK_ARTICLES_LIST,
    };
  }

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  }
  const queryString = query.toString();

  const response = await fetch(getApiUrl(`/posts${queryString ? `?${queryString}` : ""}`));

  if (!response.ok) {
    throw new Error(`خطا در دریافت لیست مقالات: ${response.statusText}`);
  }

  const result = await response.json();
  return result?.data ?? result;
}

export async function fetchLatestArticles(limit: number = BUILD_POSTS_LIMIT): Promise<PostsResponseDto[]> {
  const result = await fetchAllArticles({
    page: 1,
    per_page: limit,
    sort_by: "createdAt",
    order: "desc",
  });

  return result.items ?? [];
}

export function getLevelLabel(raw?: string): string {
  if (!raw) return "";
  return ARTICLE_LEVELS.find((item) => item.value === raw || raw.includes(item.label))?.label ?? raw;
}

const WORDS_PER_MINUTE = 200;
const NAMED_HTML_ENTITIES: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: '"',
  zwnj: "\u200c",
  zwj: "\u200d",
};

function decodeHtmlEntity(entity: string): string {
  const value = entity.slice(1, -1);
  if (value.startsWith("#")) {
    const isHex = value[1]?.toLowerCase() === "x";
    const codePoint = Number.parseInt(value.slice(isHex ? 2 : 1), isHex ? 16 : 10);
    if (
      !Number.isInteger(codePoint) ||
      codePoint < 0 ||
      codePoint > 0x10ffff ||
      (codePoint >= 0xd800 && codePoint <= 0xdfff)
    ) {
      return " ";
    }
    return String.fromCodePoint(codePoint);
  }
  return NAMED_HTML_ENTITIES[value.toLowerCase()] ?? " ";
}

export function calculateReadingTime(htmlContent?: string | null): number {
  const visibleText = (htmlContent ?? "")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|template|noscript)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&(?:#(?:x[\da-f]+|\d+)|[a-z][\da-z]+);/gi, decodeHtmlEntity)
    .replace(/[\u00a0\u200b\ufeff]/g, " ");
  const wordsCount = visibleText.match(/[\p{L}\p{N}]+(?:[\u200c\u200d'’\-][\p{L}\p{N}]+)*/gu)?.length ?? 0;
  return Math.max(1, Math.ceil(wordsCount / WORDS_PER_MINUTE));
}

export function formatPersianDate(dateInput?: string | null): string {
  if (!dateInput) return "نامشخص";
  try {
    const date = new Date(dateInput);
    if (Number.isNaN(date.getTime())) return "نامشخص";
    return new Intl.DateTimeFormat("fa-IR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  } catch {
    return "نامشخص";
  }
}

export function resolveImageUrl(image?: string | null): string {
  return image || "/placeholder-banner.jpg";
}
