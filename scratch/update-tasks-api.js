const fs = require('fs');

const filePath = 'app/api/admin/operations/tasks/route.ts';
let content = fs.readFileSync(filePath, 'utf8');

const isCRLF = content.includes('\r\n');
content = content.replace(/\r\n/g, '\n');

// 1. In POST: update insertion to include project fields
const postTarget = `    const res = await db.query(
      \`INSERT INTO operations_tasks (
        title, client_id, client_name, institution_id, price, details,
        assigned_employee_id, assigned_employee_name, assigned_employee_role, assigned_employee_email,
        estimated_hours, logged_hours, deadline, status, urgency, sub_tasks,
        is_daily_recurring, last_recurring_date, points, penalty_points, assigned_employees, created_by, history, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23::jsonb, NOW(), NOW())
      RETURNING *\`,
      [
        title.trim(),
        client_id ? parseInt(String(client_id).replace("vendor_", "")) : null,
        client_name?.trim() || "Independent Client",
        institutionId,
        calcPrice,
        details?.trim() || null,
        assignedEmpId,
        assignedEmpName,
        assignedEmpRole,
        assignedEmpEmail,
        calcHours,
        parseFloat(String(body.logged_hours)) || 0,
        body.deadline ? new Date(body.deadline).toISOString() : null,
        calcStatus,
        calcUrgency,
        JSON.stringify(finalSubTasks),
        Boolean(is_daily_recurring),
        Boolean(is_daily_recurring) ? todayDateStr : null,
        calcPoints,
        calcPenaltyPoints,
        JSON.stringify(assignedEmployees),
        user?.id || null,
        JSON.stringify([
          {
            id: \`hist_\${Date.now()}_\${Math.random().toString(36).substring(2, 6)}\`,
            action: "created",
            timestamp: new Date().toISOString(),
            user_id: user?.id || null,
            user_name: (user as any)?.full_name || (user as any)?.name || (user as any)?.email || "Creator",
            user_role: creatorRole || "Admin",
            details: \`Task created with status "\${calcStatus}"\`,
            new_status: calcStatus,
          }
        ]),
      ]
    );`;

const postReplacement = `    const project_for = body.project_for === "client" ? "client" : "own_company";
    const company_name = project_for === "own_company" ? (body.company_name?.trim() || "EduBird") : null;
    const finalClientName = project_for === "client" ? (client_name?.trim() || "Client") : "EduBird";
    const finalClientId = project_for === "client" ? (client_id ? parseInt(String(client_id).replace("vendor_", "")) : null) : null;
    const projectLeaderId = body.project_leader_id ? parseInt(String(body.project_leader_id)) : assignedEmpId;
    const projectLeaderName = body.project_leader_name?.trim() || assignedEmpName;
    const currency = body.currency?.trim() || "INR";
    const costVal = body.cost !== undefined ? (parseFloat(String(body.cost)) || 0) : calcPrice;
    const finalPrice = costVal || calcPrice;
    const startDate = body.start_date ? new Date(body.start_date).toISOString() : null;
    const deadlineDate = body.due_date ? new Date(body.due_date).toISOString() : (body.deadline ? new Date(body.deadline).toISOString() : null);
    const liveUrl = body.live_url?.trim() || null;
    const demoUrl = body.demo_url?.trim() || null;
    const agreementDocUrl = body.agreement_document_url?.trim() || null;
    const agreementDocName = body.agreement_document_name?.trim() || null;

    const res = await db.query(
      \`INSERT INTO operations_tasks (
        title, client_id, client_name, institution_id, price, details,
        assigned_employee_id, assigned_employee_name, assigned_employee_role, assigned_employee_email,
        estimated_hours, logged_hours, deadline, status, urgency, sub_tasks,
        is_daily_recurring, last_recurring_date, points, penalty_points, assigned_employees, created_by, history,
        project_for, company_name, start_date, currency, cost, live_url, demo_url,
        project_leader_id, project_leader_name, agreement_document_url, agreement_document_name,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23::jsonb,
        $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34,
        NOW(), NOW()
      )
      RETURNING *\`,
      [
        title.trim(),
        finalClientId,
        finalClientName,
        institutionId,
        finalPrice,
        details?.trim() || null,
        assignedEmpId,
        assignedEmpName,
        assignedEmpRole,
        assignedEmpEmail,
        calcHours,
        parseFloat(String(body.logged_hours)) || 0,
        deadlineDate,
        calcStatus,
        calcUrgency,
        JSON.stringify(finalSubTasks),
        Boolean(is_daily_recurring),
        Boolean(is_daily_recurring) ? todayDateStr : null,
        calcPoints,
        calcPenaltyPoints,
        JSON.stringify(assignedEmployees),
        user?.id || null,
        JSON.stringify([
          {
            id: \`hist_\${Date.now()}_\${Math.random().toString(36).substring(2, 6)}\`,
            action: "created",
            timestamp: new Date().toISOString(),
            user_id: user?.id || null,
            user_name: (user as any)?.full_name || (user as any)?.name || (user as any)?.email || "Creator",
            user_role: creatorRole || "Admin",
            details: \`Project created with status "\${calcStatus}"\`,
            new_status: calcStatus,
          }
        ]),
        project_for,
        company_name,
        startDate,
        currency,
        costVal,
        liveUrl,
        demoUrl,
        projectLeaderId,
        projectLeaderName,
        agreementDocUrl,
        agreementDocName,
      ]
    );`;

