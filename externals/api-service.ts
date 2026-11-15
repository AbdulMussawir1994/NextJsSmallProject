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

type RequestOptions<T> = {
  method: "GET" | "POST" | "PUT" | "DELETE";
  parseData: (data: unknown) => T;
  body?: Employee;
  signal?: AbortSignal;
};

export const employeeAPI = {
  async list(signal?: AbortSignal): Promise<GenericResponse<Employee[]>> {
    return request("/List", {
      method: "GET",
      parseData: parseEmployees,
      signal,
    });
  },

  async get(id: string | number, signal?: AbortSignal): Promise<GenericResponse<Employee>> {
    return request(`/GetById/${parseId(id)}`, {
      method: "GET",
      parseData: parseEmployee,
      signal,
    });
  },

  async create(data: EmployeeInput, signal?: AbortSignal): Promise<GenericResponse<number>> {
    return request("/Add", {
      method: "POST",
      body: { ...data, id: 0 },
      signal,
      parseData(value) {
        if (!isEmployeeId(value)) {
          throw new ApiError("The API returned an invalid employee ID.", 502);
        }
        return value;
      },
    });
  },

  async update(
    id: string | number,
    data: EmployeeInput,
    signal?: AbortSignal,
  ): Promise<GenericResponse<Employee>> {
    return request("/Update", {
      method: "PUT",
      body: { ...data, id: parseId(id) },
      parseData: parseEmployee,
      signal,
    });
  },

  async delete(id: string | number, signal?: AbortSignal): Promise<GenericResponse<boolean>> {
    return request(`/Delete/${parseId(id)}`, {
      method: "DELETE",
      signal,
      parseData(value) {
        if (typeof value !== "boolean") {
          throw new ApiError("The API returned an invalid deletion result.", 502);
        }
        if (!value) {
          throw new ApiError("The API did not delete the employee.", 409);
        }
        return value;
      },
    });
  },
};

async function request<T>(path: string, options: RequestOptions<T>): Promise<GenericResponse<T>> {
  const { method, body, signal, parseData } = options;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isEmployeeId(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0 && value <= 2_147_483_647;
}

function parseId(id: string | number): number {
  const value = Number(id);
  if ((typeof id === "string" && !/^\d+$/.test(id)) || !isEmployeeId(value)) {
    throw new ApiError("Invalid employee ID.", 400);
  }
  return value;
}

function parseEmployee(value: unknown): Employee {
  if (!isRecord(value)) {
    throw new ApiError("The API returned an invalid employee response.", 502);
  }

  const { id, name, department, salary } = value;
  if (
    !isEmployeeId(id) ||
    typeof name !== "string" ||
    typeof department !== "string" ||
    typeof salary !== "number" ||
    !Number.isFinite(salary)
  ) {
    throw new ApiError("The API returned an invalid employee response.", 502);
  }
  return { id, name, department, salary };
}

function parseEmployees(value: unknown): Employee[] {
  if (!Array.isArray(value)) {
    throw new ApiError("The API returned an invalid employee list.", 502);
  }

  const ids = new Set<number>();
  return value.map((item) => {
    const employee = parseEmployee(item);
    if (ids.has(employee.id)) {
      throw new ApiError("The API returned duplicate employee IDs.", 502);
    }
    ids.add(employee.id);
    return employee;
  });
}
