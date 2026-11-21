import { db } from "@/lib/db/db";

async function main() {
  console.log("Applying column additions to sales_packages...");
  await db.query(`
    ALTER TABLE sales_packages ADD COLUMN IF NOT EXISTS billing_cycle VARCHAR(50) DEFAULT 'Monthly';
    ALTER TABLE sales_packages ADD COLUMN IF NOT EXISTS database_allowance VARCHAR(100);
    ALTER TABLE sales_packages ADD COLUMN IF NOT EXISTS file_storage_allowance VARCHAR(100);
    ALTER TABLE sales_packages ADD COLUMN IF NOT EXISTS monthly_bandwidth VARCHAR(100);
    ALTER TABLE sales_packages ADD COLUMN IF NOT EXISTS compute_allowance VARCHAR(100);
    ALTER TABLE sales_packages ADD COLUMN IF NOT EXISTS seo_service VARCHAR(255);
  `);

  const packages = [
    {
      name: "Launch",
      tier: "launch",
      price_monthly: 399,
      billing_cycle: "Monthly",
      database_allowance: "250 MB",
      file_storage_allowance: "2 GB",
      monthly_bandwidth: "10 GB",
      compute_allowance: "100 units",
      seo_service: "Basic SEO support",
      package_category: "hosting_growth",
      description: "Ideal for early-stage startups and individual projects launching with essential database, storage, and SEO.",
      is_active: true,
      features_list: JSON.stringify([
        "250 MB Database Allowance",
        "2 GB File Storage",
        "10 GB Monthly Bandwidth",
        "100 Compute Units",
        "Basic SEO support",
      ]),
    },
    {
      name: "Growth",
      tier: "growth",
      price_monthly: 999,
      billing_cycle: "Monthly",
      database_allowance: "1 GB",
      file_storage_allowance: "10 GB",
      monthly_bandwidth: "50 GB",
      compute_allowance: "500 units",
      seo_service: "Local SEO support",
      package_category: "hosting_growth",
      description: "Designed for fast-growing businesses needing expanded storage, regional visibility, and active compute headroom.",
      is_active: true,
      features_list: JSON.stringify([
        "1 GB Database Allowance",
        "10 GB File Storage",
        "50 GB Monthly Bandwidth",
        "500 Compute Units",
        "Local SEO support",
      ]),
    },
    {
      name: "Professional",
      tier: "professional",
      price_monthly: 2499,
      billing_cycle: "Monthly",
      database_allowance: "5 GB",
      file_storage_allowance: "50 GB",
      monthly_bandwidth: "250 GB",
      compute_allowance: "2,000 units",
      seo_service: "Advanced SEO support",
      package_category: "hosting_growth",
      description: "Complete professional platform tier for scale, high traffic, dedicated compute, and comprehensive advanced SEO support.",
      is_active: true,
      features_list: JSON.stringify([
        "5 GB Database Allowance",
        "50 GB File Storage",
        "250 GB Monthly Bandwidth",
        "2,000 Compute Units",
        "Advanced SEO support",
      ]),
    },
    {
      name: "Enterprise",
      tier: "enterprise",
      price_monthly: 4999,
      billing_cycle: "Monthly",
      database_allowance: "Custom",
      file_storage_allowance: "Custom",
      monthly_bandwidth: "Custom",
      compute_allowance: "Custom",
      seo_service: "Enterprise SEO and marketing services",
      package_category: "hosting_growth",
      description: "Custom enterprise tier starting at ₹4,999 with bespoke database, compute, unmetered bandwidth, and managed marketing.",
      is_active: true,
      features_list: JSON.stringify([
        "Custom Database Allowance",
        "Custom File Storage",
        "Custom Monthly Bandwidth",
        "Custom Compute Units",
        "Enterprise SEO & marketing services",
      ]),
    },
  ];

  for (const pkg of packages) {
    // Check if package exists with this tier or name
    const check = await db.query(
      "SELECT id FROM sales_packages WHERE LOWER(name) = LOWER($1) AND package_category = $2",
      [pkg.name, pkg.package_category]
    );

    if (check.rows.length > 0) {
      const id = check.rows[0].id;
      await db.query(
        `UPDATE sales_packages SET
          tier = $1,
          price = $2,
          price_monthly = $2,
          price_unit = 'INR',
          billing_cycle = $3,
          database_allowance = $4,
          file_storage_allowance = $5,
          monthly_bandwidth = $6,
          compute_allowance = $7,
          seo_service = $8,
          description = $9,
          features_list = $10::jsonb,
          is_active = $11,
          updated_at = NOW()
        WHERE id = $12`,
        [
          pkg.tier,
          pkg.price_monthly,
          pkg.billing_cycle,
          pkg.database_allowance,
          pkg.file_storage_allowance,
          pkg.monthly_bandwidth,
          pkg.compute_allowance,
          pkg.seo_service,
          pkg.description,
          pkg.features_list,
          pkg.is_active,
          id,
        ]
      );
      console.log(`Updated package: ${pkg.name} (id: ${id})`);
    } else {
      const inserted = await db.query(
        `INSERT INTO sales_packages (
          name,
          package_for,
          tier,
          price,
          price_monthly,
          price_unit,
          billing_cycle,
          database_allowance,
          file_storage_allowance,
          monthly_bandwidth,
          compute_allowance,
          seo_service,
          package_category,
          description,
          features_list,
          is_active,
          created_at,
          updated_at
        ) VALUES (
          $1, 'platform', $2, $3, $3, 'INR', $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13, NOW(), NOW()
        ) RETURNING id`,
        [
          pkg.name,
          pkg.tier,
          pkg.price_monthly,
          pkg.billing_cycle,
          pkg.database_allowance,
          pkg.file_storage_allowance,
          pkg.monthly_bandwidth,
          pkg.compute_allowance,
          pkg.seo_service,
          pkg.package_category,
          pkg.description,
          pkg.features_list,
          pkg.is_active,
        ]
      );
      console.log(`Inserted package: ${pkg.name} (id: ${inserted.rows[0].id})`);
    }
  }

  console.log("Migration complete!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
