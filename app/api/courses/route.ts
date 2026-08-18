import { handlePublicCoursesGet } from "@/lib/api/public-courses";

export async function GET(req: Request) {
  return handlePublicCoursesGet(req);
}
