const fs = require('fs');
let code = fs.readFileSync('app/admin/operations/tasks/page.tsx', 'utf8');

const isCRLF = code.includes('\r\n');
const nl = isCRLF ? '\r\n' : '\n';

// Check imports
if (!code.includes('Calendar,')) {
  code = code.replace('  Clock,', '  Clock,\n  Calendar,');
}

// 1. Update Card display for tasks to show:
// - Start & Due Date
// - Project Leader
// - Currency for total cost
// - Live URL & Demo URL
// - Agreement Document

const oldClientSection = `                  {/* Client (if not institution admin) */}
                  {!isInstitutionAdmin && task.client_name && (
                    <div className="flex items-center gap-2 text-xs pt-1">
                      <Building2 className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-muted-foreground">Client:</span>
                      <span className="font-bold text-foreground">{task.client_name}</span>
                    </div>
                  )}`;

const newClientSection = `                  {/* Project Details Bar: Client/Own Company, Leader, Dates, URLs */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                    {!isInstitutionAdmin && (
                      <div className="flex items-center gap-1.5 font-medium">
                        <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="text-muted-foreground">For:</span>
                        <Badge variant={task.project_for === "own_company" ? "default" : "secondary"} className="text-[11px] py-0 px-2 font-semibold">
                          {task.project_for === "own_company" ? "EduBird (Own Company)" : (task.client_name || "Client")}
                        </Badge>
                      </div>
                    )}

                    {task.project_leader_name && (
                      <Badge variant="outline" className="text-[11px] py-0 px-2 gap-1 bg-primary/5 text-primary border-primary/20 font-semibold">
                        <UserCheck className="w-3 h-3" /> Leader: {task.project_leader_name}
                      </Badge>
                    )}

                    {(task.start_date || task.deadline) && (
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-mono bg-muted/40 px-2 py-0.5 rounded-md border">
                        <Calendar className="w-3 h-3 text-muted-foreground" />
                        <span>
                          {task.start_date ? new Date(task.start_date).toLocaleDateString() : "No start"}
                          {" → "}
                          {task.deadline ? new Date(task.deadline).toLocaleDateString() : "No deadline"}
                        </span>
                      </div>
                    )}

                    {task.live_url && (
                      <a
                        href={task.live_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-0.5 rounded-md transition-colors"
                      >
                        <Globe className="w-3 h-3" /> Live URL <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}

                    {task.demo_url && (
                      <a
                        href={task.demo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 px-2 py-0.5 rounded-md transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" /> Demo URL
                      </a>
                    )}

                    {task.agreement_document_url && (
                      <a
                        href={task.agreement_document_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-700 dark:text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 px-2 py-0.5 rounded-md transition-colors"
                        title={task.agreement_document_name || "Agreement Document"}
                      >
                        <FileText className="w-3 h-3" /> Agreement Doc <Download className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>`;

const searchClientSection = isCRLF ? oldClientSection.replace(/\n/g, '\r\n') : oldClientSection;
const replaceClientSection = isCRLF ? newClientSection.replace(/\n/g, '\r\n') : newClientSection;

if (code.includes(searchClientSection)) {
  code = code.replace(searchClientSection, replaceClientSection);
  console.log("Updated task card header bar");
} else {
  console.warn("Could not find oldClientSection");
}

// Update formatPriceDisplay calls in card:
code = code.replace(
  '{formatPriceDisplay(totalCost)}',
  '{formatPriceDisplay(totalCost, task.currency)}'
);

fs.writeFileSync('app/admin/operations/tasks/page.tsx', code, 'utf8');
console.log("Card details saved");

