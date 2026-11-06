import assert from "node:assert/strict";
import { test } from "node:test";
import { fetchFundChart } from "../src/services/fund-chart.service.ts";
import { getApiErrorMessage } from "../src/utils/api-error.ts";
import { prepareFundChartData } from "../src/utils/fund-chart.ts";

const apiBase = "https://api.example.com";
const first = 1735689600;
const second = first + 86400;
const third = second + 86400;
const point = (event_date, turnover) => ({ event_date, turnover });

test("aligns unsorted series on a shared timeline while preserving zero, negative, and missing values", () => {
  const input = {
    items: {
      naab: [point(third, 12), point(first, 0)],
      index: [point(second, -2), point(third, null)],
    },
    data: { naab: "ناب", index: "شاخص" },
  };
  const original = structuredClone(input);
  const result = prepareFundChartData(input);
  assert.deepEqual(
    result.series.map((series) => series.values),
    [
      [0, null, 12],
      [null, -2, null],
    ],
  );
  assert.deepEqual(
    result.series.map((series) => series.label),
    ["ناب", "شاخص"],
  );
  const formatter = new Intl.DateTimeFormat("fa-IR", { year: "numeric", month: "2-digit", day: "2-digit" });
  assert.deepEqual(
    result.labels,
    [first, second, third].map((timestamp) => formatter.format(timestamp * 1000)),
  );
  assert.equal(result.axisLabels.length, 3);
  assert.deepEqual(input, original);
});

test("deduplicates timestamps, uses the last point, and supports unknown symbols", () => {
  const result = prepareFundChartData({ items: { unknown: [point(first, 1), point(first, 2)] }, data: {} });
  assert.equal(result.labels.length, 1);
  assert.deepEqual(result.series[0].values, [2]);
  assert.equal(result.series[0].label, "unknown");
  assert.equal(result.series[0].color, "#9ca3af");
  assert.deepEqual(prepareFundChartData({ items: {}, data: {} }), {
    labels: [],
    axisLabels: [],
    series: [],
    returnRate: null,
  });
});

test("fetches fund and index in parallel and encodes query parameters", async (t) => {
  const calls = [];
  const releases = [];
  const request = t.mock.method(globalThis, "fetch", (url, options) => {
    const parsed = new URL(url);
    assert.equal(parsed.pathname, "/assetDailyInfo");
    assert.equal(parsed.searchParams.get("timeFrame"), "MONTHLY6");
    assert.ok(options.signal instanceof AbortSignal);
    const symbol = parsed.searchParams.get("fund");
    calls.push(symbol);
    return new Promise((resolve) =>
      releases.push(() =>
        resolve(
          Response.json({
            items: { [symbol]: [point(first, 2)] },
            data: { [symbol]: symbol },
          }),
        ),
      ),
    );
  });
  t.after(() => request.mock.restore());
  const pending = fetchFundChart("fund & name", "MONTHLY6", undefined, `${apiBase}///`);
  assert.deepEqual(calls, ["fund & name", "index"]);
  releases.forEach((release) => release());
  const result = await pending;
  assert.deepEqual(Object.keys(result.items), ["fund & name", "index"]);
});

test("does not fetch the index twice when it is the requested symbol", async (t) => {
  const request = t.mock.method(globalThis, "fetch", async () => Response.json({ items: {}, data: {} }));
  t.after(() => request.mock.restore());
  await fetchFundChart("index", "YEARLY", undefined, apiBase);
  assert.equal(request.mock.callCount(), 1);
});

test("does not issue requests without the API base URL or fund", async (t) => {
  const request = t.mock.method(globalThis, "fetch", () => assert.fail("Unexpected request"));
  t.after(() => request.mock.restore());
  await assert.rejects(fetchFundChart("naab", "YEARLY", undefined, ""), /required/);
  await assert.rejects(fetchFundChart(" ", "YEARLY", undefined, apiBase), /required/);
});

test("preserves API problem details and aborts the companion request on failure", async (t) => {
  let siblingSignal;
  const request = t.mock.method(globalThis, "fetch", async (url, { signal }) => {
    if (new URL(url).searchParams.get("fund") === "naab") {
      return Response.json({ detail: "اطلاعات صندوق یافت نشد." }, { status: 400 });
    }
    siblingSignal = signal;
    return new Promise((_resolve, reject) =>
      signal.addEventListener("abort", () => reject(signal.reason), { once: true }),
    );
  });
  t.after(() => request.mock.restore());
  await assert.rejects(fetchFundChart("naab", "YEARLY", undefined, apiBase), (error) => {
    assert.equal(getApiErrorMessage(error, "fallback"), "اطلاعات صندوق یافت نشد.");
    return true;
  });
  assert.equal(siblingSignal.aborted, true);
});

