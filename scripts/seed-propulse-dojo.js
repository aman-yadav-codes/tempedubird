const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seed() {
  console.log("Seeding ProPulse MMA & Martial Arts Dojo (ID: 96)...");

  // 1. Update Business Profile
  const gallery = [
    "https://images.unsplash.com/photo-1549476464-37392f717541?w=800&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1517963879433-6ad2b056d712?w=800&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=800&auto=format&fit=crop&q=80"
  ];

  const openingHours = {
    monday: "06:00-22:00",
    tuesday: "06:00-22:00",
    wednesday: "06:00-22:00",
    thursday: "06:00-22:00",
    friday: "06:00-22:00",
    saturday: "06:00-22:00",
    sunday: "07:00-13:00"
  };

  const socialLinks = {
    instagram: "https://instagram.com/propulse_mma_varanasi",
    facebook: "https://facebook.com/propulsemma",
    youtube: "https://youtube.com/@propulsecombat"
  };

  await pool.query(`
    UPDATE business_profiles
    SET
      about = 'ProPulse MMA & Martial Arts Dojo is Varanasi premier mixed martial arts facility located in Durgakund. Equipped with an authentic sparring cage, Olympic standard grappling tatami mats, heavy bag line, and conditioning zone, we offer World-class training in Brazilian Jiu-Jitsu (BJJ), Muay Thai boxing, Wrestling, and Youth Self-Defense.',
      founder_name = 'Sensei Rohit Singhania',
      founder_title = 'Founder, 3rd Degree BJJ Black Belt & Head Combat Coach',
      founder_about = 'National kickboxing champion and 3rd-degree Brazilian Jiu-Jitsu black belt with over 15 years of combat coaching experience across Asia. Founded ProPulse Dojo in Durgakund, Varanasi to build high-discipline athletes, national champions, and practical self-defense proficiency.',
      founder_image_url = 'https://images.unsplash.com/photo-1549476464-37392f717541?w=800&auto=format&fit=crop&q=80',
      mission = 'Empowering Varanasi youth and adults with unmatched combat discipline, self-defense mastery, mental fortitude, and athletic peak conditioning.',
      vision = 'To become North India foremost combat academy producing national MMA champions and fostering a culture of safety, strength, and mutual respect.',
      goal = 'Train over 1,000 disciplined athletes and self-defense practitioners by 2027 in Purvanchal.',
      opening_hours = $1,
      social_links = $2,
      website = 'https://propulse-dojo.in',
      phone = '+91 98380 12345',
      whatsapp = '+91 98380 12345',
      email = 'contact@propulse-dojo.in',
      address = 'B-24/18, Near Durgakund Temple, Durgakund Road, Varanasi, Uttar Pradesh 221005',
      locality = 'Durgakund',
      city = 'Varanasi',
      state = 'Uttar Pradesh',
      postal_code = '221005',
      banner_url = 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=1600&auto=format&fit=crop&q=80',
      logo_url = 'https://images.unsplash.com/photo-1549476464-37392f717541?w=400&auto=format&fit=crop&q=80',
      gallery_images = $3,
      is_verified = TRUE,
      is_active = TRUE
    WHERE id = 96
  `, [JSON.stringify(openingHours), JSON.stringify(socialLinks), gallery]);
  console.log("Updated business_profiles for ID 96.");

  // 2. Clean old test items for ID 96
  await pool.query("DELETE FROM products WHERE business_profile_id = 96");
  await pool.query("DELETE FROM services WHERE business_profile_id = 96");
  await pool.query("DELETE FROM institution_courses WHERE business_profile_id = 96");
  await pool.query("DELETE FROM staff_job_postings WHERE business_profile_id = 96 OR institution_id = 96");
  await pool.query("DELETE FROM business_records WHERE business_id = 96");
  await pool.query("DELETE FROM professional_profiles WHERE business_profile_id = 96");
  await pool.query("DELETE FROM platform_reviews WHERE business_id = 96");

  // 3. Insert Products (5 combat sports products)
  const products = [
    {
      title: "ProPulse Pro Combat Leather Boxing & Sparring Gloves (14oz / 16oz)",
      slug: "propulse-pro-combat-leather-boxing-gloves-varanasi",
      description: "Handcrafted premium cowhide leather boxing gloves with multi-layer high-density gel padding, ventilated palm, and reinforced hook-and-loop wrist wrap for optimal sparring safety.",
      price: 3499,
      sale_price: 2999,
      image_url: "https://images.unsplash.com/photo-1549476464-37392f717541?w=800&auto=format&fit=crop&q=80",
    },
    {
      title: "Elite MMA Shin Guards & Instep Protection",
      slug: "elite-mma-shin-guards-instep-protection-varanasi",
      description: "Anatomically contoured lightweight shin guards featuring dual neoprene wrap straps and ultra-absorbent foam cushioning for heavy Muay Thai kicks and grappling agility.",
      price: 2799,
      sale_price: 2499,
      image_url: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&auto=format&fit=crop&q=80",
    },
    {
      title: "ProPulse Brazilian Jiu-Jitsu Competition Gi (Pearl Weave 450 GSM)",
      slug: "propulse-bjj-competition-gi-pearl-weave-varanasi",
      description: "IBJJF legal 450 GSM Pearl Weave cotton jacket with 10oz ripstop pants, triple reinforced stress points, pre-shrunk fabric, and custom embroidered ProPulse Dojo insignia.",
      price: 4999,
      sale_price: 4499,
      image_url: "https://images.unsplash.com/photo-1517963879433-6ad2b056d712?w=800&auto=format&fit=crop&q=80",
    },
    {
      title: "Heavy Canvas Filled Punching & Kick Bag (5ft / 45kg)",
      slug: "heavy-canvas-filled-punching-kick-bag-5ft-varanasi",
      description: "Heavy-duty 5ft commercial punch bag pre-filled with shredded textile mix. Includes 360-degree swivel hanging chains and reinforced D-ring hanging points.",
      price: 5499,
      sale_price: 4999,
      image_url: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&auto=format&fit=crop&q=80",
    },
    {
      title: "Dojo High-Performance Quick Hand Wraps & Gel Knuckle Guards",
      slug: "dojo-quick-hand-wraps-gel-knuckle-guards-varanasi",
      description: "Fast-fit stretch elastic combat wraps with integrated shock-absorbing gel knuckle slab and extended 1-meter wrist support strap for maximum knuckle safety.",
      price: 699,
      sale_price: 599,
      image_url: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&auto=format&fit=crop&q=80",
    },
  ];

  for (const p of products) {
    await pool.query(`
      INSERT INTO products (
        title, slug, description, price, sale_price, image_url,
        category, category_id, subcategory_id, main_category_id,
        business_profile_id, status, is_featured, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, 'Gyms, Sports & Wellness', 7809, 7809, 7808, 96, 'active', TRUE, NOW(), NOW())
    `, [p.title, p.slug, p.description, p.price, p.sale_price, p.image_url]);
  }
  console.log("Seeded 5 Products.");

  // 4. Insert Services (5 martial arts & conditioning services)
  const services = [
    {
      title: "1-on-1 Boxing & Muay Thai Technique Coaching",
      slug: "one-on-one-boxing-muay-thai-technique-coaching-varanasi",
      description: "Private 60-minute technical mitt work, footwork drills, slip-and-counter mechanics, and Thai kick dynamics led by national champions.",
      price: 999,
      duration_minutes: 60,
      image_url: "https://images.unsplash.com/photo-1549476464-37392f717541?w=800&auto=format&fit=crop&q=80",
    },
    {
      title: "Brazilian Jiu-Jitsu (BJJ) Gi & No-Gi Grappling Mastery",
      slug: "brazilian-jiu-jitsu-gi-no-gi-grappling-varanasi",
      description: "High-level submission grappling training covering positional control, guard passes, leg locks, chokes, and live sparring on Olympic tatami mats.",
      price: 1499,
      duration_minutes: 75,
      image_url: "https://images.unsplash.com/photo-1517963879433-6ad2b056d712?w=800&auto=format&fit=crop&q=80",
    },
    {
      title: "Complete MMA Cage Fighting & Striking Bootcamp",
      slug: "complete-mma-cage-fighting-striking-bootcamp-varanasi",
      description: "Comprehensive mixed martial arts session integrating cage-wall wrestling, ground-and-pound strategy, transitional defense, and combat sparring.",
      price: 2499,
      duration_minutes: 90,
      image_url: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&auto=format&fit=crop&q=80",
    },
    {
      title: "Women's Practical Self-Defense & Crisis Reaction Workshop",
      slug: "womens-practical-self-defense-workshop-varanasi",
      description: "Specialized realistic self-defense coaching covering wrist releases, ground escapes, situational awareness, vulnerable target strikes, and panic control.",
      price: 799,
      duration_minutes: 60,
      image_url: "https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=800&auto=format&fit=crop&q=80",
    },
    {
      title: "Combat Athlete Strength, Agility & High-Intensity Conditioning",
      slug: "combat-athlete-strength-agility-conditioning-varanasi",
      description: "High-intensity interval conditioning with battle ropes, kettlebells, medicine balls, sled pushes, and core torque circuits built for fighters.",
      price: 1199,
      duration_minutes: 60,
      image_url: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&auto=format&fit=crop&q=80",
    },
  ];

  for (const s of services) {
    await pool.query(`
      INSERT INTO services (
        title, slug, description, price, duration_minutes, duration_unit, image_url,
        category, category_id, subcategory_id, main_category_id,
        business_profile_id, status, is_featured, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, 'minutes', $6, 'Gyms, Sports & Wellness', 7809, 7809, 7808, 96, 'active', TRUE, NOW(), NOW())
    `, [s.title, s.slug, s.description, s.price, s.duration_minutes, s.image_url]);
  }
  console.log("Seeded 5 Services.");

  // 5. Insert Courses (3 combat academy courses)
  const courses = [
    {
      course_name: "3-Month MMA Fighter Fundamentals & Octagon Cage Readiness",
      slug: "3-month-mma-fighter-fundamentals-varanasi",
      description: "Structured 12-week intensive course taking students from foundational stance, footwork, and basic submissions to confident controlled cage sparring and competition readiness.",
      duration: "3 Months",
      fee_amount: 14999,
      price: "₹14,999",
      seats_available: 25,
      board_or_university: "ProPulse Combat Academy & National MMA Federation Syllabus",
      thumbnail_url: "https://images.unsplash.com/photo-1549476464-37392f717541?w=800&auto=format&fit=crop&q=80",
    },
    {
      course_name: "BJJ White-to-Blue Belt Accelerated Grappling Syllabus",
      slug: "bjj-white-to-blue-belt-accelerated-syllabus-varanasi",
      description: "Rigorous 24-week curriculum covering 48 fundamental Jiu-Jitsu techniques, guard retention, side control escapes, submission chains, and rolling endurance verified for blue belt graduation.",
      duration: "6 Months",
      fee_amount: 18500,
      price: "₹18,500",
      seats_available: 20,
      board_or_university: "IBJJF Affiliated International Syllabus",
      thumbnail_url: "https://images.unsplash.com/photo-1517963879433-6ad2b056d712?w=800&auto=format&fit=crop&q=80",
    },
    {
      course_name: "Certified Kickboxing & Combat Fitness Instructor Training",
      slug: "certified-kickboxing-combat-fitness-instructor-training-varanasi",
      description: "Professional accreditation program for aspiring coaches covering pad holding biomechanics, fight class structure, injury prevention, kinesiology, and business fundamentals.",
      duration: "4 Months",
      fee_amount: 24999,
      price: "₹24,999",
      seats_available: 15,
      board_or_university: "All India Combat Coaches Council (AICCC)",
      thumbnail_url: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&auto=format&fit=crop&q=80",
    },
  ];

  for (const c of courses) {
    await pool.query(`
      INSERT INTO institution_courses (
        business_profile_id, course_name, slug, description, duration,
        fee_amount, price, seats_available, board_or_university,
        thumbnail_url, category_id, is_active, created_at, updated_at
      ) VALUES (96, $1, $2, $3, $4, $5, $6, $7, $8, $9, 7808, TRUE, NOW(), NOW())
    `, [c.course_name, c.slug, c.description, c.duration, c.fee_amount, c.price, c.seats_available, c.board_or_university, c.thumbnail_url]);
  }
  console.log("Seeded 3 Courses.");

  // 6. Insert Jobs (3 job postings)
  const jobs = [
    {
      title: "Head Kickboxing & Striking Coach",
      slug: "head-kickboxing-striking-coach-varanasi-durgakund",
      department: "Martial Arts Coaching",
      salary_range: "₹35,000 - ₹55,000 / month",
      location: "Durgakund, Varanasi",
      employment_type: "Full-Time",
      work_mode: "On-site",
      experience_level: "3+ Years",
      openings_count: 2,
      description: "Lead morning and evening kickboxing batches, conduct private fighter sessions, oversee sparring safety, and design curriculum for striking athletes.",
      requirements: "Proven competitive fighting background in Kickboxing/Muay Thai/MMA. Minimum 3 years coaching experience.",
      benefits: "Performance bonuses per student enrollment, free equipment sponsorship, and dojo cage access.",
    },
    {
      title: "Assistant Youth Martial Arts Instructor",
      slug: "assistant-youth-martial-arts-instructor-varanasi",
      department: "Youth Development",
      salary_range: "₹18,000 - ₹28,000 / month",
      location: "Durgakund, Varanasi",
      employment_type: "Part-Time",
      work_mode: "On-site",
      experience_level: "1+ Years",
      openings_count: 2,
      description: "Teach kids martial arts fundamentals, discipline, agility, and anti-bullying techniques in our popular afternoon youth batch.",
      requirements: "Rank of blue belt or higher in BJJ/Judo/Karate or state-level combat sports competitor.",
      benefits: "Flexible evening hours, instructor development mentorship under Sensei Singhania.",
    },
    {
      title: "Dojo Front Desk & Athlete Membership Coordinator",
      slug: "dojo-front-desk-membership-coordinator-varanasi",
      department: "Operations & Member Care",
      salary_range: "₹20,000 - ₹30,000 / month",
      location: "Durgakund, Varanasi",
      employment_type: "Full-Time",
      work_mode: "On-site",
      experience_level: "1+ Years",
      openings_count: 1,
      description: "Manage gym walk-in inquiries, memberships, fee renewals, fight gear inventory sales, and class scheduling at the Durgakund facility.",
      requirements: "Excellent communication skills in Hindi & English, basic CRM software competence, welcoming demeanor.",
      benefits: "Full dojo gym and martial arts training access, retail product commissions.",
    },
  ];

  for (const j of jobs) {
    await pool.query(`
      INSERT INTO staff_job_postings (
        business_profile_id, title, slug, department, salary_range,
        location, employment_type, work_mode, experience_level,
        openings_count, description, requirements, benefits, status, created_at, updated_at
      ) VALUES (96, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'active', NOW(), NOW())
    `, [j.title, j.slug, j.department, j.salary_range, j.location, j.employment_type, j.work_mode, j.experience_level, j.openings_count, j.description, j.requirements, j.benefits]);
  }
  console.log("Seeded 3 Jobs.");

  // 7. Insert Events (3 combat sports events in business_records + events)
  const events = [
    {
      title: "Varanasi Open Grappling & BJJ Championship 2026",
      slug: "varanasi-open-grappling-bjj-championship-2026",
      description: "Annual North India submission-only grappling tournament featuring gi and no-gi brackets across featherweight, lightweight, and absolute divisions with medals and cash prizes.",
      start_date: "2026-07-15",
      end_date: "2026-07-16",
      start_time: "09:00 AM",
      end_time: "06:00 PM",
      venue_name: "ProPulse Combat Arena, Durgakund",
      complete_address: "B-24/18, Durgakund Road, Varanasi, Uttar Pradesh 221005",
      city: "Varanasi",
      state: "Uttar Pradesh",
      price: 499,
      is_free: false,
      featured_image: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&auto=format&fit=crop&q=80",
    },
    {
      title: "ProPulse Fight Night: Varanasi Inter-Club MMA Sparring Gala",
      slug: "propulse-fight-night-inter-club-mma-sparring-varanasi",
      description: "An exciting exhibition showcase of 10 sanctioned amateur MMA matches featuring fighters from across Uttar Pradesh and Bihar inside the full-sized ProPulse octagon cage.",
      start_date: "2026-08-22",
      end_date: "2026-08-22",
      start_time: "05:00 PM",
      end_time: "10:00 PM",
      venue_name: "ProPulse Main Octagon, Durgakund",
      complete_address: "B-24/18, Durgakund Road, Varanasi, Uttar Pradesh 221005",
      city: "Varanasi",
      state: "Uttar Pradesh",
      price: 799,
      is_free: false,
      featured_image: "https://images.unsplash.com/photo-1549476464-37392f717541?w=800&auto=format&fit=crop&q=80",
    },
    {
      title: "Free Purvanchal Women's Self-Defense & Empowerment Camp",
      slug: "free-purvanchal-womens-self-defense-camp-varanasi",
      description: "Community outreach 2-day hands-on workshop dedicated to teaching girls and women vital escape maneuvers, defensive strikes, pepper spray handling, and situational vigilance at zero cost.",
      start_date: "2026-06-20",
      end_date: "2026-06-21",
      start_time: "08:00 AM",
      end_time: "11:00 AM",
      venue_name: "ProPulse Dojo Mat Floor, Durgakund",
      complete_address: "B-24/18, Durgakund Road, Varanasi, Uttar Pradesh 221005",
      city: "Varanasi",
      state: "Uttar Pradesh",
      price: 0,
      is_free: true,
      featured_image: "https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=800&auto=format&fit=crop&q=80",
    },
  ];

  for (const e of events) {
    const brRes = await pool.query(`
      INSERT INTO business_records (
        business_id, vertical_id, vertical_code, title, slug,
        description, status, is_active, is_featured, price,
        featured_image, created_at, updated_at
      ) VALUES (96, 7, 'events', $1, $2, $3, 'published', TRUE, TRUE, $4, $5, NOW(), NOW())
      RETURNING id
    `, [e.title, e.slug, e.description, e.price, e.featured_image]);

    const recId = brRes.rows[0].id;
    await pool.query(`
      INSERT INTO events (
        record_id, start_date, end_date, start_time, end_time,
        venue_name, complete_address, city, state, country,
        is_free, organizer_name
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'IN', $10, 'ProPulse MMA Dojo')
    `, [recId, e.start_date, e.end_date, e.start_time, e.end_time, e.venue_name, e.complete_address, e.city, e.state, e.is_free]);
  }
  console.log("Seeded 3 Events.");

  // 8. Insert Professionals (3 instructors/staff in professional_profiles)
  const pros = [
    {
      name: "Sensei Rohit Singhania",
      slug: "sensei-rohit-singhania-varanasi",
      profession_type: "Head MMA Coach & 3rd Degree BJJ Black Belt",
      designation: "Head Combat Coach & Dojo Director",
      experience_years: "15",
      avatar_url: "https://images.unsplash.com/photo-1549476464-37392f717541?w=800&auto=format&fit=crop&q=80",
      about: "3rd Degree Brazilian Jiu-Jitsu Black Belt under Master Carlson Gracie lineage and former national Muay Thai champion. Has trained professional UFC and ONE Championship contenders.",
      phone: "+91 98380 12345",
      email: "rohit@propulse-dojo.in",
    },
    {
      name: "Coach Arjun Yadav",
      slug: "coach-arjun-yadav-boxing-varanasi",
      profession_type: "Purvanchal Boxing Champion & Striking Specialist",
      designation: "Senior Boxing & Kickboxing Coach",
      experience_years: "8",
      avatar_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop&q=80",
      about: "Gold Medalist in All-India Inter-University Boxing Championships with an undefeated professional regional kickboxing record. Specializes in counter-punching and heavy combination dynamics.",
      phone: "+91 98380 12346",
      email: "arjun@propulse-dojo.in",
    },
    {
      name: "Dr. Neha Srivastava",
      slug: "dr-neha-srivastava-sports-physio-varanasi",
      profession_type: "Sports Physiotherapist & Combat Conditioning Expert",
      designation: "Lead Athletic Physio & Recovery Specialist",
      experience_years: "7",
      avatar_url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&auto=format&fit=crop&q=80",
      about: "MPT in Sports Medicine with deep expertise in fighter joint mobility, ACL rehab, rotator cuff conditioning, and acute fight weight cut hydration management.",
      phone: "+91 98380 12347",
      email: "neha@propulse-dojo.in",
    },
  ];

  for (const p of pros) {
    await pool.query(`
      INSERT INTO professional_profiles (
        business_profile_id, name, slug, profession_type, designation,
        experience_years, avatar_url, about, phone, email,
        city, state, locality, postal_code, is_verified, is_active, created_at, updated_at
      ) VALUES (96, $1, $2, $3, $4, $5, $6, $7, $8, $9, 'Varanasi', 'Uttar Pradesh', 'Durgakund', '221005', TRUE, TRUE, NOW(), NOW())
    `, [p.name, p.slug, p.profession_type, p.designation, p.experience_years, p.avatar_url, p.about, p.phone, p.email]);
  }
  console.log("Seeded 3 Professionals.");

  // 9. Insert Reviews (4 student reviews in platform_reviews)
  const reviews = [
    {
      rating: 5,
      title: "Best MMA and Grappling Dojo in Purvanchal",
      comment: "The best MMA gym in Varanasi! Sensei Rohit Brazilian Jiu-Jitsu instruction is technical, safe, and world-class. The cage and tatami mats are top grade, and sparring culture is very respectful.",
    },
    {
      rating: 5,
      title: "Life-changing self defense workshop",
      comment: "The women self-defense workshop gave me immense confidence. High-energy coaches who focus on practical real-world escapes, assertiveness, and vigilance. Highly recommended for every woman in Varanasi!",
    },
    {
      rating: 5,
      title: "Amazing striking training and atmosphere",
      comment: "Great cage and mats setup in Durgakund. Training with Coach Arjun improved my striking rhythm and counter-punching completely. Very respectful and motivating team.",
    },
    {
      rating: 5,
      title: "Elite conditioning & genuine discipline",
      comment: "World-class equipment, clean locker rooms, and great sparring culture. True discipline and camaraderie. Proud to train at ProPulse Dojo!",
    },
  ];

  for (const r of reviews) {
    await pool.query(`
      INSERT INTO platform_reviews (
        business_id, rating, title, comment, status, created_at, updated_at
      ) VALUES (96, $1, $2, $3, 'approved', NOW(), NOW())
    `, [r.rating, r.title, r.comment]);
  }
  console.log("Seeded 4 Platform Reviews.");

  pool.end();
  console.log("Finished seeding ProPulse Dojo successfully!");
}

seed().catch(err => {
  console.error("Seeding error:", err);
  pool.end();
});
