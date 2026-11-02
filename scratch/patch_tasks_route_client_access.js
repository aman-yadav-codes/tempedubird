const fs = require("fs");
const path = require("path");

const routePath = path.join(__dirname, "../app/api/admin/operations/tasks/route.ts");
let routeCode = fs.readFileSync(routePath, "utf-8");

// Line 164-166: include Number(user.id) in clientIdsParam
const oldLine164 = `      const matchedClientIds = clientMatch.rows.map((r: any) => r.id);
      params.push(matchedClientIds.length > 0 ? matchedClientIds : [-1]);`;

const newLine164 = `      const matchedClientIds = clientMatch.rows.map((r: any) => r.id);
      const allClientIds = Array.from(new Set([...matchedClientIds, Number(user.id)]));
      params.push(allClientIds.length > 0 ? allClientIds : [-1]);`;

if (routeCode.includes(oldLine164)) {
  routeCode = routeCode.replace(oldLine164, newLine164);
}

// Line 912-917: expand isAssignedClient check in PUT handler
const oldClientPutCheck = `      if (matchedClientId) {
        isAssignedClient =
          Number(existingTask.client_id) === Number(matchedClientId) ||
          (Array.isArray(existingTask.assigned_clients) &&
            existingTask.assigned_clients.some((c: any) => Number(c.id) === Number(matchedClientId)));
      }`;

const newClientPutCheck = `      const assignedClientsList = Array.isArray(existingTask.assigned_clients) ? existingTask.assigned_clients : [];
      isAssignedClient =
        (matchedClientId && Number(existingTask.client_id) === Number(matchedClientId)) ||
        Number(existingTask.client_id) === uId ||
        assignedClientsList.some((c: any) =>
          (matchedClientId && Number(c.id) === Number(matchedClientId)) ||
          Number(c.id) === uId ||
          Number(c.user_id) === uId ||
          (user.email && c.email && c.email.toLowerCase().trim() === (user.email || "").toLowerCase().trim())
        );`;

if (routeCode.includes(oldClientPutCheck)) {
  routeCode = routeCode.replace(oldClientPutCheck, newClientPutCheck);
}

fs.writeFileSync(routePath, routeCode, "utf-8");
console.log("Successfully patched app/api/admin/operations/tasks/route.ts");

