import React from "react";
import { CustomerOrdersView } from "@/components/customer/customer-orders-view";

export const metadata = {
  title: "My Orders | EduBird",
  description: "View and track orders and service bookings",
};

export default function CustomerOrdersPage() {
  return <CustomerOrdersView />;
}
