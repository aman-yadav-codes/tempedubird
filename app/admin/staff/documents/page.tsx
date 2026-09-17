import { Metadata } from "next";
import { MyDataClient } from "../my-data/my-data-client";

export const metadata: Metadata = {
  title: "Staff Documents & Records | Employee Workspace",
  description: "View and manage staff documents, letters, certificates, attendance, performance, complaints, and queries.",
};

export default function StaffDocumentsPage() {
  return <MyDataClient initialTab="documents" />;
}
