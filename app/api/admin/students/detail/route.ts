import {
  DELETE as deleteUser,
  GET as getUser,
  PATCH as patchUser,
} from "@/app/api/admin/users/[id]/route";

function routeContextFromQuery(req: Request) {
  const id = new URL(req.url).searchParams.get("id") ?? "";
  return { params: Promise.resolve({ id }) };
}

export function GET(req: Request) {
  return getUser(req, routeContextFromQuery(req));
}

export function PATCH(req: Request) {
  return patchUser(req, routeContextFromQuery(req));
}

export function DELETE(req: Request) {
  return deleteUser(req, routeContextFromQuery(req));
}
