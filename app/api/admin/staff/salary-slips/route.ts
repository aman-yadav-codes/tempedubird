import { handleDocumentGet, handleDocumentPost, handleDocumentDelete } from "@/lib/staff-documents";

export async function GET(req: Request) {
  return handleDocumentGet(req, "salary_slip");
}

export async function POST(req: Request) {
  return handleDocumentPost(req, "salary_slip");
}

export async function DELETE(req: Request) {
  return handleDocumentDelete(req);
}
