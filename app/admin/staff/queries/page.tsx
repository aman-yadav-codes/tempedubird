import { HelpCircle } from "lucide-react";
import { StaffComingSoon } from "@/app/admin/staff/coming-soon";

export default function StaffQueriesPage() {
  return (
    <StaffComingSoon
      title="Staff Queries"
      description="Manage staff help requests, grievance tickets, queries, and internal resolution status."
      icon={HelpCircle}
      items={[
        "Staff query ticketing & prioritization",
        "Assigned department & admin responders",
        "Resolution logs and query status tracking",
        "Direct email & SMS query notifications",
      ]}
    />
  );
}
