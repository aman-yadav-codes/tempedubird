const fs = require('fs');

let content = fs.readFileSync('app/api/admin/operations/tasks/route.ts', 'utf8').replace(/\r\n/g, '\n');

// 1. GET handler: client query filtering by assigned_clients
const oldClientFilter = `      if (matchedClientId) {
        params.push(matchedClientId);
        query += \` AND client_id = $\${params.length}\`;
      } else {
        query += \` AND 1=0\`;
      }
    } else {
      if (clientId && clientId !== "all") {
        params.push(clientId);
        query += \` AND client_id = $\${params.length}\`;
      }`;

const newClientFilter = `      if (matchedClientId) {
        params.push(matchedClientId);
        query += \` AND (
          client_id = $\${params.length}
          OR EXISTS (
            SELECT 1 FROM jsonb_array_elements(COALESCE(assigned_clients, '[]'::jsonb)) elem 
            WHERE (elem->>'id')::int = $\${params.length}
          )
        )\`;
      } else {
        query += \` AND 1=0\`;
      }
    } else {
      if (clientId && clientId !== "all") {
        params.push(clientId);
        query += \` AND (
          client_id = $\${params.length}
          OR EXISTS (
            SELECT 1 FROM jsonb_array_elements(COALESCE(assigned_clients, '[]'::jsonb)) elem 
            WHERE (elem->>'id')::int = $\${params.length}
          )
        )\`;
      }`;

if (content.includes(oldClientFilter)) {
  content = content.replace(oldClientFilter, newClientFilter);
  console.log('1. Replaced clientFilter in GET');
} else {
  console.log('1. oldClientFilter NOT found');
}

// 2. GET handler: clientsRes query to return all active clients associated with user's institutions
const oldClientsRes = `    const effectiveClientId = targetInstId || userInstId || 1;
    const clientsRes = await db.query(
      \`SELECT id, name, company_name, email, phone, client_type, institution_id
       FROM clients
       WHERE status = 'active'
         AND (institution_id = $1::int OR institution_id IS NULL)
       ORDER BY COALESCE(company_name, name) ASC\`,
      [effectiveClientId]
    );`;

const newClientsRes = `    const userMemberships = user?.memberships || [];
    const userInstIds = userMemberships.map((m: any) => Number(m.institution_id)).filter(Boolean);
    if (userInstId && !userInstIds.includes(Number(userInstId))) {
      userInstIds.push(Number(userInstId));
    }
    const targetInst = targetInstId || userInstId || 1;

    const clientsRes = await db.query(
      \`SELECT id, name, company_name, email, phone, client_type, institution_id
       FROM clients
       WHERE status = 'active'
         AND (
           $1::boolean = TRUE
           OR institution_id = $2::int
           OR institution_id = 1
           OR institution_id IS NULL
           OR institution_id = ANY($3::int[])
         )
       ORDER BY COALESCE(company_name, name) ASC\`,
      [Boolean(isPlatform), targetInst, userInstIds.length > 0 ? userInstIds : [1]]
    );`;

if (content.includes(oldClientsRes)) {
  content = content.replace(oldClientsRes, newClientsRes);
  console.log('2. Replaced clientsRes in GET');
} else {
  console.log('2. oldClientsRes NOT found');
}

// 3. POST handler: add assigned_clients in INSERT
const oldInsertQuery = `      INSERT INTO operations_tasks (
        title, client_id, client_name, institution_id, price, details,
        assigned_employee_id, assigned_employee_name, assigned_employee_role, assigned_employee_email,
        estimated_hours, logged_hours, deadline, status, urgency, sub_tasks,
        is_daily_recurring, last_recurring_date, points, penalty_points, assigned_employees, created_by, history,
        project_for, company_name, start_date, currency, cost, live_url, demo_url,
        project_leader_id, project_leader_name, agreement_document_url, agreement_document_name,
        created_at, updated_at, attachments
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23::jsonb,
        $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34,
        NOW(), NOW(), $35::jsonb
      )`;

const newInsertQuery = `      INSERT INTO operations_tasks (
        title, client_id, client_name, institution_id, price, details,
        assigned_employee_id, assigned_employee_name, assigned_employee_role, assigned_employee_email,
        estimated_hours, logged_hours, deadline, status, urgency, sub_tasks,
        is_daily_recurring, last_recurring_date, points, penalty_points, assigned_employees, created_by, history,
        project_for, company_name, start_date, currency, cost, live_url, demo_url,
        project_leader_id, project_leader_name, agreement_document_url, agreement_document_name,
        created_at, updated_at, attachments, assigned_clients
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23::jsonb,
        $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34,
        NOW(), NOW(), $35::jsonb, $36::jsonb
      )`;

if (content.includes(oldInsertQuery)) {
  content = content.replace(oldInsertQuery, newInsertQuery);
  console.log('3. Replaced oldInsertQuery in POST');
} else {
  console.log('3. oldInsertQuery NOT found');
}

