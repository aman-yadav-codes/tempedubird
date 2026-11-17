import { redirect } from "next/navigation";

export default async function BusinessesAliasPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const resolvedParams = await params;
  redirect(`/business/${resolvedParams.id}`);
}

