const fs = require('fs');
let code = fs.readFileSync('app/admin/operations/tasks/page.tsx', 'utf8').replace(/\r\n/g, '\n');

const oldSave = `          client_id: isInstitutionAdmin ? null : (formClientId !== "none" ? formClientId : null),
          client_name: isInstitutionAdmin ? null : (formClientName.trim() || null),`;

const newSave = `          client_id: formProjectFor === "client" ? primaryClientId : null,
          client_name: formProjectFor === "client" ? combinedClientNames : "EduBird",
          assigned_clients: formProjectFor === "client" ? selectedClientObjects : [],`;

if (code.includes(oldSave)) {
  const staffObjIdx = code.indexOf('const selectedStaffObjects = dialogStaffList');
  const clientObjCode = `      const selectedClientObjects = clients
        .filter((c) => formAssignedClientIds.includes(String(c.id)))
        .map((c) => ({
          id: c.id,
          name: c.name,
          company_name: c.company_name || c.name,
          email: c.email || null,
          phone: c.phone || null,
          client_type: c.client_type || null,
        }));

      const primaryClientId = selectedClientObjects.length > 0
        ? selectedClientObjects[0].id
        : (formClientId !== "none" ? parseInt(formClientId) : null);
      const combinedClientNames = selectedClientObjects.length > 0
        ? selectedClientObjects.map((c) => c.company_name || c.name).filter(Boolean).join(", ")
        : (formClientName.trim() || null);

`;
  code = code.substring(0, staffObjIdx) + clientObjCode + code.substring(staffObjIdx);
  code = code.replace(oldSave, newSave);
  fs.writeFileSync('app/admin/operations/tasks/page.tsx', code, 'utf8');
  console.log('Successfully updated handleSaveMainTask with multi-client payload!');
} else {
  console.log('oldSave not found in page.tsx');
}

