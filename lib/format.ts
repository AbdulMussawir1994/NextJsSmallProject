const salaryFormat = new Intl.NumberFormat("en", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatSalary = (salary: number) => salaryFormat.format(salary);
