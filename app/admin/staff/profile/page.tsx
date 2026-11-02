import { Metadata } from "next";
import { StaffProfileClient } from "./profile-client";

export const metadata: Metadata = {
  title: "Staff Profile",
  description: "View detailed staff member profile, employment history, and records.",
};

export default function StaffProfilePage() {
  return <StaffProfileClient />;
}
