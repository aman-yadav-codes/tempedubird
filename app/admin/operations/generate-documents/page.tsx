import AdminGenerateDocumentPage from "@/app/admin/generate/page";

export const metadata = {
  title: "Generate Documents | Operations",
  description: "Generate client project documentation and records",
};

export default function OperationsGenerateDocumentsPage() {
  return <AdminGenerateDocumentPage sourceSection="operation" />;
}

