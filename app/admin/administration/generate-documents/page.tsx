import AdminGenerateDocumentPage from "@/app/admin/generate/page";

export const metadata = {
  title: "Generate Documents | Administration",
  description: "Generate official administrative documents for clients",
};

export default function AdministrationGenerateDocumentsPage() {
  return <AdminGenerateDocumentPage sourceSection="administration" />;
}