test("cancels chart, index, and summary requests when the component cancels its signal", async (t) => {
  const signals = [];
  const request = t.mock.method(globalThis, "fetch", (_url, { signal }) => {
    signals.push(signal);
    return new Promise((_resolve, reject) =>
      signal.addEventListener("abort", () => reject(signal.reason), { once: true }),
    );
  });
  t.after(() => request.mock.restore());
  const controller = new AbortController();
  const pending = fetchFundChart("naab", "YEARLY", controller.signal, apiBase);
  controller.abort();
  await assert.rejects(pending, { name: "AbortError" });
  assert.equal(signals.length, 3);
  assert.ok(signals.every((signal) => signal.aborted));
});

test("fetches summary alongside chart series and uses the selected timeframe for all supported funds", async (t) => {
  const calls = [];
  const releases = [];
  const request = t.mock.method(globalThis, "fetch", (url, { signal }) => {
    const parsed = new URL(url);
    calls.push(parsed);
    assert.ok(signal instanceof AbortSignal);
    return new Promise((resolve) =>
      releases.push(() =>
        resolve(
          Response.json(
            parsed.pathname === "/assetSummary"
              ? { data: { MONTHLY3: "0", MONTHLY6: "-12.34", YEARLY: "149.74" } }
              : { items: {}, data: {} },
          ),
        ),
      ),
    );
  });
  t.after(() => request.mock.restore());

  for (const [fund, summaryFund] of [
    ["naab", "naab"],
    ["asil", "asil"],
    ["pouya", "pouya"],
    ["pirooz", "pirooz"],
  ]) {
    for (const [timeframe, expected] of [
      ["MONTHLY3", 0],
      ["MONTHLY6", -12.34],
      ["YEARLY", 149.74],
    ]) {
      calls.length = 0;
      releases.length = 0;
      const pending = fetchFundChart(fund, timeframe, undefined, apiBase);
      assert.equal(calls.length, 3, "all three requests start before any finishes");
      const summary = calls.find((url) => url.pathname === "/assetSummary");
      assert.equal(summary.searchParams.get("fund"), summaryFund);
      assert.equal(summary.searchParams.has("timeFrame"), false);
      releases.forEach((release) => release());
      const response = await pending;
      assert.equal(response.returnRate, expected);
      assert.equal(prepareFundChartData(response).returnRate, expected);
    }
  }
});

test("validates summary data and preserves missing returns as unavailable", async (t) => {
  let payload;
  const request = t.mock.method(globalThis, "fetch", async (url) =>
    Response.json(new URL(url).pathname === "/assetSummary" ? payload : { items: {}, data: {} }),
  );
  t.after(() => request.mock.restore());
  for (const invalid of [
    null,
    {},
    { data: [] },
    { data: { YEARLY: "" } },
    { data: { YEARLY: "bad" } },
    { data: { YEARLY: false } },
  ]) {
    payload = invalid;
    await assert.rejects(fetchFundChart("naab", "YEARLY", undefined, apiBase), /Invalid fund/);
  }
  for (const data of [{}, { YEARLY: null }, { YEARLY: 0 }, { YEARLY: -2.5 }]) {
    payload = { data };
    const response = await fetchFundChart("naab", "YEARLY", undefined, apiBase);
    assert.equal(response.returnRate, data.YEARLY ?? null);
  }
});

test("summary API errors abort pending chart requests and preserve API error details", async (t) => {
  const signals = [];
  const request = t.mock.method(globalThis, "fetch", async (url, { signal }) => {
    if (new URL(url).pathname === "/assetSummary")
      return Response.json({ detail: "Summary unavailable" }, { status: 503 });
    signals.push(signal);
    return new Promise((_resolve, reject) =>
      signal.addEventListener("abort", () => reject(signal.reason), { once: true }),
    );
  });
  t.after(() => request.mock.restore());
  await assert.rejects(fetchFundChart("naab", "YEARLY", undefined, apiBase), (error) => {
    assert.equal(getApiErrorMessage(error, "fallback"), "Summary unavailable");
    return true;
  });
  assert.equal(signals.length, 2);
  assert.ok(signals.every((signal) => signal.aborted));
});

test("rejects malformed points and responses before rendering", async (t) => {
  let payload;
  const request = t.mock.method(globalThis, "fetch", async (url) =>
    Response.json(new URL(url).pathname === "/assetSummary" ? { data: { YEARLY: "10" } } : payload),
  );
  t.after(() => request.mock.restore());
  for (const invalid of [
    null,
    { items: [], data: {} },
    { items: { naab: {} }, data: {} },
    { items: { naab: [{ turnover: 1 }] }, data: {} },
    { items: { naab: [point(first, "invalid")] }, data: {} },
    { items: { naab: [point(1e20, 1)] }, data: {} },
    { items: {}, data: { naab: {} } },
  ]) {
    payload = invalid;
    await assert.rejects(fetchFundChart("naab", "YEARLY", undefined, apiBase), /Invalid fund chart/);
  }
});
