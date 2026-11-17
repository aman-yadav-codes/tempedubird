import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function main() {
  const { db } = await import("../../lib/db/db.js");

  console.log("Running sales patients and students features migration...");

  await db.query(`
    CREATE TABLE IF NOT EXISTS sales_patients (
      id SERIAL PRIMARY KEY,
      institution_id INT,
      business_profile_id INT,
      created_by INT,
      name VARCHAR(255) NOT NULL,
      patient_id_number VARCHAR(100),
      age INT,
      gender VARCHAR(20) DEFAULT 'Male',
      phone VARCHAR(50),
      email VARCHAR(255),
      blood_group VARCHAR(10),
      address TEXT,
      emergency_contact_name VARCHAR(150),
      emergency_contact_phone VARCHAR(50),
      department VARCHAR(100) DEFAULT 'General Medicine',
      doctor_assigned VARCHAR(150),
      visit_type VARCHAR(50) DEFAULT 'OPD',
      consultation_fee NUMERIC(10, 2) DEFAULT 500,
      medical_history TEXT,
      allergies TEXT,
      status VARCHAR(50) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS sales_students (
      id SERIAL PRIMARY KEY,
      institution_id INT,
      business_profile_id INT,
      created_by INT,
      name VARCHAR(255) NOT NULL,
      roll_number VARCHAR(100),
      email VARCHAR(255),
      phone VARCHAR(50),
      guardian_name VARCHAR(150),
      guardian_phone VARCHAR(50),
      course_program VARCHAR(255),
      batch_section VARCHAR(100),
      admission_date DATE DEFAULT CURRENT_DATE,
      fee_amount NUMERIC(10, 2) DEFAULT 0,
      fee_status VARCHAR(50) DEFAULT 'pending',
      academic_status VARCHAR(50) DEFAULT 'enrolled',
      address TEXT,
      notes TEXT,
      status VARCHAR(50) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // Insert modules into system_modules if they don't exist
  const modulesToInsert = [
    {
      module_key: "sales_patients",
      module_name: "Patients",
      parent_module_id: 7,
      route: "/admin/sales/patients",
      icon: "HeartPulse",
      display_order: 10,
      description: "Manage clinic/hospital patients, medical appointments, and patient admissions.",
    },
    {
      module_key: "sales_students",
      module_name: "Students",
      parent_module_id: 7,
      route: "/admin/sales/students",
      icon: "GraduationCap",
      display_order: 11,
      description: "Manage student admissions, coaching enrollments, batch assignments, and course fees.",
    },
  ];

  for (const m of modulesToInsert) {
    const existing = await db.query(
      "SELECT id FROM system_modules WHERE module_key = $1",
      [m.module_key]
    );
    if (existing.rows.length === 0) {
      await db.query(
        `INSERT INTO system_modules (module_key, module_name, parent_module_id, route, icon, display_order, description, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', NOW(), NOW())`,
        [m.module_key, m.module_name, m.parent_module_id, m.route, m.icon, m.display_order, m.description]
      );
      console.log(`Inserted system_module: ${m.module_key}`);
    } else {
      console.log(`System module already exists: ${m.module_key}`);
    }
  }

  console.log("Sales features migration finished successfully!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
