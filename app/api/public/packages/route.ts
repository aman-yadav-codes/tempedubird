import { NextResponse } from "next/server";
import { listMarketingPackages } from "@/lib/queries/marketing-packages";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const audience = searchParams.get("audience"); // "institution" | "student" | "parent" | null

    const { packages: allPackages } = await listMarketingPackages({ activeOnly: true, limit: 50 });

    // Filter by audience type if provided
    let packages = allPackages;
    if (audience && allPackages.length > 0) {
      const aud = audience.toLowerCase();
      const filtered = allPackages.filter((p) => {
        const pf = (p.package_for || "").toLowerCase();
        const types = Array.isArray(p.package_for_types)
          ? p.package_for_types.map((t: string) => String(t).toLowerCase())
          : [];

        if (aud === "institution" || aud === "institute") {
          return (
            pf.includes("institution") ||
            pf.includes("institute") ||
            pf.includes("all") ||
            pf.includes("school") ||
            pf.includes("college") ||
            pf.includes("coach") ||
            types.includes("institution")
          );
        }
        if (aud === "student") {
          return (
            pf.includes("student") ||
            pf.includes("learner") ||
            types.includes("student")
          );
        }
        if (aud === "parent") {
          return (
            pf.includes("parent") ||
            pf.includes("guardian") ||
            types.includes("parent")
          );
        }
        return true;
      });
      packages = filtered;
    }

    return NextResponse.json({
      success: true,
      packages,
    });
  } catch (error) {
    console.warn("Error fetching public packages, returning empty fallback:", (error as any)?.message || error);
    return NextResponse.json({
      success: true,
      packages: [],
    });
  }
}
