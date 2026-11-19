import { Metadata } from "next";
import { BusinessSubscriptionManager } from "@/components/subscription/business-subscription-manager";

export const metadata: Metadata = {
  title: "Subscription & Listing Usage | Business Growth Hub",
  description: "Manage your business growth package, listing data capacity, and billing.",
};

export default function WorkspaceSubscriptionPage() {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <BusinessSubscriptionManager />
    </div>
  );
}
