import React from "react";
import { SalesBookingsView } from "@/components/sales/sales-bookings-view";

export const metadata = {
  title: "Service Bookings & Appointments | Seller Workspace",
  description: "View and manage incoming customer service bookings and appointments",
};

export default function WorkspaceSalesBookingsPage() {
  return <SalesBookingsView scope="workspace" />;
}
