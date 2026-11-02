const fs = require('fs');

// ==========================================
// 1. Update app/api/admin/operations/tasks/route.ts
// ==========================================
let routeContent = fs.readFileSync('app/api/admin/operations/tasks/route.ts', 'utf8');

// Replace line 1470 in PUT
routeContent = routeContent.replace(
  `        deadline ? new Date(deadline).toISOString() : null,`,
  `        ((body.due_date !== undefined || body.deadline !== undefined) ? (body.due_date ? new Date(body.due_date).toISOString() : (body.deadline ? new Date(body.deadline).toISOString() : null)) : existingTask.deadline),`
);

fs.writeFileSync('app/api/admin/operations/tasks/route.ts', routeContent, 'utf8');
console.log('Successfully updated app/api/admin/operations/tasks/route.ts');

// ==========================================
// 2. Update app/admin/operations/tasks/page.tsx
// ==========================================
let pageContent = fs.readFileSync('app/admin/operations/tasks/page.tsx', 'utf8');

// A. Send both due_date and deadline in payload when saving project
pageContent = pageContent.replace(
  `due_date: formDueDate || null,`,
  `due_date: formDueDate || null,\r
          deadline: formDueDate || null,`
);

// B. Remove Adjust Score button
const adjustScoreBlockRegex = /{\/\* Adjust Score button — admin only \*\/}[\s\S]*?<\/Button>\s*\)}\s*/;
if (adjustScoreBlockRegex.test(pageContent)) {
  pageContent = pageContent.replace(adjustScoreBlockRegex, '');
  console.log('Removed Adjust Score button');
} else {
  console.log('Adjust Score block regex did not match, check manual matching');
}

// C. Show Due Date as well even if null (or formatted if set)
const dateBadgesOld = `<div className="flex items-center gap-2 flex-wrap">
                            {task.start_date && (
                              <Badge variant="outline" className="bg-background text-foreground border gap-1.5 py-1 px-2.5 text-[11px] font-medium">
                                <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                                <span className="text-muted-foreground">Start Date:</span>
                                <strong className="font-mono">{formatDateDisplay(task.start_date)}</strong>
                              </Badge>
                            )}
                            {(task.due_date || task.deadline) && (
                              <Badge
                                variant="outline"
                                className={\`gap-1.5 py-1 px-2.5 text-[11px] font-medium \${
                                  isOverdue
                                    ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/40"
                                    : "bg-background text-foreground border"
                                }\`}
                              >
                                <Clock className={\`w-3.5 h-3.5 shrink-0 \${isOverdue ? "text-rose-600" : "text-amber-600"}\`} />
                                <span className="text-muted-foreground">Due Date:</span>
                                <strong className="font-mono">{formatDateDisplay(task.due_date || task.deadline)}</strong>
                                {isOverdue && (
                                  <span className="text-[9px] uppercase font-bold text-rose-600 tracking-wider bg-rose-500/20 px-1 py-0.2 rounded ml-0.5">
                                    Overdue
                                  </span>
                                )}
                              </Badge>
                            )}
                          </div>`;

const dateBadgesNew = `<div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="bg-background text-foreground border gap-1.5 py-1 px-2.5 text-[11px] font-medium">
                              <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                              <span className="text-muted-foreground">Start Date:</span>
                              <strong className="font-mono">{task.start_date ? formatDateDisplay(task.start_date) : "Not set"}</strong>
                            </Badge>
                            <Badge
                              variant="outline"
                              className={\`gap-1.5 py-1 px-2.5 text-[11px] font-medium \${
                                isOverdue
                                  ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/40"
                                  : "bg-background text-foreground border"
                              }\`}
                            >
                              <Clock className={\`w-3.5 h-3.5 shrink-0 \${isOverdue ? "text-rose-600" : "text-amber-600"}\`} />
                              <span className="text-muted-foreground">Due Date:</span>
                              <strong className="font-mono">{(task.due_date || task.deadline) ? formatDateDisplay(task.due_date || task.deadline) : "Not set"}</strong>
                              {isOverdue && (
                                <span className="text-[9px] uppercase font-bold text-rose-600 tracking-wider bg-rose-500/20 px-1 py-0.2 rounded ml-0.5">
                                  Overdue
                                </span>
                              )}
                            </Badge>
                          </div>`;

pageContent = pageContent.replace(dateBadgesOld.replace(/\r\n/g, '\n'), dateBadgesNew);
pageContent = pageContent.replace(dateBadgesOld, dateBadgesNew);

// D. Project default collapsed:
pageContent = pageContent.replace(
  `const isExpanded = expandedTaskSubtasks[task.id] ?? true;`,
  `const isExpanded = expandedTaskSubtasks[task.id] ?? false;`
);

