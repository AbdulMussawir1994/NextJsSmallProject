import EmployeeForm from "@/components/employee-form";
import { EmployeeScreen } from "@/components/employee-ui";

export default function AddEmployeePage() {
  return (
    <EmployeeScreen back title="Add employee" description="Create a new employee record.">
      <EmployeeForm />
    </EmployeeScreen>
  );
}