if (content.includes(postTarget)) {
  content = content.replace(postTarget, postReplacement);
  console.log('Successfully updated POST in route.ts');
} else {
  console.log('POST target not found');
}

// 2. In PUT: add updates for project fields
const putTarget = `      if (body.institution_id !== undefined && isOwnerOrAdmin) {
        const instVal = body.institution_id && body.institution_id !== "none" && body.institution_id !== "all" ? Number(body.institution_id) : null;
        params.push(instVal);
        updates.push(\`institution_id = $\${params.length}\`);
      }`;

const putReplacement = `      if (body.institution_id !== undefined && isOwnerOrAdmin) {
        const instVal = body.institution_id && body.institution_id !== "none" && body.institution_id !== "all" ? Number(body.institution_id) : null;
        params.push(instVal);
        updates.push(\`institution_id = $\${params.length}\`);
      }

      if (body.project_for !== undefined) {
        params.push(body.project_for);
        updates.push(\`project_for = $\${params.length}\`);
      }
      if (body.company_name !== undefined) {
        params.push(body.company_name);
        updates.push(\`company_name = $\${params.length}\`);
      }
      if (body.start_date !== undefined) {
        params.push(body.start_date ? new Date(body.start_date).toISOString() : null);
        updates.push(\`start_date = $\${params.length}\`);
      }
      if (body.due_date !== undefined || body.deadline !== undefined) {
        const d = body.due_date || body.deadline;
        params.push(d ? new Date(d).toISOString() : null);
        updates.push(\`deadline = $\${params.length}\`);
      }
      if (body.currency !== undefined) {
        params.push(body.currency);
        updates.push(\`currency = $\${params.length}\`);
      }
      if (body.cost !== undefined) {
        const val = parseFloat(String(body.cost)) || 0;
        params.push(val);
        updates.push(\`cost = $\${params.length}\`);
        params.push(val);
        updates.push(\`price = $\${params.length}\`);
      }
      if (body.live_url !== undefined) {
        params.push(body.live_url ? String(body.live_url).trim() : null);
        updates.push(\`live_url = $\${params.length}\`);
      }
      if (body.demo_url !== undefined) {
        params.push(body.demo_url ? String(body.demo_url).trim() : null);
        updates.push(\`demo_url = $\${params.length}\`);
      }
      if (body.project_leader_id !== undefined) {
        params.push(body.project_leader_id ? Number(body.project_leader_id) : null);
        updates.push(\`project_leader_id = $\${params.length}\`);
      }
      if (body.project_leader_name !== undefined) {
        params.push(body.project_leader_name ? String(body.project_leader_name).trim() : null);
        updates.push(\`project_leader_name = $\${params.length}\`);
      }
      if (body.agreement_document_url !== undefined) {
        params.push(body.agreement_document_url ? String(body.agreement_document_url).trim() : null);
        updates.push(\`agreement_document_url = $\${params.length}\`);
      }
      if (body.agreement_document_name !== undefined) {
        params.push(body.agreement_document_name ? String(body.agreement_document_name).trim() : null);
        updates.push(\`agreement_document_name = $\${params.length}\`);
      }`;

if (content.includes(putTarget)) {
  content = content.replace(putTarget, putReplacement);
  console.log('Successfully updated PUT in route.ts');
} else {
  console.log('PUT target not found');
}

if (isCRLF) content = content.replace(/\n/g, '\r\n');
fs.writeFileSync(filePath, content, 'utf8');

