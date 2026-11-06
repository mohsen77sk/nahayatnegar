import assert from "node:assert/strict";
import { test } from "node:test";
import { sendContactMessage } from "../src/services/contact.service.ts";
import { sendInvestmentLead } from "../src/services/investment-lead.service.ts";
import { getApiErrorMessage } from "../src/utils/api-error.ts";

const forms = [
  {
    name: "contact",
    submit: () => sendContactMessage({ name: "Test", email: "test@example.com", message: "Test" }),
    fallback: "ارسال پیام انجام نشد. لطفاً دوباره تلاش کنید.",
  },
  {
    name: "consultation",
    submit: () => sendInvestmentLead({ name: "Test", phoneNumber: "09123456789", subject: "" }),
    fallback: "ثبت درخواست مشاوره انجام نشد. لطفاً دوباره تلاش کنید.",
  },
];

for (const form of forms) {
  test(`${form.name}: displays the API problem detail`, async (t) => {
    const detail = "فرمت شماره موبایل صحیح نمیباشد";
    const request = t.mock.method(globalThis, "fetch", async () =>
      Response.json(
        { title: "Illegal logic encountered", type: "https://httpstatus.es/400", status: 400, detail },
        { status: 400 },
      ),
    );
    t.after(() => request.mock.restore());
    await assert.rejects(form.submit(), (error) => {
      assert.equal(getApiErrorMessage(error, form.fallback), detail);
      return true;
    });
  });

  for (const body of [{}, { detail: "" }, { detail: "   " }, { detail: null }, { detail: 123 }, null, "Bad Request"]) {
    test(`${form.name}: uses its fallback for ${JSON.stringify(body)}`, async (t) => {
      const request = t.mock.method(globalThis, "fetch", async () => Response.json(body, { status: 400 }));
      t.after(() => request.mock.restore());
      await assert.rejects(form.submit(), (error) => {
        assert.equal(getApiErrorMessage(error, form.fallback), form.fallback);
        return true;
      });
    });
  }

  for (const body of [null, "<html>Bad gateway</html>"]) {
    test(`${form.name}: uses its fallback for an empty or non-JSON response (${body === null ? "empty" : "HTML"})`, async (t) => {
      const request = t.mock.method(globalThis, "fetch", async () => new Response(body, { status: 502 }));
      t.after(() => request.mock.restore());
      await assert.rejects(form.submit(), (error) => {
        assert.equal(getApiErrorMessage(error, form.fallback), form.fallback);
        return true;
      });
    });
  }

  for (const error of [new TypeError("Failed to fetch"), new DOMException("Timed out", "TimeoutError")]) {
    test(`${form.name}: uses its fallback for ${error.name}`, async (t) => {
      const request = t.mock.method(globalThis, "fetch", async () => {
        throw error;
      });
      t.after(() => request.mock.restore());
      await assert.rejects(form.submit(), (caught) => {
        assert.equal(getApiErrorMessage(caught, form.fallback), form.fallback);
        return true;
      });
    });
  }
}
