import CategoryManager from "@/components/admin/categories/category-manager";

export const metadata = {
  title: "Category System | Platform Admin",
  description: "Manage business classifications, product categories, and service categories with hierarchies.",
};

export default function PlatformAdminCategoriesPage() {
  return <CategoryManager />;
}
