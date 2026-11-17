import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }> | { [key: string]: string | string[] | undefined };
}

export default async function PublicTeachersRedirectPage({ searchParams }: Props) {
  const sp = await searchParams;
  const search = sp?.search || sp?.q || "";
  const queryStr = Array.isArray(search) ? search[0] : search;

  if (queryStr && queryStr.trim()) {
    redirect(`/explore?q=${encodeURIComponent(queryStr.trim())}`);
  }

  redirect("/explore?type=professional");
}
