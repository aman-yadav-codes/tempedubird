import React from "react";
import { CustomerFavoritesView } from "@/components/customer/customer-favorites-view";

export const metadata = {
  title: "My Saved Favorites | 143Panda",
  description: "View and manage saved businesses, services, and professionals",
};

export default function CustomerFavoritesPage() {
  return <CustomerFavoritesView />;
}
