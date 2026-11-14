import { Suspense } from "react";
import EmployeeRecord, { type EmployeeMode } from "@/components/employee-record";
import { LoadingState } from "@/components/employee-ui";

type EmployeeRouteProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ message?: string | string[] }>;
  mode?: EmployeeMode;
};

export default function EmployeeRoute(props: EmployeeRouteProps) {
  return (
    <Suspense fallback={<div className="narrow-page"><LoadingState /></div>}>
      <EmployeeContent {...props} />
    </Suspense>
  );
}

async function EmployeeContent({ params, searchParams, mode }: EmployeeRouteProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const message = typeof query?.message === "string" ? query.message : undefined;
  return <EmployeeRecord key={id} id={id} mode={mode} message={message} />;
}
