import { Metadata } from "next";
import { BusinessSubscriptionManager } from "@/components/subscription/business-subscription-manager";

export const metadata: Metadata = {
  title: "My Subscription | Business Growth Partner",
  description: "Monitor your listing data capacity, plan tier, and payment history.",
};

export default function CustomerSubscriptionPage() {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <BusinessSubscriptionManager />
    </div>
  );
}
