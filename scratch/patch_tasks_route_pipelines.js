const fs = require('fs');

let fileContent = fs.readFileSync('app/api/admin/operations/tasks/route.ts', 'utf8');
const isCRLF = fileContent.includes('\r\n');
if (isCRLF) {
  fileContent = fileContent.replace(/\r\n/g, '\n');
}

// 1. In POST: read project_type_id, project_type_name, pipeline_id, pipeline_name, pipeline_phases
const targetPostExtract = `    const agreementDocUrl = body.agreement_document_url?.trim() || null;
    const agreementDocName = body.agreement_document_name?.trim() || null;`;

const replacementPostExtract = `    const agreementDocUrl = body.agreement_document_url?.trim() || null;
    const agreementDocName = body.agreement_document_name?.trim() || null;
    const projectTypeId = body.project_type_id ? parseInt(String(body.project_type_id)) : null;
    const projectTypeName = body.project_type_name?.trim() || null;
    const pipelineId = body.pipeline_id ? parseInt(String(body.pipeline_id)) : null;
    const pipelineName = body.pipeline_name?.trim() || null;
    let pipelinePhases = Array.isArray(body.pipeline_phases) ? body.pipeline_phases : [];

    if (pipelineId && pipelinePhases.length === 0) {
      try {
        const plRes = await db.query('SELECT phases, name FROM operations_project_pipelines WHERE id = $1', [pipelineId]);
        if (plRes.rows.length > 0 && Array.isArray(plRes.rows[0].phases)) {
          pipelinePhases = plRes.rows[0].phases;
        }
      } catch (err) {
        console.warn('Could not load pipeline phases snapshot:', err);
      }
    }

    const snapshottedPhases = pipelinePhases.map((ph, idx) => ({
      ...ph,
      order: ph.order || idx + 1,
      status: ph.status || (idx === 0 ? "in_progress" : "not_started"),
      started_at: ph.started_at || (idx === 0 ? new Date().toISOString() : null),
      completed_at: ph.completed_at || null,
      notes: ph.notes || "",
    }));`;

if (!fileContent.includes(targetPostExtract)) {
  console.error("Target POST extract not found!");
  process.exit(1);
}
fileContent = fileContent.replace(targetPostExtract, replacementPostExtract);

// 2. In POST: update INSERT query
const targetInsertCols = `        created_at, updated_at, attachments, assigned_clients
      ) VALUES (`;

const replacementInsertCols = `        created_at, updated_at, attachments, assigned_clients,
        project_type_id, project_type_name, pipeline_id, pipeline_name, pipeline_phases, current_phase_index
      ) VALUES (`;

if (!fileContent.includes(targetInsertCols)) {
  console.error("Target INSERT cols not found!");
  process.exit(1);
}
fileContent = fileContent.replace(targetInsertCols, replacementInsertCols);

const targetInsertVals = `        NOW(), NOW(), $35::jsonb, $36::jsonb
      )
      RETURNING *`;

const replacementInsertVals = `        NOW(), NOW(), $35::jsonb, $36::jsonb,
        $37, $38, $39, $40, $41::jsonb, $42
      )
      RETURNING *`;

if (!fileContent.includes(targetInsertVals)) {
  console.error("Target INSERT vals not found!");
  process.exit(1);
}
fileContent = fileContent.replace(targetInsertVals, replacementInsertVals);

const targetInsertParams = `        JSON.stringify(Array.isArray(body.attachments) ? body.attachments : []),
        JSON.stringify(Array.isArray(body.assigned_clients) ? body.assigned_clients : []),
      ]
    );`;

const replacementInsertParams = `        JSON.stringify(Array.isArray(body.attachments) ? body.attachments : []),
        JSON.stringify(Array.isArray(body.assigned_clients) ? body.assigned_clients : []),
        projectTypeId,
        projectTypeName,
        pipelineId,
        pipelineName,
        JSON.stringify(snapshottedPhases),
        0,
      ]
    );`;

if (!fileContent.includes(targetInsertParams)) {
  console.error("Target INSERT params not found!");
  process.exit(1);
}
fileContent = fileContent.replace(targetInsertParams, replacementInsertParams);

// 3. In PUT: add updates for project_type_id, project_type_name, pipeline_id, pipeline_name, pipeline_phases, current_phase_index
const targetPutUpdates = "      if (body.agreement_document_name !== undefined) {\n        params.push(body.agreement_document_name ? String(body.agreement_document_name).trim() : null);\n        updates.push(`agreement_document_name = $${params.length}`);\n      }";

const extraPutUpdates = `
      if (body.project_type_id !== undefined) {
        params.push(body.project_type_id ? parseInt(String(body.project_type_id)) : null);
        updates.push(\`project_type_id = $\${params.length}\`);
      }
      if (body.project_type_name !== undefined) {
        params.push(body.project_type_name ? String(body.project_type_name).trim() : null);
        updates.push(\`project_type_name = $\${params.length}\`);
      }
      if (body.pipeline_id !== undefined) {
        params.push(body.pipeline_id ? parseInt(String(body.pipeline_id)) : null);
        updates.push(\`pipeline_id = $\${params.length}\`);
      }
      if (body.pipeline_name !== undefined) {
        params.push(body.pipeline_name ? String(body.pipeline_name).trim() : null);
        updates.push(\`pipeline_name = $\${params.length}\`);
      }
      if (body.pipeline_phases !== undefined) {
        const phs = Array.isArray(body.pipeline_phases) ? body.pipeline_phases : [];
        params.push(JSON.stringify(phs));
        updates.push(\`pipeline_phases = $\${params.length}::jsonb\`);
      }
      if (body.current_phase_index !== undefined) {
        params.push(parseInt(String(body.current_phase_index)) || 0);
        updates.push(\`current_phase_index = $\${params.length}\`);
      }`;

if (!fileContent.includes(targetPutUpdates)) {
  console.error("Target PUT updates not found!");
  process.exit(1);
}
fileContent = fileContent.replace(targetPutUpdates, targetPutUpdates + extraPutUpdates);

if (isCRLF) {
  fileContent = fileContent.replace(/\n/g, '\r\n');
}

fs.writeFileSync('app/api/admin/operations/tasks/route.ts', fileContent, 'utf8');
console.log('Successfully patched app/api/admin/operations/tasks/route.ts with pipeline fields!');
