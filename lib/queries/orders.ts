import { db } from "@/lib/db/db";

export type SalesOrderItem = {
  id?: number;
  order_id?: number;
  product_name: string;
  product_code?: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
};

export type SalesOrder = {
  id: number;
  order_number: string;
  institution_id: number | null;
  institution_name?: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  subtotal_amount: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  payment_status: "Paid" | "Pending" | "Failed" | "Refunded";
  payment_method: string;
  fulfillment_status: "Delivered" | "Processing" | "Shipped" | "Ready for Pickup" | "Cancelled";
  shipping_address: string | null;
  notes: string | null;
  created_by?: number | null;
  created_at: string;
  updated_at: string;
  items?: SalesOrderItem[];
  items_summary?: string;
};

let ordersTableEnsured = false;

export async function ensureSalesOrdersTable() {
  if (ordersTableEnsured) return;

  await db.query(`
    CREATE TABLE IF NOT EXISTS sales_orders (
      id BIGSERIAL PRIMARY KEY,
      order_number VARCHAR(50) UNIQUE NOT NULL,
      institution_id INTEGER REFERENCES institution_profiles(id) ON DELETE SET NULL,
      customer_name VARCHAR(255) NOT NULL,
      customer_email VARCHAR(255) NOT NULL,
      customer_phone VARCHAR(50),
      subtotal_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
      discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
      tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
      total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
      payment_status VARCHAR(50) NOT NULL DEFAULT 'Paid',
      payment_method VARCHAR(100) DEFAULT 'Online (UPI / Card)',
      fulfillment_status VARCHAR(50) NOT NULL DEFAULT 'Delivered',
      shipping_address TEXT,
      notes TEXT,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sales_order_items (
      id BIGSERIAL PRIMARY KEY,
      order_id BIGINT REFERENCES sales_orders(id) ON DELETE CASCADE,
      product_name VARCHAR(255) NOT NULL,
      product_code VARCHAR(100),
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
      total_price NUMERIC(12, 2) NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_sales_orders_inst ON sales_orders(institution_id);
    CREATE INDEX IF NOT EXISTS idx_sales_orders_status ON sales_orders(payment_status, fulfillment_status);
    CREATE INDEX IF NOT EXISTS idx_sales_orders_created ON sales_orders(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_sales_order_items_order ON sales_order_items(order_id);
  `);

  ordersTableEnsured = true;

  // Seed sample orders if completely empty
  const countRes = await db.query("SELECT COUNT(*)::int as count FROM sales_orders");
  if (countRes.rows[0].count === 0) {
    const instRes = await db.query("SELECT id FROM institution_profiles WHERE is_active = TRUE LIMIT 3");
    const inst1 = instRes.rows[0]?.id || 160;
    const inst2 = instRes.rows[1]?.id || 5;

    const sampleOrders = [
      {
        order_number: "ORD-2026-0801",
        institution_id: inst1,
        customer_name: "Rahul Sharma",
        customer_email: "rahul.sharma@gmail.com",
        customer_phone: "+91 98765 43210",
        subtotal_amount: 3500,
        discount_amount: 300,
        tax_amount: 180,
        total_amount: 3380,
        payment_status: "Paid",
        payment_method: "UPI (Google Pay)",
        fulfillment_status: "Delivered",
        shipping_address: "B-12, Lanka, Varanasi, UP - 221005",
        notes: "Class 10th Full Academic Curriculum Bookset + Identity Card Kit",
        items: [
          { product_name: "Complete Secondary Syllabus Books Package", product_code: "BK-SEC-10", quantity: 1, unit_price: 2500, total_price: 2500 },
          { product_name: "School Uniform & Lab Coat Set", product_code: "UNI-10", quantity: 1, unit_price: 1000, total_price: 1000 },
        ],
      },
      {
        order_number: "ORD-2026-0802",
        institution_id: inst1,
        customer_name: "Pooja Verma",
        customer_email: "pooja.verma@yahoo.com",
        customer_phone: "+91 98123 45678",
        subtotal_amount: 4800,
        discount_amount: 500,
        tax_amount: 250,
        total_amount: 4550,
        payment_status: "Paid",
        payment_method: "Credit Card (HDFC)",
        fulfillment_status: "Shipped",
        shipping_address: "Plot 45, Sigra, Varanasi, UP - 221002",
        notes: "Online Entrance Test Series & Mock Exam Access Package",
        items: [
          { product_name: "IIT-JEE / Foundation Test Series Pro", product_code: "EXAM-PRO", quantity: 1, unit_price: 3800, total_price: 3800 },
          { product_name: "Handwritten Master Notes & Formula Compendium", product_code: "NOTE-COMP", quantity: 1, unit_price: 1000, total_price: 1000 },
        ],
      },
      {
        order_number: "ORD-2026-0803",
        institution_id: inst2,
        customer_name: "Amitabh Sen",
        customer_email: "amitabh.sen@outlook.com",
        customer_phone: "+91 97654 32109",
        subtotal_amount: 1500,
        discount_amount: 0,
        tax_amount: 75,
        total_amount: 1575,
        payment_status: "Paid",
        payment_method: "Cash / Counter Receipt",
        fulfillment_status: "Delivered",
        shipping_address: "Campus Store Counter Pickup",
        notes: "Annual Sports Kit & Tracksuit",
        items: [
          { product_name: "Campus House Athletic Jersey & Tracksuit", product_code: "SPT-KIT", quantity: 1, unit_price: 1500, total_price: 1500 },
        ],
      },
      {
        order_number: "ORD-2026-0804",
        institution_id: inst1,
        customer_name: "Sneha Mukherjee",
        customer_email: "sneha.m@gmail.com",
        customer_phone: "+91 99887 76655",
        subtotal_amount: 2200,
        discount_amount: 200,
        tax_amount: 100,
        total_amount: 2100,
        payment_status: "Pending",
        payment_method: "Bank NEFT Transfer",
        fulfillment_status: "Processing",
        shipping_address: "Hostel Block C, Room 204, Campus",
        notes: "Robotics & STEM Practical Experiment Kit",
        items: [
          { product_name: "Microcontroller & Sensor Experimentation Kit", product_code: "STEM-ROBO", quantity: 1, unit_price: 2200, total_price: 2200 },
        ],
      },
      {
        order_number: "ORD-2026-0805",
        institution_id: inst2,
        customer_name: "Vikramaditya Singh",
        customer_email: "vikram.singh@gmail.com",
        customer_phone: "+91 94500 12345",
        subtotal_amount: 6200,
        discount_amount: 600,
        tax_amount: 300,
        total_amount: 5900,
        payment_status: "Paid",
        payment_method: "Net Banking (SBI)",
        fulfillment_status: "Delivered",
        shipping_address: "Orderly Bazar, Varanasi, UP",
        notes: "Comprehensive Board Preparation Package (PCM + English)",
        items: [
          { product_name: "CBSE Class 12 Master Guide & Sample Papers", product_code: "BK-CBSE-12", quantity: 1, unit_price: 4200, total_price: 4200 },
          { product_name: "Digital Study Tablet Case & Stylus", product_code: "ACC-TAB", quantity: 1, unit_price: 2000, total_price: 2000 },
        ],
      },
    ];

    for (const ord of sampleOrders) {
      const insRes = await db.query(
        `INSERT INTO sales_orders (
          order_number, institution_id, customer_name, customer_email, customer_phone,
          subtotal_amount, discount_amount, tax_amount, total_amount,
          payment_status, payment_method, fulfillment_status, shipping_address, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING id`,
        [
          ord.order_number,
          ord.institution_id,
          ord.customer_name,
          ord.customer_email,
          ord.customer_phone,
          ord.subtotal_amount,
          ord.discount_amount,
          ord.tax_amount,
          ord.total_amount,
          ord.payment_status,
          ord.payment_method,
          ord.fulfillment_status,
          ord.shipping_address,
          ord.notes,
        ]
      );
      const orderId = insRes.rows[0].id;
      for (const item of ord.items) {
        await db.query(
          `INSERT INTO sales_order_items (order_id, product_name, product_code, quantity, unit_price, total_price)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [orderId, item.product_name, item.product_code, item.quantity, item.unit_price, item.total_price]
        );
      }
    }
  }
}

export async function getSalesOrdersList(params: {
  search?: string;
  paymentStatus?: string;
  fulfillmentStatus?: string;
  institutionId?: number | null;
  page?: number;
  limit?: number;
}) {
  await ensureSalesOrdersTable();

  const page = Math.max(1, params.page || 1);
  const limit = Math.max(1, Math.min(100, params.limit || 20));
  const offset = (page - 1) * limit;

  const conditions: string[] = ["1=1"];
  const values: any[] = [];

  if (params.institutionId) {
    values.push(params.institutionId);
    conditions.push(`o.institution_id = $${values.length}`);
  }

  if (params.paymentStatus && params.paymentStatus !== "all") {
    values.push(params.paymentStatus);
    conditions.push(`o.payment_status ILIKE $${values.length}`);
  }

  if (params.fulfillmentStatus && params.fulfillmentStatus !== "all") {
    values.push(params.fulfillmentStatus);
    conditions.push(`o.fulfillment_status ILIKE $${values.length}`);
  }

  if (params.search && params.search.trim()) {
    values.push(`%${params.search.trim()}%`);
    const idx = values.length;
    conditions.push(`(o.order_number ILIKE $${idx} OR o.customer_name ILIKE $${idx} OR o.customer_email ILIKE $${idx} OR o.customer_phone ILIKE $${idx} OR i.name ILIKE $${idx})`);
  }

  const whereClause = conditions.join(" AND ");

  const countQuery = `
    SELECT 
      COUNT(*)::int AS total,
      COALESCE(SUM(o.total_amount), 0)::numeric AS total_revenue,
      COUNT(*) FILTER (WHERE o.payment_status = 'Paid')::int AS paid_count,
      COUNT(*) FILTER (WHERE o.payment_status = 'Pending')::int AS pending_count
    FROM sales_orders o
    LEFT JOIN institution_profiles i ON i.id = o.institution_id
    WHERE ${whereClause}
  `;
  const countRes = await db.query(countQuery, values);
  const total = Number(countRes.rows[0]?.total || 0);
  const totalRevenue = Number(countRes.rows[0]?.total_revenue || 0);
  const paidCount = Number(countRes.rows[0]?.paid_count || 0);
  const pendingCount = Number(countRes.rows[0]?.pending_count || 0);

  const queryValues = [...values, limit, offset];
  const listQuery = `
    SELECT 
      o.*,
      i.name AS institution_name,
      COALESCE(
        string_agg(it.product_name || ' (x' || it.quantity || ')', ', ' ORDER BY it.id),
        ''
      ) AS items_summary
    FROM sales_orders o
    LEFT JOIN institution_profiles i ON i.id = o.institution_id
    LEFT JOIN sales_order_items it ON it.order_id = o.id
    WHERE ${whereClause}
    GROUP BY o.id, i.name
    ORDER BY o.created_at DESC
    LIMIT $${values.length + 1} OFFSET $${values.length + 2}
  `;

  const listRes = await db.query(listQuery, queryValues);
  return {
    data: listRes.rows as SalesOrder[],
    total,
    page,
    pageCount: Math.ceil(total / limit),
    stats: {
      totalOrders: total,
      totalRevenue,
      paidCount,
      pendingCount,
      avgOrderValue: total > 0 ? Math.round(totalRevenue / total) : 0,
    },
  };
}

export async function getSalesOrderById(id: number) {
  await ensureSalesOrdersTable();

  const query = `
    SELECT 
      o.*,
      i.name AS institution_name
    FROM sales_orders o
    LEFT JOIN institution_profiles i ON i.id = o.institution_id
    WHERE o.id = $1
  `;

  const res = await db.query(query, [id]);
  const order = res.rows[0] as SalesOrder | undefined;
  if (!order) return null;

  const itemsRes = await db.query(
    "SELECT * FROM sales_order_items WHERE order_id = $1 ORDER BY id ASC",
    [id]
  );
  order.items = itemsRes.rows as SalesOrderItem[];

  return order;
}

export async function createSalesOrder(data: {
  institution_id?: number | null;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  subtotal_amount: number;
  discount_amount?: number;
  tax_amount?: number;
  total_amount: number;
  payment_status?: string;
  payment_method?: string;
  fulfillment_status?: string;
  shipping_address?: string;
  notes?: string;
  created_by?: number | null;
  items: Array<{
    product_name: string;
    product_code?: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
}) {
  await ensureSalesOrdersTable();

  const randNum = Math.floor(1000 + Math.random() * 9000);
  const orderNumber = `ORD-${new Date().getFullYear()}-${randNum}`;

  const query = `
    INSERT INTO sales_orders (
      order_number, institution_id, customer_name, customer_email, customer_phone,
      subtotal_amount, discount_amount, tax_amount, total_amount,
      payment_status, payment_method, fulfillment_status, shipping_address, notes,
      created_by, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9,
      $10, $11, $12, $13, $14,
      $15, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
    RETURNING *;
  `;

  const values = [
    orderNumber,
    data.institution_id || null,
    data.customer_name.trim(),
    data.customer_email.trim(),
    data.customer_phone?.trim() || null,
    data.subtotal_amount || 0,
    data.discount_amount || 0,
    data.tax_amount || 0,
    data.total_amount || 0,
    data.payment_status || "Paid",
    data.payment_method || "Online (UPI / Card)",
    data.fulfillment_status || "Delivered",
    data.shipping_address?.trim() || null,
    data.notes?.trim() || null,
    data.created_by || null,
  ];

  const res = await db.query(query, values);
  const newOrder = res.rows[0] as SalesOrder;

  if (data.items && data.items.length > 0) {
    for (const item of data.items) {
      await db.query(
        `INSERT INTO sales_order_items (order_id, product_name, product_code, quantity, unit_price, total_price)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [newOrder.id, item.product_name, item.product_code || null, item.quantity, item.unit_price, item.total_price]
      );
    }
  }

  return getSalesOrderById(newOrder.id);
}

export async function updateSalesOrderStatus(id: number, data: {
  payment_status?: string;
  fulfillment_status?: string;
  notes?: string;
}) {
  await ensureSalesOrdersTable();

  const fields: string[] = [];
  const values: any[] = [];

  if (data.payment_status) {
    values.push(data.payment_status);
    fields.push(`payment_status = $${values.length}`);
  }
  if (data.fulfillment_status) {
    values.push(data.fulfillment_status);
    fields.push(`fulfillment_status = $${values.length}`);
  }
  if (data.notes !== undefined) {
    values.push(data.notes);
    fields.push(`notes = $${values.length}`);
  }

  if (fields.length === 0) return getSalesOrderById(id);

  fields.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(id);

  const query = `
    UPDATE sales_orders
    SET ${fields.join(", ")}
    WHERE id = $${values.length}
    RETURNING id;
  `;

  await db.query(query, values);
  return getSalesOrderById(id);
}

export async function deleteSalesOrder(id: number) {
  await ensureSalesOrdersTable();
  await db.query("DELETE FROM sales_orders WHERE id = $1", [id]);
  return true;
}
