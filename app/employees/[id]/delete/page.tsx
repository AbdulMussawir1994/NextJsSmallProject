import EmployeeRoute from "@/components/employee-route";

export default function DeleteEmployeePage({ params }: PageProps<"/employees/[id]/delete">) {
  return <EmployeeRoute params={params} mode="delete" />;
}
