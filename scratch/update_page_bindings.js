const fs = require('fs');
let code = fs.readFileSync('app/admin/operations/tasks/page.tsx', 'utf8');

const isCRLF = code.includes('\r\n');
const newline = isCRLF ? '\r\n' : '\n';

// 1. Add FileText, Link, Globe, ExternalLink, Calendar, DollarSign if missing in lucide-react import
if (!code.includes('DollarSign')) {
  code = code.replace(
    '  UploadCloud,',
    `  UploadCloud,\n  DollarSign,\n  FileCode,\n  Globe,\n  UserCheck,`
  );
}

// 2. Add PROJECT_CURRENCIES definition before OperationTask type
const currenciesConst = `export const PROJECT_CURRENCIES = [
  { code: "INR", symbol: "₹", name: "INR (₹) - Indian Rupee" },
  { code: "USD", symbol: "$", name: "USD ($) - US Dollar" },
  { code: "GBP", symbol: "£", name: "GBP (£) - British Pound" },
  { code: "EUR", symbol: "€", name: "EUR (€) - Euro" },
  { code: "AED", symbol: "د.إ", name: "AED (د.إ) - UAE Dirham" },
  { code: "CAD", symbol: "$", name: "CAD ($) - Canadian Dollar" },
  { code: "AUD", symbol: "$", name: "AUD ($) - Australian Dollar" },
];

export function getCurrencySymbol(code?: string | null) {
  if (!code) return "₹";
  const match = PROJECT_CURRENCIES.find((c) => c.code.toUpperCase() === code.toUpperCase());
  return match ? match.symbol : code;
}
`;

if (!code.includes('PROJECT_CURRENCIES')) {
  code = code.replace('export type TaskStatus =', `${currenciesConst}\nexport type TaskStatus =`);
}

// 3. Update OperationTask type with project fields
const oldTaskType = `export type OperationTask = {
  id: number;
  title: string;
  created_by?: number | string | null;`;

const newTaskType = `export type OperationTask = {
  id: number;
  title: string;
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
  created_by?: number | string | null;`;

if (code.includes(oldTaskType)) {
  code = code.replace(oldTaskType, newTaskType);
}

// 4. Update formatPriceDisplay
const oldFormatPrice = `  const formatPriceDisplay = useCallback((price: number | string | null | undefined) => {
    if (isStaffViewer) return "★★★★★";
    const num = typeof price === "number" ? price : parseFloat(String(price || 0));
    return \`₹\${num.toLocaleString("en-IN")}\`;
  }, [isStaffViewer]);`;

const newFormatPrice = `  const formatPriceDisplay = useCallback((price: number | string | null | undefined, currencyCode?: string | null) => {
    if (isStaffViewer) return "★★★★★";
    const num = typeof price === "number" ? price : parseFloat(String(price || 0));
    const sym = getCurrencySymbol(currencyCode);
    return \`\${sym}\${num.toLocaleString("en-IN")}\`;
  }, [isStaffViewer]);`;

if (code.includes(oldFormatPrice)) {
  code = code.replace(oldFormatPrice, newFormatPrice);
}

// 5. Add new Project Form state variables
const oldFormStates = `  const [formPenaltyPoints, setFormPenaltyPoints] = useState("10");`;
const newFormStates = `  const [formPenaltyPoints, setFormPenaltyPoints] = useState("10");

  // Project Specific Form States
  const [formProjectFor, setFormProjectFor] = useState<"own_company" | "client">("own_company");
  const [formCompanyName, setFormCompanyName] = useState<string>("EduBird");
  const [formStartDate, setFormStartDate] = useState<string>("");
  const [formDueDate, setFormDueDate] = useState<string>("");
  const [formCurrency, setFormCurrency] = useState<string>("INR");
  const [formCost, setFormCost] = useState<string>("0");
  const [formLiveUrl, setFormLiveUrl] = useState<string>("");
  const [formDemoUrl, setFormDemoUrl] = useState<string>("");
  const [formProjectLeaderId, setFormProjectLeaderId] = useState<string>("none");
  const [formProjectLeaderName, setFormProjectLeaderName] = useState<string>("");
  const [formAgreementDocUrl, setFormAgreementDocUrl] = useState<string>("");
  const [formAgreementDocName, setFormAgreementDocName] = useState<string>("");
  const [uploadingAgreement, setUploadingAgreement] = useState<boolean>(false);

  const handleUploadAgreement = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validExts = [".pdf", ".doc", ".docx"];
    const fileNameLower = file.name.toLowerCase();
    const hasValidExt = validExts.some((ext) => fileNameLower.endsWith(ext));

    if (!hasValidExt) {
      toast.error("Please upload a PDF or Word file (.pdf, .doc, .docx)");
      return;
    }

    setUploadingAgreement(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("documentType", "agreement");

      const res = await fetch("/api/admin/uploads/documents", {
        method: "POST",
        body: formData,
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to upload document");

      const url = result.data?.url || result.url;
      setFormAgreementDocUrl(url);
      setFormAgreementDocName(file.name);
      toast.success("Agreement document uploaded successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload agreement document");
    } finally {
      setUploadingAgreement(false);
    }
  };`;

