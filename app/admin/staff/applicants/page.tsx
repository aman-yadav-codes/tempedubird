import { UserCheck } from "lucide-react";
import { StaffComingSoon } from "@/app/admin/staff/coming-soon";

export default function StaffApplicantsPage() {
  return (
    <StaffComingSoon
      title="Staff Applicants"
      description="Track job candidates, review candidate resumes, manage interview schedules, and streamline hiring."
      icon={UserCheck}
      items={[
        "Applicant tracking system (ATS) candidate pipeline",
        "Resume parser & qualification screening",
        "Interview rounds & reviewer scorecards",
        "Offer letter triggering & onboarding conversion",
      ]}
    />
  );
}
