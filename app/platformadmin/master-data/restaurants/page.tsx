import { VerticalMasterManager } from "@/components/admin/master-data/vertical-master-manager";

export default function RestaurantMastersPage() {
  return (
    <VerticalMasterManager
      verticalCode="restaurants"
      title="Restaurant & Food Masters Management"
      subtitle="Organize menu categories, subcategories, dishes, global cuisines, dietary classifications, serving units, ingredients, and allergen types."
      iconName="UtensilsCrossed"
      accentColor="from-amber-600 to-orange-600"
    />
  );
}
