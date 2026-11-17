import { redirect } from "next/navigation";

export default async function ProfessionalsAliasPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const resolvedParams = await params;
  redirect(`/professional/${resolvedParams.id}`);
}

