import { redirect } from "next/navigation";

export default function MasterCatalogIndexPage() {
  redirect("/admin/catalog/products");
}

