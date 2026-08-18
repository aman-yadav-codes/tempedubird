import { CreditCard } from "lucide-react";

import { StaffComingSoon } from "@/app/admin/staff/coming-soon";

export default function StaffSalarySlipsPage() {
  return (
    <StaffComingSoon
      title="Salary Slips"
      description="Prepare and download staff salary slips for each payroll cycle."
      icon={CreditCard}
      items={[
        "Monthly salary slip generation",
        "Institution payroll branding",
        "Staff-wise downloadable records",
        "Approval and issue history",
      ]}
    />
  );
}
