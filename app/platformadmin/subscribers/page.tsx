import { Metadata } from "next";
import { PlatformSubscribersManager } from "@/components/platform-admin/subscribers/platform-subscribers-manager";

export const metadata: Metadata = {
  title: "Subscribed Users | Platform Admin",
  description: "View and manage all newsletter subscribers with tracking of which page they subscribed from.",
};

export default function PlatformAdminSubscribersPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full">
      <PlatformSubscribersManager />
    </div>
  );
}
