import React from "react";
import { SalesBookingsView } from "@/components/sales/sales-bookings-view";

export const metadata = {
  title: "Service Bookings & Appointments | Platform Admin",
  description: "View and manage all customer bookings and appointments across Varanasi businesses",
};

export default function AdminSalesBookingsPage() {
  return <SalesBookingsView scope="admin" />;
}
