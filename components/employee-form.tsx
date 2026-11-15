"use client";

import { useLayoutEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BusyButton, ErrorNotice } from "@/components/employee-ui";
import { employeeAPI } from "@/externals/api-service";
import type { Employee, EmployeeInput } from "@/model/model";

const fields = [
  { name: "name", label: "Full name", placeholder: "e.g. Alex Morgan" },
  { name: "department", label: "Department", placeholder: "e.g. Engineering" },
  { name: "salary", label: "Salary", placeholder: "e.g. 5000" },
] as const;

export default function EmployeeForm({ employee }: { employee?: Employee }) {
  const router = useRouter();
  const visible = useRef(true);
  const phase = useRef<"idle" | "saving" | "saved">("idle");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useLayoutEffect(() => {
    visible.current = true;
    return () => {
      visible.current = false;
      setError("");
      if (phase.current === "saved") {
        phase.current = "idle";
        setSaving(false);
      }
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (phase.current !== "idle") return;
    const form = event.currentTarget;
    const values = new FormData(form);
    const text = (name: string) => String(values.get(name) ?? "").trim();
    const salary = text("salary");
    const data: EmployeeInput = {
      name: text("name"),
      department: text("department"),
      salary: Number(salary),
    };
    setError("");
    if (
      !data.name ||
      !data.department ||
      !salary ||
      !Number.isFinite(data.salary) ||
      data.salary < 0
    ) {
      setError("Enter a name, department, and a salary of zero or more.");
      return;
    }

    phase.current = "saving";
    setSaving(true);
    try {
      const response = employee
        ? await employeeAPI.update(employee.id, data)
        : await employeeAPI.create(data);

      const id =
        typeof response.data === "number" ? response.data : response.data.id;
      if (!employee) form.reset();
      phase.current = "saved";
      if (visible.current) {
        // router.replace(`/employees?message=${encodeURIComponent(response.message)}`);
        router.replace(
          `/employees/${id}?message=${encodeURIComponent(response.message)}`,
        );
      } else {
        phase.current = "idle";
        setSaving(false);
      }
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Could not save the employee.",
      );
      phase.current = "idle";
      setSaving(false);
    }
  }

  return (
    <form className="card form-card" onSubmit={handleSubmit} aria-busy={saving}>
      <div className="card-heading">
        <h2>Employee details</h2>
        <p className="muted">
          {employee
            ? `Employee ID: ${employee.id}`
            : "An employee ID will be generated when you save."}
        </p>
      </div>
      <ErrorNotice message={error} />
      <fieldset disabled={saving} className="form-fields">
        {fields.map(({ name, label, placeholder }) => (
          <div
            key={name}
            className={`field${name === "name" ? " full-width" : ""}`}
          >
            <label htmlFor={name}>
              {label} <span className="required">*</span>
            </label>
            <input
              id={name}
              name={name}
              defaultValue={employee?.[name] ?? ""}
              placeholder={placeholder}
              type={name === "salary" ? "number" : "text"}
              min={name === "salary" ? 0 : undefined}
              step={name === "salary" ? "0.01" : undefined}
              autoComplete={name === "name" ? "name" : undefined}
              required
            />
          </div>
        ))}
      </fieldset>
      <div className="form-footer">
        <span className="field-hint">* Required fields</span>
        <div className="actions">
          {saving ? (
            <span className="button button-secondary" aria-disabled="true">
              Cancel
            </span>
          ) : (
            <Link href="/employees" className="button button-secondary">
              Cancel
            </Link>
          )}
          <BusyButton busy={saving} type="submit">
            {employee ? "Save changes" : "Add employee"}
          </BusyButton>
        </div>
      </div>
    </form>
  );
}
