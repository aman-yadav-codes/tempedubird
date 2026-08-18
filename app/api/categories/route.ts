import { handlePublicCategoriesGet } from "@/lib/api/public-categories";

export async function GET(req: Request) {
  return handlePublicCategoriesGet(req);
}
