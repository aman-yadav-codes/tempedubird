import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('Seeding Businesses, Products, Services & Professionals...');

    // --- A. GROCERY & RETAIL BUSINESS ---
    let groceryBizRes = await client.query(`
      SELECT id, name, slug FROM business_profiles WHERE slug = 'kisan-fresh-grocery-mart' OR name ILIKE '%kisan fresh%' LIMIT 1
    `);
    let groceryBizId;
    if (groceryBizRes.rows.length === 0) {
      const instRes = await client.query(`
        INSERT INTO institution_profiles (name, slug, institution_type_id, email, phone, is_active)
        VALUES ('Kisan Fresh Mandi & Grocery Mart', 'kisan-fresh-mandi', 15, 'kisanfresh@example.com', '9876543210', TRUE)
        RETURNING id
      `);
      const instId = instRes.rows[0].id;

      const bizInsert = await client.query(`
        INSERT INTO business_profiles (
          institution_profile_id, name, slug, business_type, country_code, state, city, address,
          phone, email, website, about, established_year, is_verified, is_featured, is_active,
          logo_url, banner_url
        ) VALUES (
          $1, 'Kisan Fresh Mandi & Grocery Mart', 'kisan-fresh-grocery-mart', 'Retail & Commerce',
          'IN', 'Delhi', 'New Delhi', 'Shop 14, Main Mandi Road, Azadpur, New Delhi',
          '+91 98765 43210', 'support@kisanfreshmandi.com', 'https://kisanfreshmandi.com',
          'Fresh organic farm produce, daily essentials, vegetables, and fruits at wholesale prices directly from local farmers.',
          2018, TRUE, TRUE, TRUE,
          'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80',
          'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=1200&q=80'
        ) RETURNING id
      `, [instId]);
      groceryBizId = bizInsert.rows[0].id;
    } else {
      groceryBizId = groceryBizRes.rows[0].id;
    }
    console.log(`Grocery Business ID: ${groceryBizId}`);

    // --- B. IT & DIGITAL AGENCY ---
    let itBizRes = await client.query(`
      SELECT id, name, slug FROM business_profiles WHERE slug = 'technova-digital-agency' OR name ILIKE '%technova digital%' LIMIT 1
    `);
    let itBizId;
    if (itBizRes.rows.length === 0) {
      const instRes = await client.query(`
        INSERT INTO institution_profiles (name, slug, institution_type_id, email, phone, is_active)
        VALUES ('TechNova Digital & IT Solutions', 'technova-digital', 15, 'contact@technovadigital.com', '9988776655', TRUE)
        RETURNING id
      `);
      const instId = instRes.rows[0].id;

      const bizInsert = await client.query(`
        INSERT INTO business_profiles (
          institution_profile_id, name, slug, business_type, country_code, state, city, address,
          phone, email, website, about, established_year, is_verified, is_featured, is_active,
          logo_url, banner_url
        ) VALUES (
          $1, 'TechNova Digital & IT Solutions', 'technova-digital-agency', 'IT & Digital Agency',
          'IN', 'Karnataka', 'Bengaluru', 'Indiranagar 100ft Road, Tech Corridor, Bengaluru',
          '+91 99887 76655', 'hello@technovadigital.com', 'https://technovadigital.io',
          'Award-winning software engineering and digital agency specializing in full-stack web applications, scalable mobile apps, UI/UX design, and AI automation.',
          2020, TRUE, TRUE, TRUE,
          'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=400&q=80',
          'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80'
        ) RETURNING id
      `, [instId]);
      itBizId = bizInsert.rows[0].id;
    } else {
      itBizId = itBizRes.rows[0].id;
    }
    console.log(`IT Agency Business ID: ${itBizId}`);

    // --- C. SALON / BEAUTY PARLOUR ---
    let beautyBizRes = await client.query(`
      SELECT id, name, slug FROM business_profiles WHERE slug = 'anjali-beauty-parlour' OR name ILIKE '%anjali beauty%' LIMIT 1
    `);
    let beautyBizId = beautyBizRes.rows[0]?.id;
    if (!beautyBizId) {
      const instRes = await client.query(`
        INSERT INTO institution_profiles (name, slug, institution_type_id, email, phone, is_active)
        VALUES ('Anjali Beauty Parlour & Spa', 'anjali-beauty', 15, 'anjalibeauty@example.com', '9898989898', TRUE)
        RETURNING id
      `);
      const instId = instRes.rows[0].id;
      const bizInsert = await client.query(`
        INSERT INTO business_profiles (
          institution_profile_id, name, slug, business_type, country_code, state, city, address,
          phone, email, website, about, established_year, is_verified, is_featured, is_active,
          logo_url, banner_url
        ) VALUES (
          $1, 'Anjali Beauty Parlour & Studio', 'anjali-beauty-parlour', 'Retail & Commerce',
          'IN', 'Maharashtra', 'Mumbai', 'Shop 5, Sea Breeze Arcade, Bandra West, Mumbai',
          '+91 98989 89898', 'care@anjalibeauty.com', 'https://anjalibeauty.com',
          'Premier hair, makeup, and skin aesthetics salon providing bridal packages, facial rejuvenations, and organic wellness treatments.',
          2019, TRUE, TRUE, TRUE,
          'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=400&q=80',
          'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1200&q=80'
        ) RETURNING id
      `, [instId]);
      beautyBizId = bizInsert.rows[0].id;
    }
    console.log(`Beauty Salon Business ID: ${beautyBizId}`);

    // Helper: upsert master_product and product
    async function upsertProduct(p, bizId) {
      const existing = await client.query('SELECT id FROM master_products WHERE slug = $1 LIMIT 1', [p.slug]);
      if (existing.rows.length > 0) {
        await client.query(`
          UPDATE master_products SET
            name = $1, business_profile_id = $2, brand = $3, regular_price = $4, discounted_price = $5,
            currency = 'INR', unit_quantity = $6, stock_quantity = $7, default_image_url = $8,
            description = $9, is_available = TRUE, is_active = TRUE, listing_status = 'published'
          WHERE id = $10
        `, [p.name, bizId, p.brand, p.regular_price, p.discounted_price, p.unit_quantity, p.stock_quantity, p.image_url, p.description, existing.rows[0].id]);
      } else {
        await client.query(`
          INSERT INTO master_products (
            name, slug, profile_type, business_profile_id, brand, regular_price, discounted_price,
            currency, unit_quantity, stock_quantity, min_order_quantity, default_image_url, description,
            is_available, is_active, listing_status, countries
          ) VALUES (
            $1, $2, 'business', $3, $4, $5, $6, 'INR', $7, $8, 1, $9, $10, TRUE, TRUE, 'published', '{"IN"}'
          )
        `, [p.name, p.slug, bizId, p.brand, p.regular_price, p.discounted_price, p.unit_quantity, p.stock_quantity, p.image_url, p.description]);
      }

      // Also upsert into products table
      const existingPub = await client.query('SELECT id FROM products WHERE slug = $1 LIMIT 1', [p.slug]);
      if (existingPub.rows.length > 0) {
        await client.query(`
          UPDATE products SET
            title = $1, description = $2, price = $3, sale_price = $4, category = $5,
            image_url = $6, stock_quantity = $7, status = 'active'
          WHERE id = $8
        `, [p.name, p.description, p.regular_price, p.discounted_price, p.category, p.image_url, p.stock_quantity, existingPub.rows[0].id]);
      } else {
        await client.query(`
          INSERT INTO products (
            title, slug, description, price, sale_price, category, image_url, stock_quantity, status, is_featured
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, 'active', TRUE
          )
        `, [p.name, p.slug, p.description, p.regular_price, p.discounted_price, p.category, p.image_url, p.stock_quantity]);
      }
    }

    // Helper: upsert master_service
    async function upsertService(s, bizId, profId = null, profileType = 'business') {
      const existing = await client.query('SELECT id FROM master_services WHERE slug = $1 LIMIT 1', [s.slug]);
      if (existing.rows.length > 0) {
        await client.query(`
          UPDATE master_services SET
            name = $1, profile_type = $2, business_profile_id = $3, professional_profile_id = $4,
            pricing_model = $5, regular_price = $6, discounted_price = $7, currency = 'INR',
            estimated_duration = $8, service_location = $9, default_image_url = $10, description = $11,
            is_available = TRUE, is_active = TRUE
          WHERE id = $12
        `, [s.name, profileType, bizId, profId, s.pricing_model, s.regular_price, s.discounted_price, s.estimated_duration, s.service_location, s.image_url, s.description, existing.rows[0].id]);
      } else {
        await client.query(`
          INSERT INTO master_services (
            name, slug, profile_type, business_profile_id, professional_profile_id, pricing_model,
            regular_price, discounted_price, currency, estimated_duration, service_location,
            default_image_url, description, is_available, is_active
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, 'INR', $9, $10, $11, $12, TRUE, TRUE
          )
        `, [s.name, s.slug, profileType, bizId, profId, s.pricing_model, s.regular_price, s.discounted_price, s.estimated_duration, s.service_location, s.image_url, s.description]);
      }
    }

    // ==========================================
    // 2. SEED PRODUCTS (Aloo, Tamatar, Pyaz, etc.)
    // ==========================================
    const groceryProducts = [
      {
        name: 'Fresh Farm Aloo (Potatoes / आलू)',
        slug: 'fresh-farm-aloo-potatoes',
        brand: 'Kisan Fresh',
        regular_price: 45,
        discounted_price: 32,
        stock_quantity: 500,
        unit_quantity: 1,
        image_url: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=600&q=80',
        description: 'Fresh farm harvested organic potatoes (Aloo), pesticide-free, firm and perfect for boiling, roasting, and everyday cooking.',
        category: 'Vegetables & Groceries',
      },
      {
        name: 'Fresh Desi Tamatar (Tomatoes / टमाटर)',
        slug: 'fresh-desi-tamatar-tomatoes',
        brand: 'Kisan Fresh',
        regular_price: 55,
        discounted_price: 38,
        stock_quantity: 350,
        unit_quantity: 1,
        image_url: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=600&q=80',
        description: 'Ripe, juicy red farm-picked tomatoes (Tamatar). Rich in antioxidants, lycopene, and vitamin C, ideal for curries, salads, and purées.',
        category: 'Vegetables & Groceries',
      },
      {
        name: 'Nashik Red Pyaz (Onions / प्याज)',
        slug: 'nashik-red-pyaz-onions',
        brand: 'Kisan Fresh',
        regular_price: 65,
        discounted_price: 48,
        stock_quantity: 400,
        unit_quantity: 1,
        image_url: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&w=600&q=80',
        description: 'Premium graded Nashik red onions (Pyaz). Crispy, pungent, and long-lasting with great flavor for all Indian culinary needs.',
        category: 'Vegetables & Groceries',
      },
      {
        name: 'Fresh Organic Adrak (Ginger / अदरक)',
        slug: 'fresh-organic-adrak-ginger',
        brand: 'Kisan Fresh',
        regular_price: 130,
        discounted_price: 95,
        stock_quantity: 200,
        unit_quantity: 0.5,
        image_url: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=600&q=80',
        description: 'Fresh aromatic ginger roots with strong punch and medicinal qualities. Perfect for immunity booster tea and rich gravies.',
        category: 'Vegetables & Groceries',
      },
    ];

    const salonProducts = [
      {
        name: 'Organic Herbal Bhringraj Hair Oil (200ml)',
        slug: 'organic-bhringraj-hair-oil',
        brand: 'Anjali Naturals',
        regular_price: 550,
        discounted_price: 420,
        stock_quantity: 120,
        unit_quantity: 1,
        image_url: 'https://images.unsplash.com/photo-1608248597359-54359d9c228d?auto=format&fit=crop&w=600&q=80',
        description: '100% cold-pressed herbal hair care oil infused with Bhringraj, Amla, and Brahmi for deep scalp nourishment and hair regrowth.',
        category: 'Beauty & Personal Care',
      },
      {
        name: 'Pure Damascus Rose Water Facial Mist (150ml)',
        slug: 'damascus-rose-water-facial-mist',
        brand: 'Anjali Naturals',
        regular_price: 350,
        discounted_price: 260,
        stock_quantity: 150,
        unit_quantity: 1,
        image_url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=600&q=80',
        description: 'Hydro-distilled pure organic rose water skin toner. Balances pH, hydrates tired skin, and leaves a refreshing floral glow.',
        category: 'Beauty & Personal Care',
      },
    ];

    for (const p of groceryProducts) {
      await upsertProduct(p, groceryBizId);
    }
    console.log(`Upserted ${groceryProducts.length} grocery products.`);

    for (const p of salonProducts) {
      await upsertProduct(p, beautyBizId);
    }
    console.log(`Upserted ${salonProducts.length} salon products.`);

    // ==========================================
    // 3. SEED SERVICES (Web Dev, App Dev, UI/UX, SEO, Salon)
    // ==========================================
    const itServices = [
      {
        name: 'Custom Full-Stack Web Development',
        slug: 'custom-fullstack-web-development',
        pricing_model: 'Project Based',
        regular_price: 45000,
        discounted_price: 34999,
        estimated_duration: '2 - 3 Weeks',
        service_location: 'Remote / Online',
        image_url: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=600&q=80',
        description: 'Complete high-performance web development utilizing React, Next.js, TypeScript, PostgreSQL, and Tailwind CSS. Includes responsive layouts, SEO setup, secure auth, API integrations, and cloud deployment.',
      },
      {
        name: 'Native & Cross-Platform Mobile App Development',
        slug: 'native-mobile-app-development-ios-android',
        pricing_model: 'Project Based',
        regular_price: 65000,
        discounted_price: 49999,
        estimated_duration: '3 - 5 Weeks',
        service_location: 'Remote / Online',
        image_url: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=600&q=80',
        description: 'Full lifecycle mobile application development with React Native and Flutter. Includes push notifications, payment gateway integration, smooth 60fps animations, and App Store / Google Play submission.',
      },
      {
        name: 'UI/UX Design & Interactive Figma Prototyping',
        slug: 'ui-ux-design-figma-prototyping',
        pricing_model: 'Fixed Package',
        regular_price: 25000,
        discounted_price: 18500,
        estimated_duration: '7 - 10 Days',
        service_location: 'Remote / Online',
        image_url: 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?auto=format&fit=crop&w=600&q=80',
        description: 'User-centric wireframes, modern visual design systems, component libraries, and clickable interactive prototypes crafted in Figma for web, iOS, and SaaS applications.',
      },
      {
        name: 'Enterprise SEO & Search Visibility Accelerator',
        slug: 'enterprise-seo-search-visibility',
        pricing_model: 'Monthly Retainer',
        regular_price: 18000,
        discounted_price: 13999,
        estimated_duration: 'Monthly Campaign',
        service_location: 'Remote / Online',
        image_url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80',
        description: 'Data-driven on-page and off-page SEO optimization, technical site audits, Core Web Vitals tune-up, keyword clustering, and high-authority backlink building to drive organic organic traffic.',
      },
    ];

    const salonServices = [
      {
        name: 'Signature Bridal Makeover & HD Styling Package',
        slug: 'signature-bridal-makeover-hd-styling',
        pricing_model: 'Package',
        regular_price: 16000,
        discounted_price: 12500,
        estimated_duration: '3 - 4 Hours',
        service_location: 'Salon & On-Location',
        image_url: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=600&q=80',
        description: 'Complete luxury bridal HD makeup, saree draping, customized hair styling, eyelashes, and pre-bridal skin preparation for your unforgettable wedding day.',
      },
      {
        name: 'Intensive Keratin Hair Spa & Rejuvenation Therapy',
        slug: 'keratin-hair-spa-rejuvenation',
        pricing_model: 'Per Session',
        regular_price: 4500,
        discounted_price: 3200,
        estimated_duration: '90 Minutes',
        service_location: 'In-Salon',
        image_url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=80',
        description: 'Deep hair fiber restorative treatment that eliminates frizz, restores natural shine, and injects moisture using botanical proteins and pure keratin extracts.',
      },
    ];

    for (const s of itServices) {
      await upsertService(s, itBizId, null, 'business');
    }
    console.log(`Upserted ${itServices.length} IT services.`);

    for (const s of salonServices) {
      await upsertService(s, beautyBizId, null, 'business');
    }
    console.log(`Upserted ${salonServices.length} salon services.`);

    // ==========================================
    // 4. SEED PROFESSIONAL PROFILES
    // ==========================================
    const professionals = [
      {
        name: 'Rahul Verma',
        slug: 'rahul-verma-lead-web-dev',
        designation: 'Lead Full-Stack Web Architect',
        profession_type: 'Software Engineer',
        professional_title: 'Full Stack Engineer & Tech Lead',
        skills: ['React', 'Next.js', 'Node.js', 'PostgreSQL', 'TypeScript', 'Docker', 'AWS'],
        experience_years: 7,
        city: 'Bengaluru',
        state: 'Karnataka',
        phone: '+91 99112 23344',
        email: 'rahul.verma.dev@technovadigital.io',
        avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
        business_profile_id: itBizId,
        about: 'Seasoned full-stack developer with 7+ years of building production SaaS platforms, distributed backend systems, and clean Next.js/React web solutions.',
      },
      {
        name: 'Priya Sharma',
        slug: 'priya-sharma-senior-mobile-dev',
        designation: 'Senior Mobile App Developer',
        profession_type: 'Mobile App Engineer',
        professional_title: 'iOS & Android Specialist',
        skills: ['React Native', 'Flutter', 'Swift', 'Kotlin', 'Firebase', 'State Management'],
        experience_years: 5,
        city: 'Bengaluru',
        state: 'Karnataka',
        phone: '+91 99113 34455',
        email: 'priya.sharma.apps@technovadigital.io',
        avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
        business_profile_id: itBizId,
        about: 'Passionate mobile software engineer with track record of shipping 15+ highly rated apps across Google Play and Apple App Store.',
      },
      {
        name: 'Arjun Mehta',
        slug: 'arjun-mehta-lead-ui-ux-designer',
        designation: 'Principal UI/UX Product Designer',
        profession_type: 'Product Designer',
        professional_title: 'Lead Experience Designer',
        skills: ['Figma', 'User Research', 'Design Systems', 'Wireframing', 'Prototyping', 'Usability Testing'],
        experience_years: 6,
        city: 'Bengaluru',
        state: 'Karnataka',
        phone: '+91 99114 45566',
        email: 'arjun.mehta.design@technovadigital.io',
        avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
        business_profile_id: itBizId,
        about: 'Crafting user-friendly interfaces that convert visitors into loyal customers. Specialist in Figma design systems, micro-interactions, and conversion design.',
      },
      {
        name: 'Anjali Soni',
        slug: 'anjali-soni-aesthetic-stylist',
        designation: 'Master Aesthetician & Bridal Stylist',
        profession_type: 'Hair & Makeup Artist',
        professional_title: 'Senior Aesthetician',
        skills: ['Bridal Makeup', 'Airbrush Makeup', 'Keratin Therapy', 'Skin Rejuvenation', 'Saree Draping'],
        experience_years: 9,
        city: 'Mumbai',
        state: 'Maharashtra',
        phone: '+91 98989 89898',
        email: 'anjali.stylist@anjalibeauty.com',
        avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
        business_profile_id: beautyBizId,
        about: 'Certified bridal makeup artist and cosmetologist with over 9 years of expertise transforming looks for high-profile weddings and luxury photo shoots.',
      },
      {
        name: 'Ramesh Kumar',
        slug: 'ramesh-kumar-supply-quality-manager',
        designation: 'Quality & Sourcing Specialist',
        profession_type: 'Agri Supply Manager',
        professional_title: 'Mandi Quality Auditor',
        skills: ['Farm Produce Quality Check', 'Cold Storage Logistics', 'Organic Sourcing', 'Inventory Management'],
        experience_years: 8,
        city: 'New Delhi',
        state: 'Delhi',
        phone: '+91 98765 43211',
        email: 'ramesh.kumar@kisanfreshmandi.com',
        avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
        business_profile_id: groceryBizId,
        about: 'Dedicated agricultural produce inspector ensuring only Grade-A quality vegetables and farm crops reach retail consumers.',
      },
    ];

    for (const prof of professionals) {
      let profId;
      const existingProf = await client.query('SELECT id FROM professional_profiles WHERE slug = $1 LIMIT 1', [prof.slug]);
      if (existingProf.rows.length > 0) {
        profId = existingProf.rows[0].id;
        await client.query(`
          UPDATE professional_profiles SET
            name = $1, designation = $2, profession_type = $3, professional_title = $4,
            skills = $5, experience_years = $6, city = $7, state = $8, phone = $9, email = $10,
            avatar_url = $11, business_profile_id = $12, about = $13, is_verified = TRUE,
            is_featured = TRUE, is_active = TRUE
          WHERE id = $14
        `, [
          prof.name, prof.designation, prof.profession_type, prof.professional_title,
          prof.skills, prof.experience_years, prof.city, prof.state, prof.phone, prof.email,
          prof.avatar_url, prof.business_profile_id, prof.about, profId
        ]);
      } else {
        const profInsert = await client.query(`
          INSERT INTO professional_profiles (
            name, slug, designation, profession_type, professional_title, skills,
            experience_years, city, state, country_code, phone, email, avatar_url,
            business_profile_id, about, is_verified, is_featured, is_active
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, 'IN', $10, $11, $12, $13, $14, TRUE, TRUE, TRUE
          )
          RETURNING id
        `, [
          prof.name, prof.slug, prof.designation, prof.profession_type, prof.professional_title,
          prof.skills, prof.experience_years, prof.city, prof.state, prof.phone, prof.email,
          prof.avatar_url, prof.business_profile_id, prof.about
        ]);
        profId = profInsert.rows[0].id;
      }

      // Link consultation service to this professional
      await upsertService({
        name: `1-on-1 Consultation with ${prof.name} (${prof.designation})`,
        slug: `consultation-${prof.slug}`,
        pricing_model: 'Per Session',
        regular_price: 2500,
        discounted_price: 1800,
        estimated_duration: '45 Minutes',
        service_location: 'Online / Video Call',
        image_url: prof.avatar_url,
        description: `Direct 1-on-1 professional advisory and mentoring session with ${prof.name}. Discuss your project requirements, code review, design critique, or business strategy.`
      }, prof.business_profile_id, profId, 'professional');
    }
    console.log(`Upserted ${professionals.length} professionals and consultation services.`);

    await client.query('COMMIT');
    console.log('✅ ALL DUMMY BUSINESSES, PRODUCTS, SERVICES & PROFESSIONALS SEEDED SUCCESSFULLY!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seeding Error:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
