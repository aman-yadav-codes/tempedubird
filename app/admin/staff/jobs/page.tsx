import { Briefcase } from "lucide-react";
import { StaffComingSoon } from "@/app/admin/staff/coming-soon";

export default function StaffJobsPage() {
  return (
    <StaffComingSoon
      title="Our Jobs"
      description="Create, publish, and manage faculty vacancies, staff job openings, and department recruitment drives."
      icon={Briefcase}
      items={[
        "Job posting & requirements builder",
        "Public and campus career page publishing",
        "Department-wise hiring budget & vacancy tracker",
        "Job application link & social share generator",
      ]}
    />
  );
}
