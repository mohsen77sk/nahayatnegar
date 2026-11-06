export const FUND_TIMEFRAMES = [
  { value: "MONTHLY3", label: "۳ ماهه" },
  { value: "MONTHLY6", label: "۶ ماهه" },
  { value: "YEARLY", label: "یکساله" },
] as const;

export type FundTimeframe = (typeof FUND_TIMEFRAMES)[number]["value"];

export interface FundChartResponse {
  items: Record<string, { event_date: number; turnover: number | null }[]>;
  data: Record<string, string>;
  returnRate?: number | null;
}

export interface FundSeries {
  key: string;
  label: string;
  color: string;
  values: (number | null)[];
}

export interface FundChartData {
  labels: string[];
  axisLabels: string[];
  series: FundSeries[];
  returnRate: number | null;
}

const colors: Record<string, string> = {
  naab: "#3B82F6",
  dollar: "#10B981",
  seke: "#795548",
  shemsh: "#8b5cf6",
  gold: "#F59E0B",
  asil: "#10B981",
  pirooz: "#3B82F6",
  pouya: "#10B981",
  index: "#EF4444",
};

const dateFormatter = new Intl.DateTimeFormat("fa-IR", { year: "numeric", month: "2-digit", day: "2-digit" });
const monthFormatter = new Intl.DateTimeFormat("fa-IR", { month: "long", year: "2-digit" });

export function isFundTimeframe(value: unknown): value is FundTimeframe {
  return FUND_TIMEFRAMES.some((timeframe) => timeframe.value === value);
}

export function toFarsiDigits(value: number | string): string {
  return String(value).replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]!);
}

export function prepareFundChartData(response: FundChartResponse): FundChartData {
  const entries = Object.entries(response.items);
  const timestamps = [...new Set(entries.flatMap(([, points]) => points.map((point) => point.event_date)))].sort(
    (a, b) => a - b,
  );

  return {
    returnRate: response.returnRate ?? null,
    labels: timestamps.map((timestamp) => dateFormatter.format(timestamp * 1000)),
    axisLabels: timestamps.map((timestamp) => monthFormatter.format(timestamp * 1000)),
    series: entries.map(([key, points]) => {
      const values = new Map(points.map((point) => [point.event_date, point.turnover]));
      return {
        key,
        label: response.data[key] || key,
        color: colors[key] || "#9ca3af",
        values: timestamps.map((timestamp) => values.get(timestamp) ?? null),
      };
    }),
  };
}