if (code.includes(oldFormStates) && !code.includes('formProjectFor')) {
  code = code.replace(oldFormStates, newFormStates);
}

// 6. Update handleOpenCreateTask
const oldOpenCreate = `  const handleOpenCreateTask = () => {
    setEditingTask(null);
    setFormTitle("");
    const initialInstId = isPlatformRoute
      ? "none"
      : ((orgFilter && orgFilter !== "all" && orgFilter !== "none")
          ? orgFilter
          : (activeInstitutionId ? String(activeInstitutionId) : (institutions[0]?.id ? String(institutions[0].id) : "none")));
    setFormInstitutionId(initialInstId);
    void fetchStaffForModal(initialInstId);
    setFormClientId("none");
    setFormClientName("");
    setClientSearchQuery("");
    setClientDropdownOpen(false);
    const defaultStaffId = isStaffRole && user?.id ? String(user.id) : "none";
    const defaultStaffName = isStaffRole && user?.full_name ? user.full_name : "";
    const defaultStaffRole = isStaffRole ? ((user as any)?.role || (user as any)?.primary_role || "Staff") : "";
    setFormAssignedStaffId(defaultStaffId);
    setFormAssignedStaffName(defaultStaffName);
    setFormAssignedStaffRole(defaultStaffRole);
    setFormAssignedStaffIds(isStaffRole && user?.id ? [String(user.id)] : []);
    setStaffSearchQuery("");
    setStaffDropdownOpen(false);
    setFormDetails("");
    setFormIsDailyRecurring(false);
    setFormPoints("20");
    setFormPenaltyPoints("10");
    setTaskDialogOpen(true);
  };`;

const newOpenCreate = `  const handleOpenCreateTask = () => {
    setEditingTask(null);
    setFormTitle("");
    const initialInstId = isPlatformRoute
      ? "none"
      : ((orgFilter && orgFilter !== "all" && orgFilter !== "none")
          ? orgFilter
          : (activeInstitutionId ? String(activeInstitutionId) : (institutions[0]?.id ? String(institutions[0].id) : "none")));
    setFormInstitutionId(initialInstId);
    void fetchStaffForModal(initialInstId);
    setFormProjectFor("own_company");
    setFormCompanyName("EduBird");
    setFormClientId("none");
    setFormClientName("EduBird");
    setClientSearchQuery("");
    setClientDropdownOpen(false);
    setFormStartDate("");
    setFormDueDate("");
    setFormCurrency("INR");
    setFormCost("0");
    setFormLiveUrl("");
    setFormDemoUrl("");
    setFormProjectLeaderId("none");
    setFormProjectLeaderName("");
    setFormAgreementDocUrl("");
    setFormAgreementDocName("");
    const defaultStaffId = isStaffRole && user?.id ? String(user.id) : "none";
    const defaultStaffName = isStaffRole && user?.full_name ? user.full_name : "";
    const defaultStaffRole = isStaffRole ? ((user as any)?.role || (user as any)?.primary_role || "Staff") : "";
    setFormAssignedStaffId(defaultStaffId);
    setFormAssignedStaffName(defaultStaffName);
    setFormAssignedStaffRole(defaultStaffRole);
    setFormAssignedStaffIds(isStaffRole && user?.id ? [String(user.id)] : []);
    setStaffSearchQuery("");
    setStaffDropdownOpen(false);
    setFormDetails("");
    setFormIsDailyRecurring(false);
    setFormPoints("20");
    setFormPenaltyPoints("10");
    setTaskDialogOpen(true);
  };`;

