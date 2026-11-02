import AdminGenerateDocumentPage from "@/app/admin/generate/page";

export const metadata = {
  title: "Generate Documents | Sales",
  description: "Generate client sales agreements and documents",
};

export default function SalesGenerateDocumentsPage() {
  return <AdminGenerateDocumentPage sourceSection="sales" />;
}

