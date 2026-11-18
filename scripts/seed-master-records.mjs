import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true',
});

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .trim();
}

async function insertRecord({ verticalId, typeId, parentId = null, name, code = null, description = '', order = 0, metadata = {} }) {
  const slug = slugify(name);
  const res = await pool.query(`
    INSERT INTO master_records (vertical_id, master_type_id, parent_id, code, name, slug, description, display_order, status, metadata)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', $9)
    ON CONFLICT (master_type_id, slug) DO UPDATE
    SET name = EXCLUDED.name,
        parent_id = EXCLUDED.parent_id,
        code = EXCLUDED.code,
        description = EXCLUDED.description,
        display_order = EXCLUDED.display_order,
        metadata = EXCLUDED.metadata,
        updated_at = NOW()
    RETURNING id;
  `, [verticalId, typeId, parentId, code || slug, name, slug, description, order, JSON.stringify(metadata)]);
  return res.rows[0].id;
}

async function insertAttribute({ verticalId, typeId, name, label, fieldType, placeholder = '', options = [], isRequired = false, rules = {}, order = 0 }) {
  await pool.query(`
    INSERT INTO master_attributes (vertical_id, master_type_id, name, label, field_type, placeholder, options, is_required, validation_rules, display_order)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    ON CONFLICT (master_type_id, name) DO UPDATE
    SET label = EXCLUDED.label,
        field_type = EXCLUDED.field_type,
        placeholder = EXCLUDED.placeholder,
        options = EXCLUDED.options,
        is_required = EXCLUDED.is_required,
        validation_rules = EXCLUDED.validation_rules,
        display_order = EXCLUDED.display_order,
        updated_at = NOW();
  `, [verticalId, typeId, name, label, fieldType, placeholder, JSON.stringify(options), isRequired, JSON.stringify(rules), order]);
}

