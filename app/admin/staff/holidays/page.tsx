import { CalendarDays } from "lucide-react";
import { StaffComingSoon } from "@/app/admin/staff/coming-soon";

export default function StaffHolidaysPage() {
  return (
    <StaffComingSoon
      title="Staff Holidays"
      description="Configure and manage official staff holidays, vacation schedules, and institutional leave calendars."
      icon={CalendarDays}
      items={[
        "Annual staff holiday calendar setup",
        "National & regional declared holiday lists",
        "Department-wise leave exclusions & working days",
        "Synchronized staff attendance calendar",
      ]}
    />
  );
}