if (code.includes(oldOpenCreate)) {
  code = code.replace(oldOpenCreate, newOpenCreate);
}

// 7. Update handleOpenEditTask
const oldOpenEdit = `  const handleOpenEditTask = (t: OperationTask) => {
    setEditingTask(t);
    setFormTitle(t.title || "");
    const initialInstId = isPlatformRoute
      ? "none"
      : (t.institution_id ? String(t.institution_id) : (activeInstitutionId ? String(activeInstitutionId) : "none"));
    setFormInstitutionId(initialInstId);
    void fetchStaffForModal(initialInstId);
    setFormClientId(t.client_id ? String(t.client_id) : "none");
    setFormClientName(t.client_name || "");
    setClientSearchQuery("");
    setClientDropdownOpen(false);
    setFormAssignedStaffId(t.assigned_employee_id ? String(t.assigned_employee_id) : "none");
    setFormAssignedStaffName(t.assigned_employee_name || "");
    setFormAssignedStaffRole(t.assigned_employee_role || "");
    if (Array.isArray(t.assigned_employees) && t.assigned_employees.length > 0) {
      setFormAssignedStaffIds(t.assigned_employees.map((e) => String(e.id)));
    } else if (t.assigned_employee_id) {
      setFormAssignedStaffIds([String(t.assigned_employee_id)]);
    } else {
      setFormAssignedStaffIds([]);
    }
    setStaffSearchQuery("");
    setStaffDropdownOpen(false);
    setFormDetails(t.details || "");
    setFormIsDailyRecurring(Boolean(t.is_daily_recurring));
    setFormPoints(t.points !== undefined ? String(t.points) : "20");
    setFormPenaltyPoints(t.penalty_points !== undefined ? String(t.penalty_points) : "10");
    setTaskDialogOpen(true);
  };`;

const newOpenEdit = `  const handleOpenEditTask = (t: OperationTask) => {
    setEditingTask(t);
    setFormTitle(t.title || "");
    const initialInstId = isPlatformRoute
      ? "none"
      : (t.institution_id ? String(t.institution_id) : (activeInstitutionId ? String(activeInstitutionId) : "none"));
    setFormInstitutionId(initialInstId);
    void fetchStaffForModal(initialInstId);
    setFormProjectFor(t.project_for === "client" ? "client" : "own_company");
    setFormCompanyName(t.company_name || (t.project_for === "client" ? "" : "EduBird"));
    setFormClientId(t.client_id ? String(t.client_id) : "none");
    setFormClientName(t.client_name || "");
    setClientSearchQuery("");
    setClientDropdownOpen(false);
    setFormStartDate(t.start_date ? t.start_date.substring(0, 10) : "");
    setFormDueDate(t.deadline ? t.deadline.substring(0, 10) : "");
    setFormCurrency(t.currency || "INR");
    setFormCost(t.cost !== undefined && t.cost !== null ? String(t.cost) : (t.price ? String(t.price) : "0"));
    setFormLiveUrl(t.live_url || "");
    setFormDemoUrl(t.demo_url || "");
    setFormProjectLeaderId(t.project_leader_id ? String(t.project_leader_id) : "none");
    setFormProjectLeaderName(t.project_leader_name || "");
    setFormAgreementDocUrl(t.agreement_document_url || "");
    setFormAgreementDocName(t.agreement_document_name || "");
    setFormAssignedStaffId(t.assigned_employee_id ? String(t.assigned_employee_id) : "none");
    setFormAssignedStaffName(t.assigned_employee_name || "");
    setFormAssignedStaffRole(t.assigned_employee_role || "");
    if (Array.isArray(t.assigned_employees) && t.assigned_employees.length > 0) {
      setFormAssignedStaffIds(t.assigned_employees.map((e) => String(e.id)));
    } else if (t.assigned_employee_id) {
      setFormAssignedStaffIds([String(t.assigned_employee_id)]);
    } else {
      setFormAssignedStaffIds([]);
    }
    setStaffSearchQuery("");
    setStaffDropdownOpen(false);
    setFormDetails(t.details || "");
    setFormIsDailyRecurring(Boolean(t.is_daily_recurring));
    setFormPoints(t.points !== undefined ? String(t.points) : "20");
    setFormPenaltyPoints(t.penalty_points !== undefined ? String(t.penalty_points) : "10");
    setTaskDialogOpen(true);
  };`;

