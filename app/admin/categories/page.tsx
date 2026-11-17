import CategoryManager from "@/components/admin/categories/category-manager";

export const metadata = {
  title: "Category System | Admin",
  description: "Manage business classifications, product categories, and service categories with hierarchies.",
};

export default function AdminCategoriesPage() {
  return <CategoryManager />;
}
