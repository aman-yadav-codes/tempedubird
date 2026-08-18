import { handlePublicInstitutionsGet } from "@/lib/api/public-institutions";

export async function GET(req: Request) {
  return handlePublicInstitutionsGet(req);
}
