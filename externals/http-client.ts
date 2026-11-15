import type { GenericResponse } from "@/model/model";

const baseUrl = (
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "https://localhost:7047"
).replace(/\/+$/, "");

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

export type RequestOptions<T> = {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  parseData: (data: unknown) => T;
  body?: unknown;
  signal?: AbortSignal;
};

export async function request<T>(
  path: string,
  options: RequestOptions<T>,
): Promise<GenericResponse<T>> {
  const { method, body, signal, parseData } = options;
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    signal,
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }).catch((error: unknown) => {
    if (signal?.aborted) throw error;
    throw new ApiError(
      "Internal Server Error: The API request failed. Please try again.",
      0,
    );
  });
  const payload: unknown = await response.json().catch(() => null);
  signal?.throwIfAborted();
  const message = isRecord(payload) && typeof payload.message === "string" ? payload.message.trim() : "";

  if (!response.ok) {
    throw new ApiError(
      message || `The API request failed (${response.status}). Please try again.`,
      response.status,
    );
  }

  if (
    !isRecord(payload) ||
    typeof payload.isSuccess !== "boolean" ||
    typeof payload.message !== "string" ||
    typeof payload.status !== "number" ||
    !Number.isInteger(payload.status)
  ) {
    throw new ApiError("The API returned an invalid response wrapper.", 502);
  }

  if (!payload.isSuccess || payload.status < 200 || payload.status >= 300) {
    throw new ApiError(message || "The employee operation failed.", payload.status);
  }

  return {
    data: parseData(payload.data),
    isSuccess: payload.isSuccess,
    message: payload.message,
    status: payload.status,
  };
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
