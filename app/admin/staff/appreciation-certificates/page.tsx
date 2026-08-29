import { Trophy } from "lucide-react";
import { StaffComingSoon } from "@/app/admin/staff/coming-soon";

export default function StaffAppreciationCertificatesPage() {
  return (
    <StaffComingSoon
      title="Appreciation Certificates"
      description="Honor high-performing teachers, faculty, and support personnel with official awards and appreciation certificates."
      icon={Trophy}
      items={[
        "Teacher of the month & annual excellence awards",
        "Customizable appreciation certificate templates",
        "High-resolution printable PDF downloads",
        "Staff recognition showcase & portfolio records",
      ]}
    />
  );
}
