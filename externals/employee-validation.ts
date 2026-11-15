import type { Employee } from "@/model/model";
import { ApiError, isRecord } from "./http-client";

function isEmployeeId(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0 && value <= 2_147_483_647;
}

export function parseId(id: string | number): number {
  const value = Number(id);
  if ((typeof id === "string" && !/^\d+$/.test(id)) || !isEmployeeId(value)) {
    throw new ApiError("Invalid employee ID.", 400);
  }
  return value;
}

export function parseEmployee(value: unknown): Employee {
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

export function parseEmployees(value: unknown): Employee[] {
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

export function parseCreatedId(value: unknown): number {
  if (!isEmployeeId(value)) {
    throw new ApiError("The API returned an invalid employee ID.", 502);
  }
  return value;
}

export function parseDeletionResult(value: unknown): boolean {
  if (typeof value !== "boolean") {
    throw new ApiError("The API returned an invalid deletion result.", 502);
  }
  if (!value) {
    throw new ApiError("The API did not delete the employee.", 409);
  }
  return value;
}