// In POST parameters:
const oldInsertParams = `        agreementDocName,
        JSON.stringify(Array.isArray(body.attachments) ? body.attachments : []),
      ]`;

const newInsertParams = `        agreementDocName,
        JSON.stringify(Array.isArray(body.attachments) ? body.attachments : []),
        JSON.stringify(Array.isArray(body.assigned_clients) ? body.assigned_clients : []),
      ]`;

if (content.includes(oldInsertParams)) {
  content = content.replace(oldInsertParams, newInsertParams);
  console.log('4. Replaced oldInsertParams in POST');
} else {
  console.log('4. oldInsertParams NOT found');
}

// 4. PUT handler: allow assigned clients and update assigned_clients column
const oldPutAuth = `    // For non-admin staff: verify they are assigned to this task or created it
    if (!isOwnerOrAdmin && user?.id) {
      const uId = Number(user.id);
      const isAuthorizedForTask =
        Number(existingTask.created_by) === uId ||
        Number(existingTask.assigned_employee_id) === uId ||
        (Array.isArray(existingTask.assigned_employees) &&
          existingTask.assigned_employees.some((e: any) => Number(e.id) === uId || Number(e.employee_id) === uId)) ||
        (Array.isArray(existingTask.sub_tasks) &&
          existingTask.sub_tasks.some((st: any) => Number(st.assigned_employee_id) === uId));

      if (!isAuthorizedForTask) {
        return NextResponse.json(
          { error: "You can only update tasks assigned to you or created by you." },
          { status: 403 }
        );
      }`;

const newPutAuth = `    // Check if user is an assigned client
    let isAssignedClient = false;
    if (user?.id) {
      const uId = Number(user.id);
      const clientMatch = await db.query(
        \`SELECT id FROM clients WHERE user_id = $1 OR (email IS NOT NULL AND lower(email) = lower($2)) OR (phone IS NOT NULL AND phone = $3) LIMIT 1\`,
        [uId, user.email || "", user.phone || ""]
      );
      const matchedClientId = clientMatch.rows[0]?.id;
      if (matchedClientId) {
        isAssignedClient =
          Number(existingTask.client_id) === Number(matchedClientId) ||
          (Array.isArray(existingTask.assigned_clients) &&
            existingTask.assigned_clients.some((c: any) => Number(c.id) === Number(matchedClientId)));
      }
    }

    // For non-admin staff: verify they are assigned to this task or created it
    if (!isOwnerOrAdmin && !isAssignedClient && user?.id) {
      const uId = Number(user.id);
      const isAuthorizedForTask =
        Number(existingTask.created_by) === uId ||
        Number(existingTask.assigned_employee_id) === uId ||
        (Array.isArray(existingTask.assigned_employees) &&
          existingTask.assigned_employees.some((e: any) => Number(e.id) === uId || Number(e.employee_id) === uId)) ||
        (Array.isArray(existingTask.sub_tasks) &&
          existingTask.sub_tasks.some((st: any) => Number(st.assigned_employee_id) === uId));

      if (!isAuthorizedForTask) {
        return NextResponse.json(
          { error: "You can only update tasks assigned to you or created by you." },
          { status: 403 }
        );
      }`;

if (content.includes(oldPutAuth)) {
  content = content.replace(oldPutAuth, newPutAuth);
  console.log('5. Replaced oldPutAuth in PUT');
} else {
  console.log('5. oldPutAuth NOT found');
}

// 5. In PUT updates: update assigned_clients
const oldPutAttachments = `      if (body.attachments !== undefined) {
        params.push(JSON.stringify(Array.isArray(body.attachments) ? body.attachments : []));
        updates.push(\`attachments = $\${params.length}::jsonb\`);
      }`;

const newPutAttachments = `      if (body.attachments !== undefined) {
        params.push(JSON.stringify(Array.isArray(body.attachments) ? body.attachments : []));
        updates.push(\`attachments = $\${params.length}::jsonb\`);
      }
      if (body.assigned_clients !== undefined) {
        const assignedClientsArr = Array.isArray(body.assigned_clients) ? body.assigned_clients : [];
        params.push(JSON.stringify(assignedClientsArr));
        updates.push(\`assigned_clients = $\${params.length}::jsonb\`);
        if (assignedClientsArr.length > 0 && !client_id) {
          params.push(parseInt(String(assignedClientsArr[0].id)));
          updates.push(\`client_id = $\${params.length}\`);
          params.push(assignedClientsArr.map((c: any) => c.company_name || c.name).filter(Boolean).join(", "));
          updates.push(\`client_name = $\${params.length}\`);
        }
      }`;

if (content.includes(oldPutAttachments)) {
  content = content.replace(oldPutAttachments, newPutAttachments);
  console.log('6. Replaced oldPutAttachments in PUT');
} else {
  console.log('6. oldPutAttachments NOT found');
}

fs.writeFileSync('app/api/admin/operations/tasks/route.ts', content, 'utf8');
console.log('Finished updating tasks route.');
