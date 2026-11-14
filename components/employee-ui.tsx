import Link from "next/link";
import type { ReactNode } from "react";
import Spinner from "@/components/spinner";

export function EmployeeScreen({ title, description, children, actions, back = false }: {
  title: ReactNode;
  description: string;
  children?: ReactNode;
  actions?: ReactNode;
  back?: boolean;
}) {
  return (
    <div className={back ? "narrow-page" : undefined}>
      {back && <Link href="/employees" className="back-link">&larr; All employees</Link>}
      <div className="page-heading">
        <div>
          <p className="eyebrow">EMPLOYEE DIRECTORY</p>
          <h1>{title}</h1>
          <p className="muted">{description}</p>
        </div>
        {actions}
      </div>
      {children}
    </div>
  );
}

export function LoadingState({ text = "Loading employee...", card = true }) {
  return (
    <div className={`${card ? "card " : ""}empty-state loading-state`} role="status">
      <Spinner size="large" />
      <span>{text}</span>
    </div>
  );
}

export function ErrorNotice({ message, retry }: { message: string; retry?: () => void }) {
  return message ? (
    <div className="notice notice-error" role="alert">
      <span>{message}</span>
      {retry && <button className="text-button" type="button" onClick={retry}>Try again</button>}
    </div>
  ) : null;
}

export function BusyButton({
  busy, children, busyText = "Saving...", danger = false, type = "button", onClick,
}: {
  busy: boolean;
  children: ReactNode;
  busyText?: string;
  danger?: boolean;
  type?: "button" | "submit";
  onClick?: () => void;
}) {
  return (
    <button type={type} className={`button button-${danger ? "danger" : "primary"}`}
      disabled={busy} aria-busy={busy} onClick={onClick}>
      {busy && <Spinner />}
      {busy ? busyText : children}
    </button>
  );
}
