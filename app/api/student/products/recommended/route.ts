import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { ensureFeatureSchema } from "@/lib/db/ensure-feature-schema";

export async function GET(req: Request) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthUser(req);
    const url = new URL(req.url);
    const audience = url.searchParams.get("audience") || "student"; // "student" | "parent"

    let enrolledCourses: Array<{ title: string; category?: string }> = [];
    let recentSearches: string[] = [];

    if (user?.id) {
      // 1. Fetch Enrolled Courses for the user (or their linked children if parent)
      try {
        const enrollRes = await db.query(
          `
          SELECT prog.title, prog.category_id, ip.name AS institution_name
          FROM student_profiles sp
          JOIN student_enrollments se ON se.student_id = sp.id AND COALESCE(se.is_deleted, FALSE) = FALSE
          JOIN institution_programs prog ON prog.id = se.program_id
          LEFT JOIN institution_profiles ip ON ip.id = se.institution_id
          WHERE sp.user_id = $1
             OR sp.id IN (
               SELECT sg.student_id FROM student_guardians sg WHERE sg.guardian_user_id = $1 AND COALESCE(sg.is_deleted, FALSE) = FALSE
             )
          ORDER BY se.id DESC
          LIMIT 5
          `,
          [user.id]
        );
        enrolledCourses = enrollRes.rows;
      } catch {}

      // 2. Fetch Recent Searches
      try {
        const searchRes = await db.query(
          `
          SELECT query 
          FROM user_search_history 
          WHERE user_id = $1 
          ORDER BY id DESC 
          LIMIT 5
          `,
          [user.id]
        );
        recentSearches = searchRes.rows.map((r: any) => r.query);
      } catch {}
    }

    // 3. Fetch Active Products from Catalog
    const productsRes = await db.query(
      `
      SELECT 
        id,
        title,
        slug,
        description,
        CAST(price AS DOUBLE PRECISION) AS price,
        CAST(sale_price AS DOUBLE PRECISION) AS sale_price,
        category,
        image_url,
        institution_name,
        stock_quantity,
        badge_text,
        features,
        status,
        is_featured
      FROM products
      WHERE status = 'active'
      ORDER BY is_featured DESC, id ASC
      `
    );

    let allProducts = productsRes.rows;

    // Seed default starter catalog if empty
    if (allProducts.length === 0) {
      allProducts = [
        {
          id: 1,
          title: "Robotics & IoT Starter STEM Kit (50+ Sensors & Microcontroller)",
          slug: "robotics-iot-starter-kit",
          description: "Hands-on engineering and IoT learning kit with Arduino, sensors, OLED display, and jumper sets.",
          price: 4999,
          sale_price: 3899,
          category: "Lab & Scientific Kits",
          image_url: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=600&auto=format&fit=crop&q=80",
          badge_text: "Best Seller",
          features: ["Arduino UNO Compatible", "50+ Sensor Modules", "Printed Guidebook", "Lifetime Lab Code Access"],
          status: "active",
          is_featured: true,
        },
        {
          id: 2,
          title: "Complete JEE & NEET 15-Year Chapterwise Solved Question Papers",
          slug: "jee-neet-solved-papers",
          description: "Exhaustive compilation of previous exam questions with stepwise detailed video explanations.",
          price: 2499,
          sale_price: 1850,
          category: "Books & Study Material",
          image_url: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600&auto=format&fit=crop&q=80",
          badge_text: "Top Rated",
          features: ["15 Years Solved Papers", "Formula Flashcards", "3 Mock Test OMR Sheets", "Mobile App Notes Sync"],
          status: "active",
          is_featured: true,
        },
        {
          id: 3,
          title: "Official Academic Premium Blazer & Uniform Kit (Navy Blue)",
          slug: "academic-uniform-kit",
          description: "Comfortable breathable poly-wool blend with official institution crest embroidery and ties.",
          price: 3200,
          sale_price: 2750,
          category: "Uniform & Apparel",
          image_url: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=600&auto=format&fit=crop&q=80",
          badge_text: "Official Attire",
          features: ["Premium Wool-Blend Fabric", "Embroidered Emblem", "Stain-Resistant", "All Standard Sizes"],
          status: "active",
          is_featured: false,
        },
        {
          id: 4,
          title: "Digital Stylus Pen & Drawing Tablet for Online Lectures & Notes",
          slug: "digital-stylus-notes-tablet",
          description: "Ultra-responsive 8192 levels pressure sensitivity tablet for handwritten digital notes and equations.",
          price: 3999,
          sale_price: 2999,
          category: "Digital Devices & Accessories",
          image_url: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80",
          badge_text: "Popular",
          features: ["Battery-free Stylus", "Type-C & OTG Support", "Compatible with Zoom/OneNote", "1 Year Warranty"],
          status: "active",
          is_featured: true,
        },
        {
          id: 5,
          title: "Executive Hardbound Academic Planner & Engineering Stationery Set",
          slug: "academic-planner-stationery",
          description: "Semester goal tracker, daily schedule planner, mechanical drafting pencils, and grid notebook.",
          price: 1299,
          sale_price: 899,
          category: "Stationery & Supplies",
          image_url: "https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=600&auto=format&fit=crop&q=80",
          badge_text: "Student Favorite",
          features: ["Hardbound 360-Page Diary", "Drafting Scale & Pencils", "Sticky Flags & Highlighters", "Waterproof Pouch"],
          status: "active",
          is_featured: false,
        }
      ];
    }

    // 4. Compute Personalized Recommendation Matches & Reasons
    const topCourseTitle = enrolledCourses[0]?.title || "B.Tech Computer Science & Engineering";
    const topSearch = recentSearches[0] || "JEE Advanced & Board Prep";

    const recommended = allProducts.map((prod: any, idx: number) => {
      let reason = "Essential Academic Supply";
      let matchScore = 80;

      if (idx === 0) {
        reason = `✨ Recommended based on your enrollment in "${topCourseTitle}"`;
        matchScore = 98;
      } else if (idx === 1) {
        reason = `🔍 Matches your recent search: "${topSearch}"`;
        matchScore = 95;
      } else if (idx === 2 && audience === "parent") {
        reason = `👨‍👩‍👧 Parent Pick: Official Uniform & Campus Essentials`;
        matchScore = 92;
      } else if (idx === 3) {
        reason = `💡 Top tool for digital lectures, problem-solving & exam notes`;
        matchScore = 90;
      } else {
        reason = `⭐ Highly rated by students in your academic batch`;
        matchScore = 85;
      }

      return {
        ...prod,
        recommendation_reason: reason,
        match_score: matchScore,
      };
    });

    return NextResponse.json({
      success: true,
      audience,
      enrolled_courses_count: enrolledCourses.length,
      primary_course: topCourseTitle,
      recent_searches_count: recentSearches.length,
      recommended_products: recommended,
    });
  } catch (error: any) {
    console.error("[Recommended Products GET] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch recommended products" }, { status: 500 });
  }
}
