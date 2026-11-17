import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }> | { id: string };
}

export default async function PublicTeacherDetailRedirectPage({ params }: Props) {
  const resolved = await params;
  if (resolved?.id) {
    redirect(`/professionals/${resolved.id}`);
  }
  redirect("/explore?type=professional");
}