// E. Metrics calculation & Expected duration according to team worked on sub task:
const metricsOld = `            const totalMinutes = rawSubTasksList.reduce((sum, s) => {
              const h = parseFloat(String(s.duration_hours)) || 0;
              const m = parseFloat(String(s.duration_minutes)) || 0;
              return sum + (h * 60) + m;
            }, 0);
            const totalHoursDisplay = totalMinutes > 0
              ? (() => {
                const h = Math.floor(totalMinutes / 60);
                const m = Math.round(totalMinutes % 60);
                if (h > 0 && m > 0) return \`\${h}h \${m}m\`;
                if (h > 0) return \`\${h}h\`;
                if (m > 0) return \`\${m}m\`;
                return "0m";
              })()
              : (parseFloat(String(task.estimated_hours || 0)) ? \`\${task.estimated_hours}h\` : "0h");`;

const metricsNew = `            const totalMinutes = rawSubTasksList.reduce((sum, s) => {
              const h = parseFloat(String(s.duration_hours)) || 0;
              const m = parseFloat(String(s.duration_minutes)) || 0;
              return sum + (h * 60) + m;
            }, 0);
            const totalHoursDisplay = totalMinutes > 0
              ? (() => {
                const h = Math.floor(totalMinutes / 60);
                const m = Math.round(totalMinutes % 60);
                if (h > 0 && m > 0) return \`\${h}h \${m}m\`;
                if (h > 0) return \`\${h}h\`;
                if (m > 0) return \`\${m}m\`;
                return "0m";
              })()
              : (parseFloat(String(task.estimated_hours || 0)) ? \`\${task.estimated_hours}h\` : "0h");

            // Expected duration calculated according to team members assigned/working on each sub-task
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
              : totalHoursDisplay;`;

pageContent = pageContent.replace(metricsOld.replace(/\r\n/g, '\n'), metricsNew);
pageContent = pageContent.replace(metricsOld, metricsNew);

// F. Summary Bar update: 4 columns
const summaryBarOld = `<div className="grid grid-cols-3 gap-2 bg-muted/30 p-3 rounded-xl border text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[10px] font-medium uppercase">Total Cost</span>
                      <span className="font-bold text-foreground font-mono text-sm tracking-wider">
                        {formatPriceDisplay(totalCost)}
                      </span>
                    </div>
                    <div className="border-l pl-3">
                      <span className="text-muted-foreground block text-[10px] font-medium uppercase">Total Duration</span>
                      <span className="font-bold text-foreground font-mono text-sm">
                        {totalHoursDisplay}
                      </span>
                    </div>
                    <div className="border-l pl-3">
                      <span className="text-muted-foreground block text-[10px] font-medium uppercase">Sub-Tasks</span>
                      <span className="font-bold text-foreground font-mono text-sm">
                        {completedSubs}/{subTasksList.length} Done
                      </span>
                    </div>
                  </div>`;

const summaryBarNew = `<div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-muted/30 p-3 rounded-xl border text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[10px] font-medium uppercase">Total Cost</span>
                      <span className="font-bold text-foreground font-mono text-sm tracking-wider">
                        {formatPriceDisplay(totalCost)}
                      </span>
                    </div>
                    <div className="border-l pl-3">
                      <span className="text-muted-foreground block text-[10px] font-medium uppercase">Expected Duration</span>
                      <span className="font-bold text-foreground font-mono text-sm">
                        {expectedDurationDisplay}
                      </span>
                    </div>
                    <div className="border-l pl-3">
                      <span className="text-muted-foreground block text-[10px] font-medium uppercase">Duration Taken</span>
                      <span className="font-bold text-foreground font-mono text-sm">
                        {durationTakenDisplay}
                      </span>
                    </div>
                    <div className="border-l pl-3">
                      <span className="text-muted-foreground block text-[10px] font-medium uppercase">Sub-Tasks</span>
                      <span className="font-bold text-foreground font-mono text-sm">
                        {completedSubs}/{subTasksList.length} Done
                      </span>
                    </div>
                  </div>`;

pageContent = pageContent.replace(summaryBarOld.replace(/\r\n/g, '\n'), summaryBarNew);
pageContent = pageContent.replace(summaryBarOld, summaryBarNew);

// G. Remove Card Footer ("Created: 1 Nov")
const footerOld = `                {/* Card Footer */}
                <div className="flex items-center justify-between px-5 py-2.5 border-t bg-muted/10">
                  <div className="text-[11px] text-muted-foreground">
                    Created: {new Date(task.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                  </div>
                </div>`;

pageContent = pageContent.replace(footerOld.replace(/\r\n/g, '\n'), '');
pageContent = pageContent.replace(footerOld, '');

fs.writeFileSync('app/admin/operations/tasks/page.tsx', pageContent, 'utf8');
console.log('Successfully updated app/admin/operations/tasks/page.tsx');

