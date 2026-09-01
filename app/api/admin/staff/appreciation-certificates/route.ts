import { handleDocumentGet, handleDocumentPost, handleDocumentDelete } from "@/lib/staff-documents";

export async function GET(req: Request) {
  return handleDocumentGet(req, "appreciation_certificate");
}

export async function POST(req: Request) {
  return handleDocumentPost(req, "appreciation_certificate");
}

export async function DELETE(req: Request) {
  return handleDocumentDelete(req);
}
