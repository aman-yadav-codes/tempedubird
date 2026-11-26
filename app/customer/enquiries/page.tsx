import React from "react";
import { CustomerEnquiriesView } from "@/components/customer/customer-enquiries-view";

export const metadata = {
  title: "My Inquiries | 143Panda",
  description: "View and track sent inquiries to businesses and professionals",
};

export default function CustomerEnquiriesPage() {
  return <CustomerEnquiriesView />;
}
