import { Suspense } from "react";
import EmployeeList from "@/components/employee-list";
import { LoadingState } from "@/components/employee-ui";

export default function EmployeesPage() {
  return (
    <Suspense fallback={<LoadingState text="Loading employees..." />}>
      <EmployeeList />
    </Suspense>
  );
}
