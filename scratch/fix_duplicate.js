const fs = require('fs');
let content = fs.readFileSync('app/admin/operations/tasks/page.tsx', 'utf8');

const duplicateBlock = `            // Expected duration calculated according to team members assigned/working on each sub-task
            const expectedMinutes = rawSubTasksList.reduce((sum, s) => {
              const baseMin = ((parseFloat(String(s.duration_hours)) || 0) * 60) + (parseFloat(String(s.duration_minutes)) || 0);
              const teamMembers = new Set<string>();
              if (s.assigned_employee_name) {
                s.assigned_employee_name.split(",").map((x) => x.trim()).filter(Boolean).forEach((x) => teamMembers.add(x));
              }
              if (Array.isArray((s as any).assigned_employees)) {
                (s as any).assigned_employees.forEach((e: any) => {
                  const n = typeof e === "string" ? e : (e?.name || e?.full_name);
                  if (n) teamMembers.add(String(n).trim());
                });
              }
              if (Array.isArray(s.uploads)) {
                s.uploads.forEach((u: any) => {
                  if (u?.uploaded_by_name) teamMembers.add(String(u.uploaded_by_name).trim());
                });
              }
              if (Array.isArray(s.work_updates)) {
                s.work_updates.forEach((w: any) => {
                  if (w?.author_name) teamMembers.add(String(w.author_name).trim());
                });
              }
              if (s.started_by_name) teamMembers.add(String(s.started_by_name).trim());
              const teamCount = Math.max(1, teamMembers.size);
              return sum + (baseMin * teamCount);
            }, 0);

            const expectedDurationDisplay = expectedMinutes > 0
              ? (() => {
                const h = Math.floor(expectedMinutes / 60);
                const m = Math.round(expectedMinutes % 60);
                if (h > 0 && m > 0) return \`\${h}h \${m}m\`;
                if (h > 0) return \`\${h} hours\`;
                if (m > 0) return \`\${m}m\`;
                return "0m";
              })()
              : totalHoursDisplay;

            // Duration taken by team
            const durationTakenMinutes = rawSubTasksList.reduce((sum, s) => {
              const baseMin = ((parseFloat(String(s.duration_hours)) || 0) * 60) + (parseFloat(String(s.duration_minutes)) || 0);
              const logged = parseFloat(String((s as any).logged_minutes)) || 0;
              return sum + (logged > 0 ? logged : baseMin);
            }, 0);

            const durationTakenDisplay = durationTakenMinutes > 0
              ? (() => {
                const h = Math.floor(durationTakenMinutes / 60);
                const m = Math.round(durationTakenMinutes % 60);
                if (h > 0 && m > 0) return \`\${h}h \${m}m\`;
                if (h > 0) return \`\${h}h\`;
                if (m > 0) return \`\${m}m\`;
                return "0m";
              })()
              : totalHoursDisplay;\r\n`;

// Replace the duplicate occurrence
content = content.replace(duplicateBlock, '');
content = content.replace(duplicateBlock.replace(/\r\n/g, '\n'), '');

fs.writeFileSync('app/admin/operations/tasks/page.tsx', content, 'utf8');
console.log('Fixed duplicate block in page.tsx');

