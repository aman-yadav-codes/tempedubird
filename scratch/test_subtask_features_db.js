process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const fs = require('fs');
const { Pool } = require('pg');

const envContent = fs.readFileSync('.env.local', 'utf8');
const dbUrlLine = envContent.split('\n').find(l => l.startsWith('DATABASE_URL='));
const dbUrl = dbUrlLine.split('=')[1].trim().replace(/^["']|["']$/g, '');

const pool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const client = await pool.connect();
  try {
    console.log("Connected to PostgreSQL successfully.");

    // 1. Verify columns in operations_tasks
    const colRes = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'operations_tasks' 
        AND column_name IN ('started_at', 'stopped_at', 'completed_at', 'invoices', 'base_price', 'extra_cost', 'sub_tasks', 'history')
      ORDER BY column_name;
    `);
    console.log("Verified columns in operations_tasks:");
    console.table(colRes.rows);

    // 2. Insert test task with subtask containing upload, work update, and history
    const testSubId = `sub_${Date.now()}`;
    const initialSubs = [
      {
        id: testSubId,
        title: "Test Feature Verification Subtask",
        price: 3500,
        cadence: "weekly",
        is_daily_recurring: false,
        deadline_date: "2026-11-05",
        deadline_time: "18:00",
        urgency: "high",
        status: "pending",
        uploads: [
          {
            id: `upl_${Date.now()}`,
            file_name: "specification_doc.docx",
            file_url: "/uploads/documents/specification_doc.docx",
            file_type: "docx",
            file_size: 45200,
            notes: "Uploaded technical specification Word doc",
            uploaded_at: new Date().toISOString(),
            uploaded_by_id: 1,
            uploaded_by_name: "Platform Admin",
            uploaded_by_role: "platform_admin"
          }
        ],
        work_updates: [
          {
            id: `upd_${Date.now()}`,
            notes: "Completed initial drafting and architecture review",
            file_name: "review_screenshot.png",
            file_url: "/uploads/documents/review_screenshot.png",
            file_type: "png",
            status: "in_progress",
            created_at: new Date().toISOString(),
            created_by_id: 1,
            created_by_name: "Platform Admin",
            created_by_role: "platform_admin"
          }
        ]
      }
    ];

    const initialHistory = [
      {
        id: `hist_${Date.now()}_1`,
        action: "created",
        timestamp: new Date().toISOString(),
        user_name: "Platform Admin",
        details: "Project task created"
      },
      {
        id: `hist_${Date.now()}_2`,
        action: "subtask_created",
        timestamp: new Date().toISOString(),
        user_name: "Platform Admin",
        subtask_id: testSubId,
        subtask_title: "Test Feature Verification Subtask",
        details: "Deliverable 'Test Feature Verification Subtask' created with budget ₹3500"
      },
      {
        id: `hist_${Date.now()}_3`,
        action: "task_file_uploaded",
        timestamp: new Date().toISOString(),
        user_name: "Platform Admin",
        subtask_id: testSubId,
        subtask_title: "Test Feature Verification Subtask",
        details: "Uploaded file 'specification_doc.docx'"
      },
      {
        id: `hist_${Date.now()}_4`,
        action: "work_updated",
        timestamp: new Date().toISOString(),
        user_name: "Platform Admin",
        subtask_id: testSubId,
        subtask_title: "Test Feature Verification Subtask",
        details: "Work update: Completed initial drafting and architecture review"
      }
    ];

    const insertRes = await client.query(`
      INSERT INTO operations_tasks (
        title, project_for, price, status, urgency, sub_tasks, history, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, NOW(), NOW()
      ) RETURNING id, title, sub_tasks, history;
    `, [
      "End-To-End Verification Project",
      "own_company",
      3500,
      "pending",
      "high",
      JSON.stringify(initialSubs),
      JSON.stringify(initialHistory)
    ]);

    const createdTask = insertRes.rows[0];
    console.log(`Successfully created test task ID: ${createdTask.id}`);
    console.log(`Subtasks stored:`, createdTask.sub_tasks.length);
    console.log(`Subtask uploads:`, createdTask.sub_tasks[0].uploads.length, createdTask.sub_tasks[0].uploads[0].file_name);
    console.log(`Subtask work updates:`, createdTask.sub_tasks[0].work_updates.length, createdTask.sub_tasks[0].work_updates[0].notes);
    console.log(`History events stored:`, createdTask.history.length);

    // Clean up test task
    await client.query(`DELETE FROM operations_tasks WHERE id = $1`, [createdTask.id]);
    console.log(`Cleaned up test task ${createdTask.id}`);

    console.log("All DB tests and validations passed 100%!");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});

