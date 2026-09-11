import { Metadata } from "next";
import { MyDataClient } from "@/app/admin/staff/my-data/my-data-client";

export const metadata: Metadata = {
  title: "My Data | Workspace",
  description: "View employee records, notices, complaints, tasks, and performance.",
};

export default function PlatformAdminMyDataPage() {
  return <MyDataClient />;
}