async function seed() {
  console.log('🌱 Seeding initial standard master records and attributes across all 7 verticals...');

  // Fetch all verticals & master types
  const vRows = (await pool.query(`SELECT id, code FROM master_verticals`)).rows;
  const vMap = Object.fromEntries(vRows.map(r => [r.code, r.id]));

  const mtRows = (await pool.query(`SELECT id, vertical_id, code FROM master_types`)).rows;
  const mtMap = {};
  for (const r of mtRows) {
    mtMap[`${r.vertical_id}:${r.code}`] = r.id;
  }

  // ==========================================
  // A. VEHICLE MANAGEMENT
  // ==========================================
  const vVeh = vMap['vehicles'];
  if (vVeh) {
    const tType = mtMap[`${vVeh}:vehicle_types`];
    const tCat = mtMap[`${vVeh}:vehicle_categories`];
    const tSub = mtMap[`${vVeh}:vehicle_subcategories`];
    const tBrand = mtMap[`${vVeh}:vehicle_brands`];
    const tModel = mtMap[`${vVeh}:vehicle_models`];
    const tVariant = mtMap[`${vVeh}:vehicle_variants`];
    const tFuel = mtMap[`${vVeh}:fuel_types`];
    const tTrans = mtMap[`${vVeh}:transmission_types`];
    const tBody = mtMap[`${vVeh}:body_types`];
    const tCond = mtMap[`${vVeh}:vehicle_conditions`];

    // Types
    const motorVehId = await insertRecord({ verticalId: vVeh, typeId: tType, name: 'Motor Vehicle', order: 1 });
    const nonMotorVehId = await insertRecord({ verticalId: vVeh, typeId: tType, name: 'Non-Motorized Vehicle', order: 2 });

    // Categories
    const carCatId = await insertRecord({ verticalId: vVeh, typeId: tCat, parentId: motorVehId, name: 'Car / Passenger Vehicle', order: 1 });
    const motoCatId = await insertRecord({ verticalId: vVeh, typeId: tCat, parentId: motorVehId, name: 'Motorcycle / Two Wheeler', order: 2 });
    const commCatId = await insertRecord({ verticalId: vVeh, typeId: tCat, parentId: motorVehId, name: 'Commercial Vehicle', order: 3 });

    // Subcategories (under Car)
    const suvSubId = await insertRecord({ verticalId: vVeh, typeId: tSub, parentId: carCatId, name: 'SUV (Sports Utility Vehicle)', order: 1 });
    const sedanSubId = await insertRecord({ verticalId: vVeh, typeId: tSub, parentId: carCatId, name: 'Sedan', order: 2 });
    const hatchSubId = await insertRecord({ verticalId: vVeh, typeId: tSub, parentId: carCatId, name: 'Hatchback', order: 3 });

    // Brands
    const toyotaId = await insertRecord({ verticalId: vVeh, typeId: tBrand, parentId: suvSubId, name: 'Toyota', order: 1 });
    const hyundaiId = await insertRecord({ verticalId: vVeh, typeId: tBrand, parentId: sedanSubId, name: 'Hyundai', order: 2 });
    const bmwId = await insertRecord({ verticalId: vVeh, typeId: tBrand, parentId: suvSubId, name: 'BMW', order: 3 });
    const hondaId = await insertRecord({ verticalId: vVeh, typeId: tBrand, parentId: sedanSubId, name: 'Honda', order: 4 });

    // Models
    const fortunerId = await insertRecord({ verticalId: vVeh, typeId: tModel, parentId: toyotaId, name: 'Fortuner', order: 1 });
    const corollaId = await insertRecord({ verticalId: vVeh, typeId: tModel, parentId: toyotaId, name: 'Corolla Altis', order: 2 });
    const cretaId = await insertRecord({ verticalId: vVeh, typeId: tModel, parentId: hyundaiId, name: 'Creta', order: 3 });
    const cityId = await insertRecord({ verticalId: vVeh, typeId: tModel, parentId: hondaId, name: 'City', order: 4 });

    // Variants
    await insertRecord({ verticalId: vVeh, typeId: tVariant, parentId: fortunerId, name: '2.8 4x4 AT Diesel', order: 1 });
    await insertRecord({ verticalId: vVeh, typeId: tVariant, parentId: fortunerId, name: '2.7 4x2 MT Petrol', order: 2 });
    await insertRecord({ verticalId: vVeh, typeId: tVariant, parentId: cityId, name: 'ZX CVT Petrol', order: 1 });
    await insertRecord({ verticalId: vVeh, typeId: tVariant, parentId: cityId, name: 'V MT Petrol', order: 2 });

    // Fuel Types
    for (const f of ['Petrol', 'Diesel', 'Electric (EV)', 'Hybrid', 'CNG', 'LPG', 'Hydrogen']) {
      await insertRecord({ verticalId: vVeh, typeId: tFuel, name: f });
    }

    // Transmission Types
    for (const t of ['Manual (MT)', 'Automatic (AT)', 'Continuously Variable (CVT)', 'Dual-Clutch (DCT)', 'Automated Manual (AMT)', 'Single-Speed (EV)']) {
      await insertRecord({ verticalId: vVeh, typeId: tTrans, name: t });
    }

    // Body Types
    for (const b of ['SUV', 'Sedan', 'Hatchback', 'Coupe', 'Convertible', 'Station Wagon', 'Pickup Truck', 'Van / Minivan', 'Crossover']) {
      await insertRecord({ verticalId: vVeh, typeId: tBody, name: b });
    }

    // Vehicle Conditions
    for (const c of ['Brand New', 'Certified Pre-Owned', 'Used / Second Hand', 'Refurbished', 'Vintage / Classic']) {
      await insertRecord({ verticalId: vVeh, typeId: tCond, name: c });
    }

    // Attributes for Vehicles
    await insertAttribute({ verticalId: vVeh, typeId: tVariant, name: 'engine_capacity_cc', label: 'Engine Capacity (cc)', fieldType: 'number', placeholder: 'e.g. 1498', isRequired: true, order: 1 });
    await insertAttribute({ verticalId: vVeh, typeId: tVariant, name: 'mileage_kmpl', label: 'Mileage (km/l or km/charge)', fieldType: 'decimal', placeholder: 'e.g. 18.5', order: 2 });
    await insertAttribute({ verticalId: vVeh, typeId: tVariant, name: 'manufacturing_year', label: 'Manufacturing Year', fieldType: 'number', placeholder: 'e.g. 2026', order: 3 });
    await insertAttribute({ verticalId: vVeh, typeId: tVariant, name: 'seating_capacity', label: 'Seating Capacity', fieldType: 'dropdown', options: ['2 Seater', '4 Seater', '5 Seater', '7 Seater', '8+ Seater'], order: 4 });
    await insertAttribute({ verticalId: vVeh, typeId: tVariant, name: 'color', label: 'Exterior Color', fieldType: 'text', placeholder: 'e.g. Pearl White', order: 5 });
    await insertAttribute({ verticalId: vVeh, typeId: tVariant, name: 'sunroof', label: 'Has Sunroof', fieldType: 'boolean', order: 6 });
  }

  // ==========================================
  // B. PROPERTY MANAGEMENT
  // ==========================================
  const vProp = vMap['properties'];
  if (vProp) {
    const tCat = mtMap[`${vProp}:property_categories`];
    const tSub = mtMap[`${vProp}:property_subcategories`];
    const tType = mtMap[`${vProp}:property_types`];
    const tOwn = mtMap[`${vProp}:ownership_types`];
    const tFurn = mtMap[`${vProp}:furnishing_types`];
    const tConst = mtMap[`${vProp}:construction_status`];
    const tCond = mtMap[`${vProp}:property_conditions`];
    const tAmen = mtMap[`${vProp}:amenities`];
    const tLand = mtMap[`${vProp}:land_types`];
    const tList = mtMap[`${vProp}:listing_types`];

    // Categories
    const resId = await insertRecord({ verticalId: vProp, typeId: tCat, name: 'Residential', order: 1 });
    const commId = await insertRecord({ verticalId: vProp, typeId: tCat, name: 'Commercial', order: 2 });
    const landId = await insertRecord({ verticalId: vProp, typeId: tCat, name: 'Land & Plots', order: 3 });

    // Subcategories
    const aptId = await insertRecord({ verticalId: vProp, typeId: tSub, parentId: resId, name: 'Apartment / Flat', order: 1 });
    const villaId = await insertRecord({ verticalId: vProp, typeId: tSub, parentId: resId, name: 'Independent House / Villa', order: 2 });
    const officeId = await insertRecord({ verticalId: vProp, typeId: tSub, parentId: commId, name: 'Commercial Office Space', order: 3 });
    const shopId = await insertRecord({ verticalId: vProp, typeId: tSub, parentId: commId, name: 'Retail Shop / Showroom', order: 4 });

    // Property Types
    await insertRecord({ verticalId: vProp, typeId: tType, parentId: aptId, name: '1 BHK Apartment', order: 1 });
    await insertRecord({ verticalId: vProp, typeId: tType, parentId: aptId, name: '2 BHK Apartment', order: 2 });
    await insertRecord({ verticalId: vProp, typeId: tType, parentId: aptId, name: '3 BHK Apartment', order: 3 });
    await insertRecord({ verticalId: vProp, typeId: tType, parentId: aptId, name: 'Penthouse', order: 4 });
    await insertRecord({ verticalId: vProp, typeId: tType, parentId: villaId, name: 'Luxury Duplex Villa', order: 5 });
    await insertRecord({ verticalId: vProp, typeId: tType, parentId: officeId, name: 'Co-Working Dedicated Desk', order: 6 });
    await insertRecord({ verticalId: vProp, typeId: tType, parentId: officeId, name: 'Bare Shell Corporate Office', order: 7 });

    // Ownership
    for (const o of ['Freehold', 'Leasehold', 'Power of Attorney (POA)', 'Co-operative Society']) {
      await insertRecord({ verticalId: vProp, typeId: tOwn, name: o });
    }

    // Furnishing
    for (const f of ['Fully Furnished', 'Semi-Furnished', 'Unfurnished']) {
      await insertRecord({ verticalId: vProp, typeId: tFurn, name: f });
    }

    // Construction Status
    for (const c of ['Ready to Move', 'Under Construction', 'New Launch', 'Near Completion']) {
      await insertRecord({ verticalId: vProp, typeId: tConst, name: c });
    }

    // Property Conditions
    for (const p of ['Pristine / Brand New', 'Excellent Condition', 'Good Condition', 'Needs Minor Renovation', 'Full Renovation Required']) {
      await insertRecord({ verticalId: vProp, typeId: tCond, name: p });
    }

    // Amenities
    for (const a of ['Swimming Pool', 'Fitness Gym', '24/7 Power Backup', 'Covered Car Parking', 'Elevator / Lift', 'Gated Security', 'Club House', 'Children Play Area', 'Rooftop Garden', 'Intercom']) {
      await insertRecord({ verticalId: vProp, typeId: tAmen, name: a });
    }

    // Land Types
    for (const l of ['Agricultural Land', 'Residential Plot', 'Commercial Plot', 'Industrial Land', 'Mixed-Use Land']) {
      await insertRecord({ verticalId: vProp, typeId: tLand, name: l });
    }

    // Listing Types
    for (const lt of ['For Sale', 'For Rent', 'For Lease', 'PG / Co-Living', 'Short-Term Holiday Rental']) {
      await insertRecord({ verticalId: vProp, typeId: tList, name: lt });
    }

    // Attributes for Properties
    await insertAttribute({ verticalId: vProp, typeId: tType, name: 'bedrooms', label: 'Number of Bedrooms', fieldType: 'number', placeholder: 'e.g. 3', order: 1 });
    await insertAttribute({ verticalId: vProp, typeId: tType, name: 'bathrooms', label: 'Number of Bathrooms', fieldType: 'number', placeholder: 'e.g. 2', order: 2 });
    await insertAttribute({ verticalId: vProp, typeId: tType, name: 'carpet_area_sqft', label: 'Carpet Area (sq. ft.)', fieldType: 'number', placeholder: 'e.g. 1450', isRequired: true, order: 3 });
    await insertAttribute({ verticalId: vProp, typeId: tType, name: 'super_builtup_area_sqft', label: 'Super Built-Up Area (sq. ft.)', fieldType: 'number', placeholder: 'e.g. 1850', order: 4 });
    await insertAttribute({ verticalId: vProp, typeId: tType, name: 'floor_number', label: 'Floor Number', fieldType: 'text', placeholder: 'e.g. 8th Floor of 14', order: 5 });
    await insertAttribute({ verticalId: vProp, typeId: tType, name: 'facing_direction', label: 'Facing Direction', fieldType: 'dropdown', options: ['North', 'East', 'North-East', 'South', 'West', 'North-West'], order: 6 });
  }

  // ==========================================
  // C. RESTAURANT & FOOD MANAGEMENT
  // ==========================================
  const vRest = vMap['restaurants'];
  if (vRest) {
    const tCat = mtMap[`${vRest}:menu_categories`];
    const tSub = mtMap[`${vRest}:menu_subcategories`];
    const tDish = mtMap[`${vRest}:dishes`];
    const tCuis = mtMap[`${vRest}:cuisines`];
    const tDiet = mtMap[`${vRest}:dietary_types`];
    const tFood = mtMap[`${vRest}:food_types`];
    const tUnit = mtMap[`${vRest}:serving_units`];
    const tMeal = mtMap[`${vRest}:meal_types`];
    const tIngr = mtMap[`${vRest}:ingredients`];
    const tAllg = mtMap[`${vRest}:allergen_types`];

    // Categories
    const startersId = await insertRecord({ verticalId: vRest, typeId: tCat, name: 'Starters & Appetizers', order: 1 });
    const mainCourseId = await insertRecord({ verticalId: vRest, typeId: tCat, name: 'Main Course', order: 2 });
    const dessertsId = await insertRecord({ verticalId: vRest, typeId: tCat, name: 'Desserts & Sweets', order: 3 });
    const beveragesId = await insertRecord({ verticalId: vRest, typeId: tCat, name: 'Beverages & Mocktails', order: 4 });

    // Subcategories
    const vegStartId = await insertRecord({ verticalId: vRest, typeId: tSub, parentId: startersId, name: 'Veg Starters', order: 1 });
    const nonVegStartId = await insertRecord({ verticalId: vRest, typeId: tSub, parentId: startersId, name: 'Non-Veg Starters', order: 2 });
    const indMainId = await insertRecord({ verticalId: vRest, typeId: tSub, parentId: mainCourseId, name: 'North Indian Gravies', order: 3 });
    const cakeId = await insertRecord({ verticalId: vRest, typeId: tSub, parentId: dessertsId, name: 'Cakes & Pastries', order: 4 });

    // Dishes
    const paneerTikkaId = await insertRecord({ verticalId: vRest, typeId: tDish, parentId: vegStartId, name: 'Paneer Tikka Shashlik', description: 'Cottage cheese cubes marinated in spiced yogurt and roasted in tandoor', order: 1 });
    const springRollId = await insertRecord({ verticalId: vRest, typeId: tDish, parentId: vegStartId, name: 'Crispy Vegetable Spring Rolls', description: 'Golden fried rolls filled with fresh seasonal vegetables', order: 2 });
    const butterChickenId = await insertRecord({ verticalId: vRest, typeId: tDish, parentId: indMainId, name: 'Classic Butter Chicken', description: 'Tender chicken pieces simmered in rich creamy tomato and butter gravy', order: 3 });
    const dalMakhaniId = await insertRecord({ verticalId: vRest, typeId: tDish, parentId: indMainId, name: 'Dal Makhani Royal', description: 'Slow cooked black lentils with cream and butter', order: 4 });
    const chocoLavaId = await insertRecord({ verticalId: vRest, typeId: tDish, parentId: cakeId, name: 'Molten Chocolate Lava Cake', description: 'Warm chocolate cake with a gooey liquid chocolate center', order: 5 });

    // Cuisines
    for (const c of ['North Indian', 'South Indian', 'Mughlai', 'Chinese', 'Italian', 'Continental', 'Mexican', 'Thai', 'Japanese / Sushi']) {
      await insertRecord({ verticalId: vRest, typeId: tCuis, name: c });
    }

    // Dietary Types
    for (const d of ['Vegetarian', 'Non-Vegetarian', 'Vegan', 'Eggitarian', 'Jain Friendly', 'Gluten-Free', 'Keto Friendly']) {
      await insertRecord({ verticalId: vRest, typeId: tDiet, name: d });
    }

    // Food Types
    for (const ft of ['Solid Food', 'Rich Gravy', 'Broth / Clear Soup', 'Crisp Snack', 'Bakery / Confectionery', 'Frozen Dessert', 'Chilled Beverage']) {
      await insertRecord({ verticalId: vRest, typeId: tFood, name: ft });
    }

    // Serving Units
    for (const u of ['Per Portion (Standard)', 'Full Plate', 'Half Plate', 'Per Piece', 'Bowl (300ml)', 'Glass (350ml)', 'Bucket / Platter']) {
      await insertRecord({ verticalId: vRest, typeId: tUnit, name: u });
    }

    // Meal Types
    for (const m of ['Breakfast', 'Morning Brunch', 'Executive Lunch', 'High Tea / Evening Snack', 'Dinner', 'Midnight Cravings']) {
      await insertRecord({ verticalId: vRest, typeId: tMeal, name: m });
    }

    // Ingredients
    for (const i of ['Paneer (Cottage Cheese)', 'Chicken', 'Mutton', 'Basmati Rice', 'Butter', 'Heavy Cream', 'Garlic', 'Ginger', 'Tomato Puree', 'Bell Peppers', 'Belgian Dark Chocolate']) {
      await insertRecord({ verticalId: vRest, typeId: tIngr, name: i });
    }

    // Allergen Types
    for (const a of ['Dairy & Lactose', 'Tree Nuts & Peanuts', 'Wheat & Gluten', 'Soy Products', 'Eggs', 'Fish & Shellfish', 'Mustard', 'Sesame Seeds']) {
      await insertRecord({ verticalId: vRest, typeId: tAllg, name: a });
    }

    // Attributes for Dishes
    await insertAttribute({ verticalId: vRest, typeId: tDish, name: 'price', label: 'Base Price (₹)', fieldType: 'number', placeholder: 'e.g. 380', isRequired: true, order: 1 });
    await insertAttribute({ verticalId: vRest, typeId: tDish, name: 'spice_level', label: 'Spice Level', fieldType: 'dropdown', options: ['Mild', 'Medium', 'Spicy', 'Extra Hot'], order: 2 });
    await insertAttribute({ verticalId: vRest, typeId: tDish, name: 'preparation_time_mins', label: 'Prep Time (minutes)', fieldType: 'number', placeholder: 'e.g. 20', order: 3 });
    await insertAttribute({ verticalId: vRest, typeId: tDish, name: 'calories_kcal', label: 'Estimated Calories (kcal)', fieldType: 'number', placeholder: 'e.g. 450', order: 4 });
    await insertAttribute({ verticalId: vRest, typeId: tDish, name: 'is_chef_special', label: "Chef's Special Recommendation", fieldType: 'boolean', order: 5 });
  }

  // ==========================================
  // D. HOTEL MANAGEMENT
  // ==========================================
  const vHot = vMap['hotels'];
  if (vHot) {
    const tCat = mtMap[`${vHot}:room_categories`];
    const tSub = mtMap[`${vHot}:room_subcategories`];
    const tType = mtMap[`${vHot}:room_types`];
    const tBed = mtMap[`${vHot}:bed_types`];
    const tAmen = mtMap[`${vHot}:room_amenities`];
    const tView = mtMap[`${vHot}:view_types`];
    const tOcc = mtMap[`${vHot}:occupancy_types`];
    const tMeal = mtMap[`${vHot}:meal_plans`];
    const tAcc = mtMap[`${vHot}:accommodation_types`];
    const tCond = mtMap[`${vHot}:room_conditions`];

    // Categories
    const stdCatId = await insertRecord({ verticalId: vHot, typeId: tCat, name: 'Standard Class', order: 1 });
    const dlxCatId = await insertRecord({ verticalId: vHot, typeId: tCat, name: 'Deluxe Class', order: 2 });
    const luxCatId = await insertRecord({ verticalId: vHot, typeId: tCat, name: 'Luxury / Executive Suite', order: 3 });

    // Subcategories
    const stdSingleId = await insertRecord({ verticalId: vHot, typeId: tSub, parentId: stdCatId, name: 'Standard Single Room', order: 1 });
    const stdDoubleId = await insertRecord({ verticalId: vHot, typeId: tSub, parentId: stdCatId, name: 'Standard Double Room', order: 2 });
    const dlxKingId = await insertRecord({ verticalId: vHot, typeId: tSub, parentId: dlxCatId, name: 'Deluxe King Suite', order: 3 });

    // Room Types
    await insertRecord({ verticalId: vHot, typeId: tType, parentId: stdSingleId, name: 'Economy Solo Room', order: 1 });
    await insertRecord({ verticalId: vHot, typeId: tType, parentId: stdDoubleId, name: 'Superior Twin Sharing', order: 2 });
    await insertRecord({ verticalId: vHot, typeId: tType, parentId: dlxKingId, name: 'Royal Heritage King Room', order: 3 });

    // Bed Types
    for (const b of ['Single Bed', 'Double Bed', 'Queen Size Bed', 'King Size Bed', 'Twin Sharing Beds', 'Bunk Bed', 'Foldable Extra Cot']) {
      await insertRecord({ verticalId: vHot, typeId: tBed, name: b });
    }

    // Room Amenities
    for (const a of ['Central Air Conditioning', 'High Speed Wi-Fi', 'Smart LED TV', 'Mini Fridge / Minibar', 'Tea / Coffee Maker', 'Electronic In-room Safe', 'Ensuite Jacuzzi', 'Hair Dryer', 'Daily Housekeeping', 'Bathrobes & Slippers']) {
      await insertRecord({ verticalId: vHot, typeId: tAmen, name: a });
    }

    // View Types
    for (const v of ['City Skyline View', 'Sea / Ocean Front View', 'Lush Mountain View', 'Garden / Courtyard View', 'Swimming Pool View', 'Riverfront View']) {
      await insertRecord({ verticalId: vHot, typeId: tView, name: v });
    }

    // Occupancy Types
    for (const o of ['Single Occupancy (1 Adult)', 'Double Occupancy (2 Adults)', 'Triple Occupancy (3 Adults)', 'Family Occupancy (2 Adults + 2 Children)', 'Group Dormitory']) {
      await insertRecord({ verticalId: vHot, typeId: tOcc, name: o });
    }

    // Meal Plans
    for (const mp of ['EP - European Plan (Room Only)', 'CP - Continental Plan (Room + Breakfast)', 'MAP - Modified American Plan (Room + Breakfast + Dinner)', 'AP - American Plan (All Meals Included)']) {
      await insertRecord({ verticalId: vHot, typeId: tMeal, name: mp });
    }

    // Accommodation Types
    for (const ac of ['Luxury 5-Star Hotel', 'Boutique Heritage Hotel', 'Beach Resort', 'Business Hotel', 'Serviced Luxury Apartment', 'Eco-Lodge / Farmstay', 'Youth Hostel']) {
      await insertRecord({ verticalId: vHot, typeId: tAcc, name: ac });
    }

    // Room Conditions
    for (const rc of ['Ready & Available', 'Occupied by Guest', 'Reserved / Check-In Due', 'Cleaning & Housekeeping In Progress', 'Under Maintenance']) {
      await insertRecord({ verticalId: vHot, typeId: tCond, name: rc });
    }

    // Attributes for Rooms
    await insertAttribute({ verticalId: vHot, typeId: tType, name: 'room_size_sqft', label: 'Room Area (sq. ft.)', fieldType: 'number', placeholder: 'e.g. 350', isRequired: true, order: 1 });
    await insertAttribute({ verticalId: vHot, typeId: tType, name: 'max_adults', label: 'Max Adults Allowed', fieldType: 'number', placeholder: 'e.g. 2', order: 2 });
    await insertAttribute({ verticalId: vHot, typeId: tType, name: 'max_children', label: 'Max Children Allowed', fieldType: 'number', placeholder: 'e.g. 1', order: 3 });
    await insertAttribute({ verticalId: vHot, typeId: tType, name: 'smoking_allowed', label: 'Smoking Permitted in Room', fieldType: 'boolean', order: 4 });
  }

  // ==========================================
  // E. STUDENT & EDUCATION MANAGEMENT
  // ==========================================
  const vEdu = vMap['education'];
  if (vEdu) {
    const tCat = mtMap[`${vEdu}:student_categories`];
    const tSub = mtMap[`${vEdu}:student_subcategories`];
    const tLev = mtMap[`${vEdu}:education_levels`];
    const tCourse = mtMap[`${vEdu}:courses`];
    const tDept = mtMap[`${vEdu}:departments`];
    const tQual = mtMap[`${vEdu}:qualifications`];
    const tProg = mtMap[`${vEdu}:academic_programs`];
    const tMode = mtMap[`${vEdu}:learning_modes`];
    const tExam = mtMap[`${vEdu}:examination_types`];
    const tStat = mtMap[`${vEdu}:student_status_types`];

    // Categories
    const schoolStudId = await insertRecord({ verticalId: vEdu, typeId: tCat, name: 'School Student', order: 1 });
    const collegeStudId = await insertRecord({ verticalId: vEdu, typeId: tCat, name: 'College / Undergraduate Student', order: 2 });
    const univStudId = await insertRecord({ verticalId: vEdu, typeId: tCat, name: 'University / Postgraduate Student', order: 3 });
    const compAspirantId = await insertRecord({ verticalId: vEdu, typeId: tCat, name: 'Competitive Exam Aspirant', order: 4 });

    // Subcategories
    await insertRecord({ verticalId: vEdu, typeId: tSub, parentId: schoolStudId, name: 'Primary Section (Class 1 - 5)', order: 1 });
    await insertRecord({ verticalId: vEdu, typeId: tSub, parentId: schoolStudId, name: 'Secondary Section (Class 9 - 10)', order: 2 });
    await insertRecord({ verticalId: vEdu, typeId: tSub, parentId: schoolStudId, name: 'Senior Secondary (Class 11 - 12)', order: 3 });
    await insertRecord({ verticalId: vEdu, typeId: tSub, parentId: collegeStudId, name: 'Undergraduate Engineering (B.Tech)', order: 4 });
    await insertRecord({ verticalId: vEdu, typeId: tSub, parentId: collegeStudId, name: 'Undergraduate Computer Science (BCA)', order: 5 });
    await insertRecord({ verticalId: vEdu, typeId: tSub, parentId: univStudId, name: 'Postgraduate Management (MBA)', order: 6 });

    // Education Levels
    for (const el of ['Pre-Primary / Kindergarten', 'Primary Education', 'Upper Primary / Middle School', 'Secondary (Matriculation)', 'Higher Secondary (Intermediate / 10+2)', 'Diploma / Polytechnic', 'Undergraduate Degree', 'Postgraduate Master Degree', 'Doctoral (Ph.D.)']) {
      await insertRecord({ verticalId: vEdu, typeId: tLev, name: el });
    }

    // Courses
    for (const c of ['B.Tech in Computer Science', 'Bachelor of Computer Applications (BCA)', 'Bachelor of Business Administration (BBA)', 'Master of Business Administration (MBA)', 'B.Sc in Data Science', 'Diploma in Computer Applications (DCA)', 'Full Stack Web Development Certification']) {
      await insertRecord({ verticalId: vEdu, typeId: tCourse, name: c });
    }

    // Departments
    for (const d of ['Department of Computer Science & Engineering', 'Department of Information Technology', 'Department of Business & Management Studies', 'Department of Electrical & Electronics', 'Department of Mechanical Engineering', 'Department of Basic Sciences & Humanities']) {
      await insertRecord({ verticalId: vEdu, typeId: tDept, name: d });
    }

    // Qualifications
    for (const q of ['10th Standard Passed', '12th Standard Passed (Science)', '12th Standard Passed (Commerce/Arts)', 'Bachelor Degree Holder', 'Master Degree Holder', 'Diploma Holder']) {
      await insertRecord({ verticalId: vEdu, typeId: tQual, name: q });
    }

    // Academic Programs
    for (const p of ['Regular 4-Year Degree Program', 'Integrated 5-Year Dual Degree', 'Fast-Track 1-Year Diploma', 'Weekend Executive Program', 'Distance Learning Degree']) {
      await insertRecord({ verticalId: vEdu, typeId: tProg, name: p });
    }

    // Learning Modes
    for (const lm of ['Full-Time On-Campus Classroom', 'Live Virtual / Online Interactive', 'Hybrid / Blended Learning', 'Self-Paced Recorded Video Course']) {
      await insertRecord({ verticalId: vEdu, typeId: tMode, name: lm });
    }

    // Examination Types
    for (const et of ['Semester Final Examination', 'Mid-Term Assessment', 'Continuous Internal Evaluation (CIE)', 'Practical / Laboratory Viva', 'National Entrance Test', 'Mock Test Series']) {
      await insertRecord({ verticalId: vEdu, typeId: tExam, name: et });
    }

    // Student Status Types
    for (const ss of ['Actively Enrolled', 'Provisional Admission', 'Alumni / Graduated', 'Semester Break / Leave of Absence', 'Transferred Out', 'Suspended / Inactive']) {
      await insertRecord({ verticalId: vEdu, typeId: tStat, name: ss });
    }

    // Attributes for Education
    await insertAttribute({ verticalId: vEdu, typeId: tCourse, name: 'duration_years', label: 'Course Duration (Years)', fieldType: 'decimal', placeholder: 'e.g. 4.0', isRequired: true, order: 1 });
    await insertAttribute({ verticalId: vEdu, typeId: tCourse, name: 'total_semesters', label: 'Total Semesters', fieldType: 'number', placeholder: 'e.g. 8', order: 2 });
    await insertAttribute({ verticalId: vEdu, typeId: tCourse, name: 'eligibility_criteria', label: 'Eligibility Requirements', fieldType: 'textarea', placeholder: 'e.g. Minimum 60% in 10+2 with Physics & Math', order: 3 });
  }

  // ==========================================
  // F. PATIENT & HEALTHCARE MANAGEMENT
  // ==========================================
  const vHealth = vMap['healthcare'];
  if (vHealth) {
    const tCat = mtMap[`${vHealth}:patient_categories`];
    const tSub = mtMap[`${vHealth}:patient_subcategories`];
    const tDept = mtMap[`${vHealth}:medical_departments`];
    const tSpec = mtMap[`${vHealth}:medical_specialties`];
    const tCons = mtMap[`${vHealth}:consultation_types`];
    const tTreat = mtMap[`${vHealth}:treatment_categories`];
    const tVisit = mtMap[`${vHealth}:patient_visit_types`];
    const tAdm = mtMap[`${vHealth}:admission_types`];
    const tCare = mtMap[`${vHealth}:care_types`];
    const tServ = mtMap[`${vHealth}:medical_services`];

    // Patient Categories
    const genPatId = await insertRecord({ verticalId: vHealth, typeId: tCat, name: 'General Patients', order: 1 });
    const opdPatId = await insertRecord({ verticalId: vHealth, typeId: tCat, name: 'Outpatient (OPD)', order: 2 });
    const ipdPatId = await insertRecord({ verticalId: vHealth, typeId: tCat, name: 'Inpatient (IPD)', order: 3 });
    const emergPatId = await insertRecord({ verticalId: vHealth, typeId: tCat, name: 'Emergency Patients', order: 4 });
    const pediaPatId = await insertRecord({ verticalId: vHealth, typeId: tCat, name: 'Pediatric Patients', order: 5 });
    const matPatId = await insertRecord({ verticalId: vHealth, typeId: tCat, name: 'Maternity Patients', order: 6 });
    const seniorPatId = await insertRecord({ verticalId: vHealth, typeId: tCat, name: 'Senior Citizens (Geriatric)', order: 7 });

    // Patient Subcategories
    await insertRecord({ verticalId: vHealth, typeId: tSub, parentId: genPatId, name: 'New Registered Patient', order: 1 });
    await insertRecord({ verticalId: vHealth, typeId: tSub, parentId: genPatId, name: 'Returning Regular Patient', order: 2 });
    await insertRecord({ verticalId: vHealth, typeId: tSub, parentId: opdPatId, name: 'General Physician OPD', order: 3 });
    await insertRecord({ verticalId: vHealth, typeId: tSub, parentId: opdPatId, name: 'Super Specialist Consultation', order: 4 });
    await insertRecord({ verticalId: vHealth, typeId: tSub, parentId: ipdPatId, name: 'General Medical Ward', order: 5 });
    await insertRecord({ verticalId: vHealth, typeId: tSub, parentId: ipdPatId, name: 'Private Deluxe Room', order: 6 });
    await insertRecord({ verticalId: vHealth, typeId: tSub, parentId: ipdPatId, name: 'Intensive Care Unit (ICU)', order: 7 });
    await insertRecord({ verticalId: vHealth, typeId: tSub, parentId: emergPatId, name: 'Critical Emergency / Trauma', order: 8 });
    await insertRecord({ verticalId: vHealth, typeId: tSub, parentId: pediaPatId, name: 'Newborn & Infant Care', order: 9 });
    await insertRecord({ verticalId: vHealth, typeId: tSub, parentId: matPatId, name: 'Antenatal Checkup', order: 10 });
    await insertRecord({ verticalId: vHealth, typeId: tSub, parentId: matPatId, name: 'Labour & Postnatal Care', order: 11 });

    // Medical Departments
    for (const d of ['Cardiology & Heart Care', 'Neurology & Neurosurgery', 'Orthopedics & Joint Replacement', 'Pediatrics & Neonatology', 'Gynecology & Obstetrics', 'Oncology & Cancer Care', 'Dermatology & Cosmetology', 'Ophthalmology (Eye Care)', 'General & Laparoscopic Surgery', 'Pulmonology / Chest Medicine']) {
      await insertRecord({ verticalId: vHealth, typeId: tDept, name: d });
    }

    // Medical Specialties
    for (const s of ['Interventional Cardiology', 'Pediatric Neurology', 'Spine & Joint Surgery', 'Critical Care Medicine', 'Cosmetic Dermatology', 'Diabetology & Endocrinology', 'Nephrology & Dialysis', 'Gastroenterology']) {
      await insertRecord({ verticalId: vHealth, typeId: tSpec, name: s });
    }

    // Consultation Types
    for (const ct of ['In-Person Clinic Consultation', 'Online Video Teleconsultation', 'Emergency Triage Consultation', 'Follow-up Review', 'Second Opinion Expert Panel']) {
      await insertRecord({ verticalId: vHealth, typeId: tCons, name: ct });
    }

    // Treatment Categories
    for (const tc of ['Medical Management & Prescriptions', 'Major Surgical Operation', 'Minor Daycare Procedure', 'Physiotherapy & Rehab', 'Chemotherapy & Targeted Therapy', 'Hemodialysis']) {
      await insertRecord({ verticalId: vHealth, typeId: tTreat, name: tc });
    }

    // Patient Visit Types
    for (const vt of ['First Time Visit', 'Routine Follow-up', 'Emergency Visit', 'Post-Operative Checkup', 'Vaccination Visit', 'Preventive Health Checkup']) {
      await insertRecord({ verticalId: vHealth, typeId: tVisit, name: vt });
    }

    // Admission Types
    for (const at of ['Elective / Planned Admission', 'Emergency Hospital Admission', 'Daycare Ambulatory Admission', 'Transfer from Another Hospital', 'ICU Step-Down Admission']) {
      await insertRecord({ verticalId: vHealth, typeId: tAdm, name: at });
    }

    // Care Types
    for (const ct of ['Preventive Health Care', 'Acute Episode Care', 'Critical / Intensive Care (ICU)', 'Chronic Disease Long-term Care', 'Palliative & Supportive Care', 'Post-Op Physical Rehabilitation']) {
      await insertRecord({ verticalId: vHealth, typeId: tCare, name: ct });
    }

    // Medical Services
    for (const ms of ['24/7 Pathology & Blood Tests', 'Digital X-Ray & Ultrasonography (USG)', '128-Slice CT Scan & 3T MRI', 'ECG & 2D Echocardiography', 'Blood Bank & Transfusion Services', '24/7 Emergency Ambulance Service', 'In-house Pharmacy']) {
      await insertRecord({ verticalId: vHealth, typeId: tServ, name: ms });
    }

    // Attributes for Healthcare
    await insertAttribute({ verticalId: vHealth, typeId: tCons, name: 'consultation_fee', label: 'Consultation Fee (₹)', fieldType: 'number', placeholder: 'e.g. 800', isRequired: true, order: 1 });
    await insertAttribute({ verticalId: vHealth, typeId: tCons, name: 'slot_duration_mins', label: 'Slot Duration (minutes)', fieldType: 'number', placeholder: 'e.g. 15', order: 2 });
    await insertAttribute({ verticalId: vHealth, typeId: tSub, name: 'requires_doctor_referral', label: 'Requires Prior Doctor Referral', fieldType: 'boolean', order: 3 });
  }

  // ==========================================
  // G. EVENT MANAGEMENT
  // ==========================================
  const vEvt = vMap['events'];
  if (vEvt) {
    const tCat = mtMap[`${vEvt}:event_categories`];
    const tSub = mtMap[`${vEvt}:event_subcategories`];
    const tType = mtMap[`${vEvt}:event_types`];
    const tForm = mtMap[`${vEvt}:event_formats`];
    const tAud = mtMap[`${vEvt}:audience_types`];
    const tAmen = mtMap[`${vEvt}:event_amenities`];
    const tTkt = mtMap[`${vEvt}:ticket_types`];
    const tStat = mtMap[`${vEvt}:event_status_types`];
    const tPart = mtMap[`${vEvt}:event_participation_types`];
    const tAcc = mtMap[`${vEvt}:event_access_types`];

    // Categories
    const corpId = await insertRecord({ verticalId: vEvt, typeId: tCat, name: 'Corporate & Business', order: 1 });
    const entId = await insertRecord({ verticalId: vEvt, typeId: tCat, name: 'Entertainment & Cultural', order: 2 });
    const socId = await insertRecord({ verticalId: vEvt, typeId: tCat, name: 'Social & Celebrations', order: 3 });
    const eduEvtId = await insertRecord({ verticalId: vEvt, typeId: tCat, name: 'Educational & Academic', order: 4 });
    const sportsId = await insertRecord({ verticalId: vEvt, typeId: tCat, name: 'Sports & Fitness Tournaments', order: 5 });

    // Subcategories
    await insertRecord({ verticalId: vEvt, typeId: tSub, parentId: corpId, name: 'Business Leadership Conference', order: 1 });
    await insertRecord({ verticalId: vEvt, typeId: tSub, parentId: corpId, name: 'Product Launch & Demo Day', order: 2 });
    await insertRecord({ verticalId: vEvt, typeId: tSub, parentId: entId, name: 'Live Music Concert & Band Night', order: 3 });
    await insertRecord({ verticalId: vEvt, typeId: tSub, parentId: entId, name: 'Stand-Up Comedy Show', order: 4 });
    await insertRecord({ verticalId: vEvt, typeId: tSub, parentId: socId, name: 'Wedding & Reception Gala', order: 5 });
    await insertRecord({ verticalId: vEvt, typeId: tSub, parentId: eduEvtId, name: 'Hands-on Tech Workshop', order: 6 });
    await insertRecord({ verticalId: vEvt, typeId: tSub, parentId: sportsId, name: 'Corporate Cricket League Tournament', order: 7 });

    // Event Types
    for (const et of ['Public Open Event', 'Private Closed-Door Event', 'Invitation Only VIP Gathering', 'Ticketed Paid Event', 'Free Registration Event']) {
      await insertRecord({ verticalId: vEvt, typeId: tType, name: et });
    }

    // Event Formats
    for (const ef of ['In-Person Physical Venue', 'Online Virtual Webinar / Livestream', 'Hybrid (In-Person + Live Stream)']) {
      await insertRecord({ verticalId: vEvt, typeId: tForm, name: ef });
    }

    // Audience Types
    for (const at of ['General Public & Families', 'Corporate Executives & CXOs', 'Tech Professionals & Developers', 'College Students & Youth', 'High Net-worth Individuals (HNIs)']) {
      await insertRecord({ verticalId: vEvt, typeId: tAud, name: at });
    }

    // Event Amenities
    for (const ea of ['High-End Audio/Visual & LED Backdrop', 'Professional Stage & Mood Lighting', 'Catering & Multi-Cuisine Buffet', 'High Speed Dedicated Wi-Fi', 'VIP Lounge & Green Rooms', 'Valet Parking & Chauffeur Facility', 'Wheelchair Accessibility', 'Live Translation & Interpretation']) {
      await insertRecord({ verticalId: vEvt, typeId: tAmen, name: ea });
    }

    // Ticket Types
    for (const tt of ['General Admission Pass', 'VIP Front Row Pass', 'Early Bird Discount Ticket', 'Student Concession Pass', 'Group / Corporate Table Booking', 'All-Access Delegate Pass']) {
      await insertRecord({ verticalId: vEvt, typeId: tTkt, name: tt });
    }

    // Event Status Types
    for (const es of ['Draft & Planning', 'Registration Open', 'Tickets Selling Fast', 'Housefull / Sold Out', 'Event Currently Live', 'Successfully Completed', 'Postponed to New Date', 'Cancelled']) {
      await insertRecord({ verticalId: vEvt, typeId: tStat, name: es });
    }

    // Event Participation Types
    for (const ep of ['Attendee / Audience Member', 'Keynote Speaker / Panelist', 'Sponsor / Brand Partner', 'Exhibitor / Stall Owner', 'Live Performer / Artist', 'Event Volunteer / Organizing Crew']) {
      await insertRecord({ verticalId: vEvt, typeId: tPart, name: ep });
    }

    // Event Access Types
    for (const ea of ['Open Free Entry', 'Digital QR Code Ticket Scan', 'Physical RFID Wristband', 'Govt ID Proof Verification at Gate', 'Pre-Approved Guest List Passcode']) {
      await insertRecord({ verticalId: vEvt, typeId: tAcc, name: ea });
    }

    // Attributes for Events
    await insertAttribute({ verticalId: vEvt, typeId: tSub, name: 'max_capacity', label: 'Maximum Seating / Venue Capacity', fieldType: 'number', placeholder: 'e.g. 500', isRequired: true, order: 1 });
    await insertAttribute({ verticalId: vEvt, typeId: tSub, name: 'expected_duration_hours', label: 'Expected Duration (Hours)', fieldType: 'decimal', placeholder: 'e.g. 4.5', order: 2 });
    await insertAttribute({ verticalId: vEvt, typeId: tSub, name: 'age_restriction', label: 'Age Restriction', fieldType: 'dropdown', options: ['All Ages Welcome (Family Friendly)', '12+ Years Only', '16+ Years Only', '18+ Adults Only (Strict 21+ for Bar)'], order: 3 });
  }

  console.log('🎉 Seeding completed successfully for all 7 verticals!');
}

seed()
  .then(() => pool.end())
  .catch((err) => {
    console.error('Seeding error:', err);
    pool.end();
    process.exit(1);
  });
