import { Metadata } from "next";
import { StaffPerformanceClient } from "./staff-performance-client";

export const metadata: Metadata = {
  title: "Employee Performance | Manage Staff",
  description: "Monitor and evaluate employee deliverables, tasks completed, financial contribution, and staff ROI metrics.",
};

export default function StaffPerformancePage() {
  return <StaffPerformanceClient />;
}
