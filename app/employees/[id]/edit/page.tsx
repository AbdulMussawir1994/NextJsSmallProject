import EmployeeRoute from "@/components/employee-route";

export default function EditEmployeePage({ params }: PageProps<"/employees/[id]/edit">) {
  return <EmployeeRoute params={params} mode="edit" />;
}
