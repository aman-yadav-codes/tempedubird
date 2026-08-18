import { PATCH as patchPassword } from "@/app/api/admin/users/[id]/password/route";

function routeContextFromQuery(req: Request) {
  const id = new URL(req.url).searchParams.get("id") ?? "";
  return { params: Promise.resolve({ id }) };
}

export function PATCH(req: Request) {
  return patchPassword(req, routeContextFromQuery(req));
}
