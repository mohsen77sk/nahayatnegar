import { createApiError } from "../utils/api-error.ts";

export interface InvestmentLead {
  phoneNumber: string;
  name: string;
  subject: string;
}

export async function sendInvestmentLead(lead: InvestmentLead): Promise<void> {
  const baseUrl = (import.meta.env?.PUBLIC_API_URL).replace(/\/+$/, "");
  const response = await fetch(`${baseUrl}/investmentLead`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(lead),
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw await createApiError(response);
  }
}
