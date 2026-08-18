import { NextResponse } from "next/server";
import { listMarketingPackages } from "@/lib/queries/marketing-packages";

export async function GET() {
  try {
    const { packages } = await listMarketingPackages({ activeOnly: true, limit: 50 });

    // Fallback default packages if database is currently empty
    const defaultPackages = [
      {
        id: 1,
        name: "Starter Listing",
        package_for: "Coaching / Institute",
        price: 2999,
        price_unit: "month",
        storage_limit_gb: 5,
        validity_count: 1,
        validity_unit: "month",
        description: "Perfect for single branch institutes & local coaching centers starting their online presence.",
        is_active: true,
        features: [
          "Verified Institute Profile",
          "Up to 5 Course Listings",
          "5GB Cloud Document Storage",
          "Basic Lead Management",
          "Standard Search Placement",
        ],
      },
      {
        id: 2,
        name: "Growth Professional",
        package_for: "College / Premier Institute",
        price: 7999,
        price_unit: "month",
        storage_limit_gb: 25,
        validity_count: 1,
        validity_unit: "month",
        description: "Designed for growing educational institutes needing enhanced visibility and marketing tools.",
        is_active: true,
        features: [
          "Priority Search & Homepage Placement",
          "Unlimited Course & Program Listings",
          "25GB Cloud Storage & Syllabus Marketplace",
          "Advanced Lead Pipeline & WhatsApp Integration",
          "Custom Student & Staff ID Cards",
          "Dedicated Live Chat Support",
        ],
        isPopular: true,
      },
      {
        id: 3,
        name: "Enterprise University",
        package_for: "Multi-Campus University / Group",
        price: 19999,
        price_unit: "month",
        storage_limit_gb: 100,
        validity_count: 1,
        validity_unit: "month",
        description: "Complete digital growth suite for large institutions, colleges, and multi-tenant groups.",
        is_active: true,
        features: [
          "Top Tier Featured Spot across All Locations",
          "Unlimited Campuses, Programs & Courses",
          "100GB Dedicated Cloud Infrastructure",
          "Full Marketing Suite (Form, Ads, Email Builder)",
          "Dedicated Account Manager & 24/7 Priority Support",
          "Custom Domain & White-label Options",
        ],
      },
    ];

    const resultPackages = packages.length > 0 ? packages : defaultPackages;

    return NextResponse.json({
      success: true,
      packages: resultPackages,
    });
  } catch (error) {
    console.error("Error fetching public packages:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
