import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import { prepareFundChartData, isFundTimeframe, toFarsiDigits } from "../src/utils/fund-chart.ts";
import { getApiErrorMessage } from "../src/utils/api-error.ts";

const source = await readFile(new URL("../src/components/FundChart.astro", import.meta.url), "utf8");
const script = stripTypeScriptTypes(
  source.match(/<script>([\s\S]*?)<\/script>/)[1].replace(/import\s+[\s\S]*?\s+from\s+["'][^"']+["'];/g, ""),
);

function setup() {
  const requests = [];
  const charts = [];
  let Component;

  class Element {
    dataset = {};
    hidden = false;
    attributes = new Map();
    setAttribute(name, value) {
      this.attributes.set(name, value);
    }
  }

  class Host extends Element {
    dataset = { fund: "naab", defaultTimeframe: "MONTHLY6" };
    isConnected = true;
    nodes = new Map();
    listeners = [];
    addEventListener(type, handler, options) {
      this.listeners.push({ type, handler, options });
    }
    querySelectorAll() {
      return [];
    }
    querySelector(selector) {
      if (!this.nodes.has(selector)) this.nodes.set(selector, new Element());
      return this.nodes.get(selector);
    }
  }

  class Chart {
    static register() {}
    constructor(_canvas, configuration) {
      this.data = configuration.data;
      this.updates = 0;
      charts.push(this);
    }
    update() {
      this.updates++;
    }
    setDatasetVisibility() {}
    destroy() {
      this.destroyed = true;
    }
  }

  runInNewContext(script, {
    HTMLElement: Host,
    Element,
    Chart,
    LineController: {},
    LineElement: {},
    PointElement: {},
    LinearScale: {},
    CategoryScale: {},
    Tooltip: {},
    AbortController,
    isFundTimeframe,
    prepareFundChartData,
    toFarsiDigits,
    getApiErrorMessage,
    fetchFundChart(fund, timeframe, signal) {
      return new Promise((resolve, reject) => requests.push({ fund, timeframe, signal, resolve, reject }));
    },
    customElements: {
      get: () => undefined,
      define: (_name, implementation) => {
        Component = implementation;
      },
    },
  });

  const host = new Component();
  // These tests exercise request ordering and lifecycle; template rendering is separate.
  host.renderLegends = () => {};
  return { host, requests, charts };
}

function response(value) {
  return { items: { naab: [{ event_date: 1735689600, turnover: value }] }, data: { naab: "ناب" }, returnRate: value };
}

test("uses the configured default timeframe on connection", async () => {
  const { host, requests, charts } = setup();
  host.connectedCallback();
  assert.equal(requests[0].timeframe, "MONTHLY6");
  requests[0].resolve(response(6));
  await new Promise(setImmediate);
  assert.equal(host.querySelector(".chart-wrapper").dataset.state, "ready");
  assert.equal(charts[0].data.datasets[0].data[0], 6);
  assert.equal(host.querySelector("[data-return-rate]").textContent, `${toFarsiDigits(6)}٪`);
});

test("cancels the older request and ignores its late successful response", async () => {
  const { host, requests, charts } = setup();
  const oldLoad = host.load("YEARLY");
  const newLoad = host.load("MONTHLY3");
  assert.equal(requests[0].signal.aborted, true);
  requests[1].resolve(response(3));
  await newLoad;
  requests[0].resolve(response(12));
  await oldLoad;
  assert.equal(charts.length, 1);
  assert.equal(charts[0].data.datasets[0].data[0], 3);
  assert.equal(host.querySelector("[data-return-rate]").textContent, `${toFarsiDigits(3)}٪`);
  assert.equal(host.querySelector(".chart-wrapper").dataset.state, "ready");
});

test("ignores a late error from a superseded request", async () => {
  const { host, requests } = setup();
  const oldLoad = host.load("YEARLY");
  const newLoad = host.load("MONTHLY3");
  requests[1].resolve(response(3));
  await newLoad;
  requests[0].reject(new Error("Old request failed"));
  await oldLoad;
  assert.equal(host.querySelector(".chart-wrapper").dataset.state, "ready");
});

test("reuses the chart and cached timeframe data", async () => {
  const { host, requests, charts } = setup();
  const yearly = host.load("YEARLY");
  requests[0].resolve(response(12));
  await yearly;
  const quarterly = host.load("MONTHLY3");
  requests[1].resolve(response(3));
  await quarterly;
  await host.load("YEARLY");
  assert.equal(requests.length, 2);
  assert.equal(charts.length, 1);
  assert.equal(charts[0].data.datasets[0].data[0], 12);
  assert.equal(host.querySelector("[data-return-rate]").textContent, `${toFarsiDigits(12)}٪`);
});

test("disconnect cancels work, removes listeners, and destroys the chart", async () => {
  const { host, requests, charts } = setup();
  host.connectedCallback();
  requests[0].resolve(response(6));
  await new Promise(setImmediate);
  const pending = host.load("YEARLY");
  host.isConnected = false;
  host.disconnectedCallback();
  assert.equal(requests[1].signal.aborted, true);
  assert.equal(host.listeners[0].options.signal.aborted, true);
  assert.equal(charts[0].destroyed, true);
  requests[1].resolve(response(12));
  await pending;
  assert.equal(charts.length, 1);
});

test("shows empty and error states and allows retrying a failed timeframe", async () => {
  const { host, requests } = setup();
  const empty = host.load("MONTHLY3");
  requests[0].resolve({ items: {}, data: {} });
  await empty;
  assert.equal(host.querySelector(".chart-wrapper").dataset.state, "empty");

  const failing = host.load("YEARLY");
  requests[1].reject(new TypeError("Network error"));
  await failing;
  assert.equal(host.querySelector(".chart-wrapper").dataset.state, "error");
  assert.equal(host.querySelector("[data-retry]").hidden, false);

  const retry = host.load("YEARLY");
  requests[2].resolve(response(12));
  await retry;
  assert.equal(host.querySelector(".chart-wrapper").dataset.state, "ready");
});

test("displays negative and unavailable return rates without stale values while loading", async () => {
  const { host, requests } = setup();
  const first = host.load("YEARLY");
  requests[0].resolve(response(-2.5));
  await first;
  assert.equal(host.querySelector("[data-return-rate]").textContent, `${new Intl.NumberFormat("fa-IR").format(-2.5)}٪`);
  assert.equal(host.querySelector("[data-return-rate]").dataset.negative, "true");
  const next = host.load("MONTHLY3");
  assert.equal(host.querySelector("[data-return-rate]").textContent, "--٪");
  requests[1].resolve({ ...response(3), returnRate: null });
  await next;
  assert.equal(host.querySelector("[data-return-rate]").textContent, "--٪");
  assert.equal(host.querySelector("[data-return-rate]").dataset.negative, "false");
});
