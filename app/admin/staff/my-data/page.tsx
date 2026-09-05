import { Metadata } from "next";
import { MyDataClient } from "./my-data-client";

export const metadata: Metadata = {
  title: "My Data | Employee Workspace",
  description: "View all employee records including notices, complaints, tasks, performance, attendance, queries, and issued documents.",
};

export default function MyDataPage() {
  return <MyDataClient />;
}
