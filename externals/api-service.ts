import type { Employee, EmployeeInput, GenericResponse } from "@/model/model";
import { request } from "./http-client";
import {
  parseCreatedId,
  parseDeletionResult,
  parseEmployee,
  parseEmployees,
  parseId,
} from "./employee-validation";

export { ApiError } from "./http-client";

export class EmployeeApiService {
  async list(signal?: AbortSignal): Promise<GenericResponse<Employee[]>> {
    return request("/List", {
      method: "GET",
      parseData: parseEmployees,
      signal,
    });
  }

  async get(id: string | number, signal?: AbortSignal): Promise<GenericResponse<Employee>> {
    return request(`/GetById/${parseId(id)}`, {
      method: "GET",
      parseData: parseEmployee,
      signal,
    });
  }

  async create(data: EmployeeInput, signal?: AbortSignal): Promise<GenericResponse<number>> {
    return request("/Add", {
      method: "POST",
      body: { ...data, id: 0 },
      parseData: parseCreatedId,
      signal,
    });
  }

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
  }

  async delete(id: string | number, signal?: AbortSignal): Promise<GenericResponse<boolean>> {
    return request(`/Delete/${parseId(id)}`, {
      method: "DELETE",
      parseData: parseDeletionResult,
      signal,
    });
  }
}

export const employeeAPI = new EmployeeApiService();
