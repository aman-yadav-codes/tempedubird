import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const listingType = url.searchParams.get("listing_type")?.trim() || "institutes";
    const city = url.searchParams.get("city")?.trim() || "";
    const area = url.searchParams.get("area")?.trim() || "";
    const course = url.searchParams.get("course")?.trim() || "";

    if (!city && !course && !area) {
      return NextResponse.json({ success: true, data: null });
    }

    // We fetch all active entries for this listing type (or 'all') and find the best match
    const query = `
      SELECT * FROM listing_page_seo
      WHERE is_active = true
        AND (listing_type = $1 OR listing_type = 'all')
    `;
    const res = await db.query(query, [listingType]);
    const entries = res.rows;

    if (!entries || entries.length === 0) {
      return NextResponse.json({ success: true, data: null });
    }

    const cleanCity = city.toLowerCase();
    const cleanArea = area.toLowerCase();
    const cleanCourse = course.toLowerCase();

    // Priority ranking:
    // 1. Exact city + area + course
    // 2. Exact city + area
    // 3. Exact city + course
    // 4. City match
    // 5. Course match
    let bestMatch: any = null;
    let bestScore = -1;

    for (const item of entries) {
      const itemCity = (item.city || "").toLowerCase();
      const itemArea = (item.area || "all").toLowerCase();
      const itemCourse = (item.course || "all").toLowerCase();

      let score = 0;

      // City matching
      const cityMatched = cleanCity && (itemCity === cleanCity || cleanCity.includes(itemCity) || itemCity.includes(cleanCity));
      
      // Area matching
      const areaMatched = cleanArea && itemArea !== 'all' && (itemArea === cleanArea || cleanArea.includes(itemArea) || itemArea.includes(cleanArea));
      
      // Course matching
      const courseMatched = cleanCourse && itemCourse !== 'all' && (itemCourse === cleanCourse || cleanCourse.includes(itemCourse) || itemCourse.includes(cleanCourse));

      if (cityMatched && areaMatched && courseMatched) {
        score = 100;
      } else if (cityMatched && areaMatched && (itemCourse === 'all' || !cleanCourse)) {
        score = 80;
      } else if (cityMatched && courseMatched && (itemArea === 'all' || !cleanArea)) {
        score = 70;
      } else if (cityMatched && (itemArea === 'all' || !cleanArea) && (itemCourse === 'all' || !cleanCourse)) {
        score = 50;
      } else if (courseMatched && (itemCity === 'all' || !cleanCity)) {
        score = 30;
      }

      if (score > bestScore && score > 0) {
        bestScore = score;
        bestMatch = item;
      }
    }

    return NextResponse.json({
      success: true,
      data: bestMatch,
      matchScore: bestScore
    });
  } catch (error: any) {
    console.error("[PUBLIC_LISTING_SEO_GET] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
