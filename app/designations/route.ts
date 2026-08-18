import { handlePublicDesignationsGet } from "@/lib/api/public-designations";

export async function GET(req: Request) {
  return handlePublicDesignationsGet(req);
}
