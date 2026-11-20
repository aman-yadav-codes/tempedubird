import SeoCategoryProfilePage, { generateMetadata as generateCatchAllMetadata } from "../[...slug]/page";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ category: string; slug: string }> | { category: string; slug: string };
}

export async function generateMetadata({ params }: Props) {
  const resolved = await params;
  return generateCatchAllMetadata({
    params: {
      category: resolved.category,
      slug: [resolved.slug],
    },
  });
}

export default async function CategorySlugListingPage({ params }: Props) {
  const resolved = await params;
  return SeoCategoryProfilePage({
    params: {
      category: resolved.category,
      slug: [resolved.slug],
    },
  });
}
