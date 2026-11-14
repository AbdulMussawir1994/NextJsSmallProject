import EmployeeRoute from "@/components/employee-route";

export default function ViewEmployeePage(props: PageProps<"/employees/[id]">) {
  return <EmployeeRoute {...props} />;
}
