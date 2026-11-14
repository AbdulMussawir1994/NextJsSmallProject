"use client";

import Link from "next/link";
import { useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BusyButton, ErrorNotice } from "@/components/employee-ui";
import { employeeAPI } from "@/externals/api-service";
import type { Employee } from "@/model/model";

export default function EmployeeDelete({ employee }: { employee: Employee }) {
  const router = useRouter();
  const visible = useRef(true);
  const locked = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useLayoutEffect(() => {
    visible.current = true;
    return () => { visible.current = false; };
  }, []);

  async function remove() {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      const { message } = await employeeAPI.delete(employee.id);
      if (visible.current) router.replace(`/employees?message=${encodeURIComponent(message)}`);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not delete the employee.");
      locked.current = false;
      setBusy(false);
    }
  }

  return (
    <section className="card form-card" aria-label="Confirm employee deletion" aria-busy={busy}>
      <ErrorNotice message={error} />
      <h2>Delete {employee.name}?</h2>
      <p className="muted">This will permanently remove this employee.</p>
      <div className="form-footer">
        {busy ? <span className="button button-secondary" aria-disabled="true">Cancel</span> :
          <Link href="/employees" className="button button-secondary">Cancel</Link>}
        <BusyButton busy={busy} busyText="Deleting..." danger onClick={remove}>Delete employee</BusyButton>
      </div>
    </section>
  );
}
