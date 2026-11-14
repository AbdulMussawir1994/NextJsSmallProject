"use client";

import Link from "next/link";
import { useCallback } from "react";
import EmployeeForm from "@/components/employee-form";
import EmployeeDelete from "@/components/employee-delete";
import { EmployeeScreen, ErrorNotice, LoadingState } from "@/components/employee-ui";
import { employeeAPI } from "@/externals/api-service";
import useApiData from "@/hooks/use-api-data";
import { formatSalary } from "@/lib/format";

export type EmployeeMode = "view" | "edit" | "delete";
const descriptions = {
  view: "Employee information at a glance.",
  edit: "Update the employee details below.",
  delete: "Review the employee before deleting.",
};

export default function EmployeeRecord({ id, mode = "view", message }: {
  id: string;
  mode?: EmployeeMode;
  message?: string;
}) {
  const load = useCallback((signal: AbortSignal) => employeeAPI.get(id, signal), [id]);
  const { data: employee, loading, error, retry } = useApiData(load);

  return (
    <EmployeeScreen back title={`${mode[0].toUpperCase()}${mode.slice(1)} employee`}
      description={descriptions[mode]}>
      {message && <p className="notice notice-success" role="status">{message}</p>}
      {loading ? <LoadingState /> : <ErrorNotice message={error} retry={retry} />}
      {employee && <div hidden={loading || !!error}>
        {mode === "edit" ? (
          <EmployeeForm key={JSON.stringify(employee)} employee={employee} />
        ) : mode === "delete" ? <EmployeeDelete employee={employee} /> : (
          <section className="card" aria-label="Employee details">
            <div className="profile-heading">
              <div><h2>{employee.name}</h2><p className="muted">{employee.department}</p></div>
              <Link className="button button-primary" href={`/employees/${employee.id}/edit`}>
                Edit employee
              </Link>
            </div>
            <dl className="detail-grid">
              {Object.entries({
                "Employee ID": employee.id, "Full name": employee.name,
                Department: employee.department, Salary: formatSalary(employee.salary),
              }).map(([label, value]) => (
                <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
              ))}
            </dl>
          </section>
        )}
      </div>}
    </EmployeeScreen>
  );
}
