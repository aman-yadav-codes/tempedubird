import { handlePublicInstitutionSubtypesGet } from "@/lib/api/public-institution-lookups";

export async function GET(req: Request) {
  return handlePublicInstitutionSubtypesGet(req);
}
