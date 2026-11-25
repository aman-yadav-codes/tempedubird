const { Pool } = require("pg");
require("dotenv").config({ path: ".env.local" });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  const client = await pool.connect();
  try {
    console.log("Checking and ensuring service_bookings table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS service_bookings (
        id SERIAL PRIMARY KEY,
        booking_number VARCHAR(60) UNIQUE,
        customer_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        customer_name VARCHAR(150),
        customer_email VARCHAR(150),
        customer_phone VARCHAR(50),
        business_id INTEGER REFERENCES business_profiles(id) ON DELETE SET NULL,
        professional_id INTEGER REFERENCES professional_profiles(id) ON DELETE SET NULL,
        service_id INTEGER,
        service_name VARCHAR(255) NOT NULL,
        booking_date DATE,
        booking_time VARCHAR(50),
        notes TEXT,
        status VARCHAR(40) DEFAULT 'pending',
        total_price NUMERIC(12, 2) DEFAULT 0,
        payment_status VARCHAR(40) DEFAULT 'pending',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Ensure customer_inquiries columns
    await client.query(`
      ALTER TABLE customer_inquiries ADD COLUMN IF NOT EXISTS customer_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
      ALTER TABLE customer_inquiries ADD COLUMN IF NOT EXISTS business_id INTEGER REFERENCES business_profiles(id) ON DELETE SET NULL;
      ALTER TABLE customer_inquiries ADD COLUMN IF NOT EXISTS professional_id INTEGER REFERENCES professional_profiles(id) ON DELETE SET NULL;
      ALTER TABLE customer_inquiries ADD COLUMN IF NOT EXISTS product_id INTEGER;
      ALTER TABLE customer_inquiries ADD COLUMN IF NOT EXISTS service_id INTEGER;
      ALTER TABLE customer_inquiries ADD COLUMN IF NOT EXISTS preferred_date DATE;
      ALTER TABLE customer_inquiries ADD COLUMN IF NOT EXISTS preferred_time VARCHAR(50);
      ALTER TABLE customer_inquiries ADD COLUMN IF NOT EXISTS reply TEXT;
    `);

    // Seed sample bookings if table is empty
    const countRes = await client.query("SELECT COUNT(*) FROM service_bookings;");
    const count = parseInt(countRes.rows[0].count, 10);
    if (count === 0) {
      console.log("Seeding initial service bookings...");
      const businesses = await client.query("SELECT id, name, user_id FROM business_profiles LIMIT 5;");
      const users = await client.query("SELECT id, full_name, email, phone FROM users LIMIT 5;");
      
      const sampleCustomer = users.rows[0] || { id: null, full_name: "achal singh", email: "achaal@gmail.com", phone: "9876765654" };
      const biz1 = businesses.rows[0];
      const biz2 = businesses.rows[1] || biz1;

      if (biz1) {
        await client.query(`
          INSERT INTO service_bookings (
            booking_number, customer_user_id, customer_name, customer_email, customer_phone,
            business_id, service_name, booking_date, booking_time, notes, status, total_price, payment_status
          ) VALUES 
          (
            'BK-2026-001', $1, $2, $3, $4,
            $5, 'Mixed Martial Arts & Self Defense Session', CURRENT_DATE + INTERVAL '1 day', '10:00 AM - 11:30 AM',
            'First trial class for beginner level training.', 'confirmed', 1499.00, 'paid'
          ),
          (
            'BK-2026-002', $1, $2, $3, $4,
            $6, 'Deluxe Keratin Hair Spa & Treatment', CURRENT_DATE + INTERVAL '3 days', '02:00 PM - 03:30 PM',
            'Requested senior stylist for hair consultation.', 'pending', 3999.00, 'cash_on_service'
          );
        `, [
          sampleCustomer.id,
          sampleCustomer.full_name,
          sampleCustomer.email,
          sampleCustomer.phone,
          biz1.id,
          biz2 ? biz2.id : biz1.id
        ]);
      }
    }

    // Seed sample enquiries if empty
    const inqCount = await client.query("SELECT COUNT(*) FROM customer_inquiries;");
    if (parseInt(inqCount.rows[0].count, 10) === 0) {
      console.log("Seeding initial customer enquiries...");
      const businesses = await client.query("SELECT id, name FROM business_profiles LIMIT 3;");
      const users = await client.query("SELECT id, full_name, email, phone FROM users LIMIT 3;");
      const sampleCustomer = users.rows[0] || { id: null, full_name: "achal singh", email: "achaal@gmail.com", phone: "9876765654" };
      if (businesses.rows.length > 0) {
        await client.query(`
          INSERT INTO customer_inquiries (
            customer_user_id, business_id, customer_name, customer_email, customer_phone,
            message, status, preferred_date, preferred_time
          ) VALUES 
          (
            $1, $2, $3, $4, $5,
            'Hi, do you offer weekend evening batch timings for personal training sessions?', 'new',
            CURRENT_DATE + INTERVAL '2 days', 'Evening (05:00 PM)'
          ),
          (
            $1, $6, $3, $4, $5,
            'Looking for property site visit consultation and pricing catalog.', 'contacted',
            CURRENT_DATE + INTERVAL '4 days', 'Morning (11:00 AM)'
          );
        `, [
          sampleCustomer.id,
          businesses.rows[0].id,
          sampleCustomer.full_name,
          sampleCustomer.email,
          sampleCustomer.phone,
          businesses.rows[1] ? businesses.rows[1].id : businesses.rows[0].id
        ]);
      }
    }

    console.log("Database schema check completed successfully!");
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
