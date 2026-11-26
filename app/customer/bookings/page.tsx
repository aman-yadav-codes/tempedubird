import React from "react";
import { CustomerBookingsView } from "@/components/customer/customer-bookings-view";

export const metadata = {
  title: "My Service Bookings | 143Panda",
  description: "View and manage service appointments and bookings",
};

export default function CustomerBookingsPage() {
  return <CustomerBookingsView />;
}
