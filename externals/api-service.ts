import type { Employee, EmployeeInput, GenericResponse } from "@/model/model";

const baseUrl = (
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "https://localhost:7047"
).replace(/\/+$/, "");

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

function assertValid(
  condition: unknown,
  message = "The API returned an invalid employee response.",
  status = 502,
): asserts condition {
  if (!condition) throw new ApiError(message, status);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isEmployeeId(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0 && value <= 2_147_483_647;
}

function parseId(id: string | number): number {
  const value = Number(id);
  assertValid(
    (typeof id !== "string" || /^\d+$/.test(id)) && isEmployeeId(value),
    "Invalid employee ID.",
    400,
  );
  return value;
}

function parseEmployee(value: unknown): Employee {
  assertValid(isRecord(value));
  const { id, name, department, salary } = value;
  assertValid(
    isEmployeeId(id) && typeof name === "string" && typeof department === "string" &&
    typeof salary === "number" && Number.isFinite(salary),
  );
  return { id, name, department, salary };
}

function parseEmployees(value: unknown): Employee[] {
  assertValid(Array.isArray(value));
  const ids = new Set<number>();
  return value.map((item) => {
    const employee = parseEmployee(item);
    assertValid(!ids.has(employee.id));
    ids.add(employee.id);
    return employee;
  });
}

async function request<T>(
  path: string,
  method: "GET" | "POST" | "PUT" | "DELETE",
  parseData: (data: unknown) => T,
  body?: Employee,
  signal?: AbortSignal,
): Promise<GenericResponse<T>> {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    signal,
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  }).catch((error: unknown) => {
    if (signal?.aborted) throw error;
    throw new ApiError(
      "Could not reach the employee API. Check that the backend is running, its HTTPS certificate is trusted, and CORS allows this app.",
      0,
    );
  });
  const payload: unknown = await response.json().catch(() => null);
  signal?.throwIfAborted();
  const message = isRecord(payload) && typeof payload.message === "string" ? payload.message.trim() : "";

  assertValid(
    response.ok,
    message || `The API request failed (${response.status}). Please try again.`,
    response.status,
  );
  assertValid(
    isRecord(payload) && typeof payload.isSuccess === "boolean" &&
    typeof payload.message === "string" && typeof payload.status === "number" &&
    Number.isInteger(payload.status),
  );
  assertValid(
    payload.isSuccess && payload.status >= 200 && payload.status < 300,
    message || "The employee operation failed.",
    payload.status,
  );
  return {
    data: parseData(payload.data),
    isSuccess: payload.isSuccess,
    message: payload.message,
    status: payload.status,
  };
}

export const employeeAPI = {
  list(signal?: AbortSignal) {
    return request("/List", "GET", parseEmployees, undefined, signal);
  },
  async get(id: string | number, signal?: AbortSignal) {
    return request(`/GetById/${parseId(id)}`, "GET", parseEmployee, undefined, signal);
  },
  create(data: EmployeeInput) {
    return request("/Add", "POST", (value) => {
      assertValid(isEmployeeId(value));
      return value;
    }, { ...data, id: 0 });
  },
  async update(id: string | number, data: EmployeeInput) {
    return request("/Update", "PUT", parseEmployee, { ...data, id: parseId(id) });
  },
  async delete(id: string | number) {
    return request<boolean>(`/Delete/${parseId(id)}`, "DELETE", (value) => {
      assertValid(typeof value === "boolean");
      assertValid(value, "The API did not delete the employee.", 409);
      return value;
    });
  },
};
