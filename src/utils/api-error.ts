export class ApiError extends Error {
  readonly detail: string;

  constructor(status: number, detail = "") {
    super(`API request failed (HTTP ${status}).`);
    this.name = "ApiError";
    this.detail = detail;
  }
}

export async function createApiError(response: Response): Promise<ApiError> {
  let detail = "";

  try {
    const body: unknown = await response.json();
    if (body && typeof body === "object" && "detail" in body && typeof body.detail === "string") {
      detail = body.detail.trim();
    }
  } catch {
    // Empty and non-JSON responses use the form's default error message.
  }

  return new ApiError(response.status, detail);
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError && error.detail ? error.detail : fallback;
}
