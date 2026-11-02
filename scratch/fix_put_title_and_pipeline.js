const fs = require('fs');

// 1. Fix app/api/admin/operations/tasks/route.ts
let routeContent = fs.readFileSync('app/api/admin/operations/tasks/route.ts', 'utf8');
const isRouteCRLF = routeContent.includes('\r\n');
if (isRouteCRLF) routeContent = routeContent.replace(/\r\n/g, '\n');

// In line 1088 condition: add pipeline fields
const targetCondition = `body.base_price !== undefined || body.extra_cost !== undefined || body.cost !== undefined || body.price !== undefined)) {`;
const replacementCondition = `body.base_price !== undefined || body.extra_cost !== undefined || body.cost !== undefined || body.price !== undefined || body.pipeline_id !== undefined || body.pipeline_phases !== undefined || body.project_type_id !== undefined || body.current_phase_index !== undefined)) {`;

if (!routeContent.includes(targetCondition)) {
  console.error("Target condition in route.ts not found!");
  process.exit(1);
}
routeContent = routeContent.replace(targetCondition, replacementCondition);

// In block 2: make title fallback to existingTask.title
const targetFinalProjectLeaderName = `    const finalProjectLeaderName = body.project_leader_name !== undefined ? (body.project_leader_name ? String(body.project_leader_name).trim() : null) : existingTask.project_leader_name;`;

const replacementFinalFields = `    const finalProjectLeaderName = body.project_leader_name !== undefined ? (body.project_leader_name ? String(body.project_leader_name).trim() : null) : existingTask.project_leader_name;
    const finalTitle = (title !== undefined && title !== null && String(title).trim() !== "") ? String(title).trim() : existingTask.title;
    const finalProjectTypeId = body.project_type_id !== undefined ? (body.project_type_id ? Number(body.project_type_id) : null) : existingTask.project_type_id;
    const finalProjectTypeName = body.project_type_name !== undefined ? (body.project_type_name ? String(body.project_type_name).trim() : null) : existingTask.project_type_name;
    const finalPipelineId = body.pipeline_id !== undefined ? (body.pipeline_id ? Number(body.pipeline_id) : null) : existingTask.pipeline_id;
    const finalPipelineName = body.pipeline_name !== undefined ? (body.pipeline_name ? String(body.pipeline_name).trim() : null) : existingTask.pipeline_name;
    const finalPipelinePhases = body.pipeline_phases !== undefined ? (Array.isArray(body.pipeline_phases) ? body.pipeline_phases : []) : (Array.isArray(existingTask.pipeline_phases) ? existingTask.pipeline_phases : []);
    const finalCurrentPhaseIndex = body.current_phase_index !== undefined ? Number(body.current_phase_index) || 0 : (existingTask.current_phase_index || 0);`;

if (!routeContent.includes(targetFinalProjectLeaderName)) {
  console.error("Target finalProjectLeaderName in route.ts not found!");
  process.exit(1);
}
routeContent = routeContent.replace(targetFinalProjectLeaderName, replacementFinalFields);

const targetBlock2Update = `        project_leader_id = $30,
        project_leader_name = $31,
        updated_at = NOW()
      WHERE id = $32`;

const replacementBlock2Update = `        project_leader_id = $30,
        project_leader_name = $31,
        project_type_id = $33,
        project_type_name = $34,
        pipeline_id = $35,
        pipeline_name = $36,
        pipeline_phases = $37::jsonb,
        current_phase_index = $38,
        updated_at = NOW()
      WHERE id = $32`;

if (!routeContent.includes(targetBlock2Update)) {
  console.error("Target block2 update query in route.ts not found!");
  process.exit(1);
}
routeContent = routeContent.replace(targetBlock2Update, replacementBlock2Update);

const targetBlock2Params = `        title?.trim(),
        finalClientId,`;

const replacementBlock2Params = `        finalTitle,
        finalClientId,`;

if (!routeContent.includes(targetBlock2Params)) {
  console.error("Target block2 params in route.ts not found!");
  process.exit(1);
}
routeContent = routeContent.replace(targetBlock2Params, replacementBlock2Params);

const targetBlock2EndParams = `        finalProjectLeaderId,
        finalProjectLeaderName,
        id,
      ]`;

const replacementBlock2EndParams = `        finalProjectLeaderId,
        finalProjectLeaderName,
        id,
        finalProjectTypeId,
        finalProjectTypeName,
        finalPipelineId,
        finalPipelineName,
        JSON.stringify(finalPipelinePhases),
        finalCurrentPhaseIndex,
      ]`;

if (!routeContent.includes(targetBlock2EndParams)) {
  console.error("Target block2 end params in route.ts not found!");
  process.exit(1);
}
routeContent = routeContent.replace(targetBlock2EndParams, replacementBlock2EndParams);

if (isRouteCRLF) routeContent = routeContent.replace(/\n/g, '\r\n');
fs.writeFileSync('app/api/admin/operations/tasks/route.ts', routeContent, 'utf8');
console.log('Successfully fixed app/api/admin/operations/tasks/route.ts');


// 2. Fix app/admin/operations/tasks/page.tsx attach pipeline handler
let pageContent = fs.readFileSync('app/admin/operations/tasks/page.tsx', 'utf8');
const isPageCRLF = pageContent.includes('\r\n');
if (isPageCRLF) pageContent = pageContent.replace(/\r\n/g, '\n');

const targetAttachBody = `                    body: JSON.stringify({
                      id: attachPipelineTask.id,
                      project_type_id: selType?.id || null,`;

const replacementAttachBody = `                    body: JSON.stringify({
                      id: attachPipelineTask.id,
                      title: attachPipelineTask.title,
                      project_type_id: selType?.id || null,`;

if (pageContent.includes(targetAttachBody)) {
  pageContent = pageContent.replace(targetAttachBody, replacementAttachBody);
}

const targetAttachCheck = `                  if (!res.ok) throw new Error("Failed to assign pipeline");`;
const replacementAttachCheck = `                  const resData = await res.json().catch(() => ({}));
                  if (!res.ok) throw new Error(resData.error || "Failed to assign pipeline");`;

if (pageContent.includes(targetAttachCheck)) {
  pageContent = pageContent.replace(targetAttachCheck, replacementAttachCheck);
}

if (isPageCRLF) pageContent = pageContent.replace(/\n/g, '\r\n');
fs.writeFileSync('app/admin/operations/tasks/page.tsx', pageContent, 'utf8');
console.log('Successfully fixed app/admin/operations/tasks/page.tsx');

