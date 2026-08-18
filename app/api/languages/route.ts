import { handlePublicLanguagesGet } from "@/lib/api/public-institution-lookups";

export async function GET(req: Request) {
  return handlePublicLanguagesGet(req);
}
