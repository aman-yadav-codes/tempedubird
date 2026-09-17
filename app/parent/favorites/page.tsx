import { FavoritesView } from "@/components/shared/favorites-view";

export const metadata = {
  title: "My Favorites | EduBird Parent Portal",
  description: "View and manage your saved institutes, courses, teachers, products, exams, notes, and practice tests.",
};

export default function ParentFavoritesPage() {
  return <FavoritesView />;
}
