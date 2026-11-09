import { createApiError } from "../utils/api-error.ts";

export interface ContactMessage {
  name: string;
  email: string;
  message: string;
}

export async function sendContactMessage(message: ContactMessage): Promise<void> {
  const baseUrl = (import.meta.env?.PUBLIC_API_URL).replace(/\/+$/, "");
  const response = await fetch(`${baseUrl}/contact-us`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(message),
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw await createApiError(response);
  }
}
