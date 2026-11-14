export type Employee = {
  id: number;
  name: string;
  department: string;
  salary: number;
};

export type EmployeeInput = Omit<Employee, "id">;

export type GenericResponse<T> = {
  data: T;
  isSuccess: boolean;
  message: string;
  status: number;
};

