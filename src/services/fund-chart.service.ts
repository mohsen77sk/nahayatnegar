import { createApiError } from "../utils/api-error.ts";
import type { FundChartResponse, FundTimeframe } from "../utils/fund-chart.ts";

const summaryFunds: Record<string, string> = {
  naab: "naab",
  asil: "asil",
  pouya: "pouya",
  pirooz: "pirooz",
};

function parseReturnRate(value: unknown, timeframe: FundTimeframe): number | null {
  if (!isRecord(value) || !isRecord(value.data)) throw new Error("Invalid fund summary response.");
  const rate = value.data[timeframe];
  if (rate === null || rate === undefined) return null;
  if (
    (typeof rate !== "number" && typeof rate !== "string") ||
    (typeof rate === "string" && !rate.trim()) ||
    !Number.isFinite(Number(rate))
  ) {
    throw new Error("Invalid fund return rate.");
  }
  return Number(rate);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseResponse(value: unknown): FundChartResponse {
  if (!isRecord(value) || !isRecord(value.items) || !isRecord(value.data)) {
    throw new Error("Invalid fund chart response.");
  }

  for (const points of Object.values(value.items)) {
    if (
      !Array.isArray(points) ||
      !points.every(
        (point: unknown) =>
          isRecord(point) &&
          typeof point.event_date === "number" &&
          Number.isFinite(point.event_date) &&
          !Number.isNaN(new Date(point.event_date * 1000).getTime()) &&
          (point.turnover === null || (typeof point.turnover === "number" && Number.isFinite(point.turnover))),
      )
    ) {
      throw new Error("Invalid fund chart points.");
    }
  }

  if (!Object.values(value.data).every((label) => typeof label === "string")) {
    throw new Error("Invalid fund chart labels.");
  }

  return value as unknown as FundChartResponse;
}

export async function fetchFundChart(
  fund: string,
  timeframe: FundTimeframe,
  signal?: AbortSignal,
  apiBaseUrl: string = import.meta.env?.PUBLIC_API_URL || "https://landing-api.nahayatnegar.com",
): Promise<FundChartResponse> {
  const baseUrl = apiBaseUrl.replace(/\/+$/, "");
  if (!baseUrl || !fund.trim()) throw new Error("Fund chart API URL and fund are required.");

  const controller = new AbortController();
  const requestSignal = AbortSignal.any(
    [controller.signal, AbortSignal.timeout(20_000), signal].filter((value): value is AbortSignal => !!value),
  );

  const fetchSeries = async (symbol: string) => {
    const query = new URLSearchParams({ timeFrame: timeframe, fund: symbol });
    const response = await fetch(`${baseUrl}/assetDailyInfo?${query}`, { signal: requestSignal });
    if (!response.ok) throw await createApiError(response);
    return parseResponse(await response.json());
  };

  const fetchReturnRate = async () => {
    const symbol = Object.hasOwn(summaryFunds, fund) ? summaryFunds[fund] : undefined;
    if (!symbol) return null;
    const query = new URLSearchParams({ fund: symbol });
    const response = await fetch(`${baseUrl}/assetSummary?${query}`, { signal: requestSignal });
    if (!response.ok) throw await createApiError(response);
    return parseReturnRate(await response.json(), timeframe);
  };

  try {
    const [responses, returnRate] = await Promise.all([
      Promise.all([...new Set([fund, "index"])].map(fetchSeries)),
      fetchReturnRate(),
    ]);
    return {
      returnRate,
      items: Object.assign({}, ...responses.map((response) => response.items)),
      data: Object.assign({}, ...responses.map((response) => response.data)),
    };
  } catch (error) {
    controller.abort();
    throw error;
  }
}
