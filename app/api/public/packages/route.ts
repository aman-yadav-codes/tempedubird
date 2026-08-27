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
      const filtered = allPackages.filter((p) => {
        const pf = (p.package_for || "").toLowerCase();
        if (audience === "institution") {
          return pf.includes("institution") || pf.includes("school") || pf.includes("college") || pf.includes("coach");
        }
        if (audience === "student") {
          return pf.includes("student") || pf.includes("learner");
        }
        if (audience === "parent") {
          return pf.includes("parent") || pf.includes("guardian");
        }
        return true;
      });
      packages = filtered.length > 0 ? filtered : allPackages;
    }

    return NextResponse.json({
      success: true,
      packages,
    });
  } catch (error) {
    console.error("Error fetching public packages:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
