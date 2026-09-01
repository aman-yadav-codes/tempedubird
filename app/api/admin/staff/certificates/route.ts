import { handleDocumentGet, handleDocumentPost, handleDocumentDelete } from "@/lib/staff-documents";

export async function GET(req: Request) {
  return handleDocumentGet(req, "certificate");
}

export async function POST(req: Request) {
  return handleDocumentPost(req, "certificate");
}

export async function DELETE(req: Request) {
  return handleDocumentDelete(req);
}
