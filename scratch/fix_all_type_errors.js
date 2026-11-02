const fs = require('fs');

// 1. Fix app/api/admin/operations/tasks/route.ts bulk creation variables
let routeContent = fs.readFileSync('app/api/admin/operations/tasks/route.ts', 'utf8');
const bulkTarget = `      const company_name = project_for === "own_company" ? (shared.company_name?.trim() || "EduBird") : null;
      const currency = shared.currency?.trim() || "INR";`;

const bulkReplace = `      const company_name = project_for === "own_company" ? (shared.company_name?.trim() || "EduBird") : null;
      const finalClientName = project_for === "client" ? (shared.client_name?.trim() || "Client") : "EduBird";
      const finalClientId = project_for === "client" ? (shared.client_id ? parseInt(String(shared.client_id).replace("vendor_", "")) : null) : null;
      const currency = shared.currency?.trim() || "INR";`;

if (routeContent.includes(bulkTarget)) {
  routeContent = routeContent.replace(bulkTarget, bulkReplace);
  fs.writeFileSync('app/api/admin/operations/tasks/route.ts', routeContent, 'utf8');
  console.log('1. Fixed bulk client variables in route.ts');
} else {
  console.log('1. bulkTarget not found');
}

// 2. Fix app/lib/task-attendance-sync.ts
let syncContent = fs.readFileSync('app/lib/task-attendance-sync.ts', 'utf8');
const syncTarget = `        isActive,
        status: status,
        actionUser: t.assigned_employee_name || undefined,`;

const syncReplace = `        isActive,
        status: (status as "in_progress" | "completed" | "stopped"),
        actionUser: t.assigned_employee_name || undefined,`;

if (syncContent.includes(syncTarget)) {
  syncContent = syncContent.replace(syncTarget, syncReplace);
  fs.writeFileSync('app/lib/task-attendance-sync.ts', syncContent, 'utf8');
  console.log('2. Fixed status cast in task-attendance-sync.ts');
} else {
  console.log('2. syncTarget not found');
}

// 3. Fix app/admin/operations/tasks/page.tsx
let pageContent = fs.readFileSync('app/admin/operations/tasks/page.tsx', 'utf8');

// Ensure FileText is imported
if (!pageContent.includes('FileText,') && !pageContent.includes('FileText ')) {
  pageContent = pageContent.replace('FileCheck,', 'FileCheck,\n  FileText,');
  console.log('3a. Added FileText to imports');
}

// Ensure PROJECT_CURRENCIES and getCurrencySymbol are exported
if (!pageContent.includes('export const PROJECT_CURRENCIES')) {
  const currencyExport = `export const PROJECT_CURRENCIES = [
  { code: "INR", symbol: "₹", label: "INR (₹) - Indian Rupee" },
  { code: "USD", symbol: "$", label: "USD ($) - US Dollar" },
  { code: "EUR", symbol: "€", label: "EUR (€) - Euro" },
  { code: "GBP", symbol: "£", label: "GBP (£) - British Pound" },
  { code: "AED", symbol: "د.إ", label: "AED (د.إ) - UAE Dirham" },
];

export function getCurrencySymbol(code?: string | null) {
  const match = PROJECT_CURRENCIES.find((c) => c.code === (code || "INR").toUpperCase());
  return match?.symbol || (code || "₹");
}

`;
  pageContent = currencyExport + pageContent;
  console.log('3b. Added PROJECT_CURRENCIES export');
}

// Ensure SubTask type has uploads and work_updates
if (!pageContent.includes('uploads?: any[];')) {
  pageContent = pageContent.replace(
    '  stopped_by_name?: string | null;',
    '  stopped_by_name?: string | null;\n  uploads?: any[];\n  work_updates?: any[];'
  );
  console.log('3c. Added uploads and work_updates to SubTask type');
}

// Ensure OperationTask has history, base_price, cost, currency, project_for
if (!pageContent.includes('base_price?: number | null;')) {
  pageContent = pageContent.replace(
    'export type OperationTask = {',
    `export type OperationTask = {
  project_for?: "own_company" | "client" | null;
  company_name?: string | null;
  start_date?: string | null;
  currency?: string | null;
  cost?: string | number | null;
  live_url?: string | null;
  demo_url?: string | null;
  project_leader_id?: number | null;
  project_leader_name?: string | null;
  agreement_document_url?: string | null;
  agreement_document_name?: string | null;
  base_price?: number | null;
  extra_cost?: number | null;
  history?: any[];`
  );
  console.log('3d. Added extended properties to OperationTask');
}

// Add state variables and agreement upload handler inside OperationsTasksPage
if (!pageContent.includes('const [formProjectFor, setFormProjectFor]')) {
  const stateInsert = `  const [formProjectFor, setFormProjectFor] = useState<"own_company" | "client">("own_company");
  const [formCompanyName, setFormCompanyName] = useState("EduBird");
  const [formStartDate, setFormStartDate] = useState("");
  const [formDueDate, setFormDueDate] = useState("");
  const [formCurrency, setFormCurrency] = useState("INR");
  const [formCost, setFormCost] = useState("0");
  const [formLiveUrl, setFormLiveUrl] = useState("");
  const [formDemoUrl, setFormDemoUrl] = useState("");
  const [formProjectLeaderId, setFormProjectLeaderId] = useState("none");
  const [formProjectLeaderName, setFormProjectLeaderName] = useState("");
  const [formAgreementDocUrl, setFormAgreementDocUrl] = useState("");
  const [formAgreementDocName, setFormAgreementDocName] = useState("");
  const [uploadingAgreement, setUploadingAgreement] = useState(false);

  const handleAgreementFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAgreement(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/uploads/documents", {
        method: "POST",
        headers: accessToken ? { Authorization: \`Bearer \${accessToken}\` } : undefined,
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to upload agreement");
      setFormAgreementDocUrl(data.url || data.file_url || "");
      setFormAgreementDocName(file.name);
      toast.success("Agreement document uploaded successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload document");
    } finally {
      setUploadingAgreement(false);
    }
  };
`;

  pageContent = pageContent.replace(
    '  const [formAssignedClientIds, setFormAssignedClientIds] = useState<string[]>([]);',
    `  const [formAssignedClientIds, setFormAssignedClientIds] = useState<string[]>([]);\n${stateInsert}`
  );
  console.log('3e. Added project form states and agreement upload handler');
}

fs.writeFileSync('app/admin/operations/tasks/page.tsx', pageContent, 'utf8');
console.log('Completed patching all files.');

