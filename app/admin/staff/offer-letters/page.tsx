import { Mail } from "lucide-react";
import { StaffComingSoon } from "@/app/admin/staff/coming-soon";

export default function StaffOfferLettersPage() {
  return (
    <StaffComingSoon
      title="Offer Letters"
      description="Draft, generate, and issue branded employment offer letters for newly selected faculty and staff."
      icon={Mail}
      items={[
        "Customizable offer letter templates",
        "Role, compensation, and joining date variables",
        "Digital candidate acceptance & signatures",
        "PDF generation and direct email dispatch",
      ]}
    />
  );
}
