"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { employeeAPI } from "@/externals/api-service";
import useApiData from "@/hooks/use-api-data";
import { EmployeeScreen, ErrorNotice, LoadingState } from "@/components/employee-ui";
import { formatSalary } from "@/lib/format";

export default function EmployeeList() {
  const { data, loading, error, retry } = useApiData(employeeAPI.list);
  const message = useSearchParams().get("message");
  const employees = data ?? [];

  return (
    <EmployeeScreen
      title={<>Employees {!loading && <span className="count">{employees.length}</span>}</>}
      description="View and manage your employee records."
      actions={<Link href="/employees/add" className="button button-primary">+ Add Employee</Link>}
    >
      {message && <p className="notice notice-success" role="status">{message}</p>}
      <ErrorNotice message={error} retry={retry} />
      <section className="card" aria-label="Employee list" aria-busy={loading}>
        {loading ? <LoadingState text="Loading employees..." card={false} /> : error ? null :
          employees.length === 0 ? (
            <div className="empty-state">
              <h2>No employees yet</h2>
              <p className="muted">Add your first employee to get started.</p>
              <Link href="/employees/add" className="button button-primary">Add Employee</Link>
            </div>
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th scope="col">ID</th><th scope="col">Employee</th>
                    <th scope="col">Department</th><th scope="col" className="number">Salary</th>
                    <th scope="col" className="actions-heading">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((employee) => {
                    const path = `/employees/${employee.id}`;
                    return (
                      <tr key={employee.id}>
                        <td className="employee-id">{employee.id}</td>
                        <th scope="row">{employee.name}</th>
                        <td><span className="department">{employee.department}</span></td>
                        <td className="number">{formatSalary(employee.salary)}</td>
                        <td><div className="row-actions">
                          <Link href={path} aria-label={`View ${employee.name}`}>View</Link>
                          <Link href={`${path}/edit`} aria-label={`Edit ${employee.name}`}>Edit</Link>
                          <Link href={`${path}/delete`} className="danger-text"
                            aria-label={`Delete ${employee.name}`}>Delete</Link>
                        </div></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="table-footer">
                {employees.length} employee{employees.length === 1 ? "" : "s"}
              </div>
            </div>
          )}
      </section>
    </EmployeeScreen>
  );
}
