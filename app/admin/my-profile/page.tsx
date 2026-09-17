import { Metadata } from "next";
import { Suspense } from "react";
import { MyProfileClient } from "./my-profile-client";

export const metadata: Metadata = {
  title: "My Profile | EduBird Workspace",
  description: "View and manage your own attendance, salary slips, assigned tasks, performance, queries, complaints, and personal records.",
};

export default function MyProfilePage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground animate-pulse">Loading profile...</div>}>
      <MyProfileClient />
    </Suspense>
  );
}