if (code.includes(oldOpenEdit)) {
  code = code.replace(oldOpenEdit, newOpenEdit);
}

// 8. Update handleSaveMainTask body
const oldSavePayload = `        body: JSON.stringify({
          id: editingTask?.id,
          title: formTitle.trim(),
          institution_id: isPlatformRoute ? null : (formInstitutionId !== "none" && formInstitutionId !== "all" ? parseInt(formInstitutionId) : null),
          client_id: isInstitutionAdmin ? null : (formClientId !== "none" ? formClientId : null),
          client_name: isInstitutionAdmin ? null : (formClientName.trim() || null),
          assigned_employees: selectedStaffObjects,
          assigned_employee_id: primaryStaffId,
          assigned_employee_name: combinedStaffNames,
          assigned_employee_role: combinedStaffRoles,
          details: formDetails.trim() || null,
          is_daily_recurring: formIsDailyRecurring,
          points: parseFloat(formPoints) || 20,
          penalty_points: parseFloat(formPenaltyPoints) || 10,
          sub_tasks: editingTask?.sub_tasks || [],
        }),`;

const newSavePayload = `        body: JSON.stringify({
          id: editingTask?.id,
          title: formTitle.trim(),
          project_for: formProjectFor,
          company_name: formProjectFor === "own_company" ? "EduBird" : formCompanyName,
          institution_id: isPlatformRoute ? null : (formInstitutionId !== "none" && formInstitutionId !== "all" ? parseInt(formInstitutionId) : null),
          client_id: isInstitutionAdmin || formProjectFor === "own_company" ? null : (formClientId !== "none" ? formClientId : null),
          client_name: formProjectFor === "own_company" ? "EduBird" : (isInstitutionAdmin ? null : (formClientName.trim() || null)),
          start_date: formStartDate || null,
          due_date: formDueDate || null,
          deadline: formDueDate || null,
          currency: formCurrency || "INR",
          cost: parseFloat(formCost) || 0,
          price: parseFloat(formCost) || 0,
          live_url: formLiveUrl.trim() || null,
          demo_url: formDemoUrl.trim() || null,
          project_leader_id: formProjectLeaderId !== "none" ? parseInt(formProjectLeaderId) : null,
          project_leader_name: formProjectLeaderName.trim() || null,
          agreement_document_url: formAgreementDocUrl || null,
          agreement_document_name: formAgreementDocName || null,
          assigned_employees: selectedStaffObjects,
          assigned_employee_id: primaryStaffId,
          assigned_employee_name: combinedStaffNames,
          assigned_employee_role: combinedStaffRoles,
          details: formDetails.trim() || null,
          is_daily_recurring: formIsDailyRecurring,
          points: parseFloat(formPoints) || 20,
          penalty_points: parseFloat(formPenaltyPoints) || 10,
          sub_tasks: editingTask?.sub_tasks || [],
        }),`;

if (code.includes(oldSavePayload)) {
  code = code.replace(oldSavePayload, newSavePayload);
}

// 9. Replace Header Button: "+ Create Task / Project" -> "+ Create Project"
code = code.replace(
  '<Plus className="w-4 h-4" /> Create Task / Project',
  '<Plus className="w-4 h-4" /> Create Project'
);
code = code.replace(
  '<Plus className="w-4 h-4 mr-1.5" /> Create Task / Project',
  '<Plus className="w-4 h-4 mr-1.5" /> Create Project'
);

fs.writeFileSync('app/admin/operations/tasks/page.tsx', code, 'utf8');
console.log('Finished updating backend bindings & states in page.tsx');

