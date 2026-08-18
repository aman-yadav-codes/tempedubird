"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import {
  AlertCircle,
  AlertTriangle,
  Code2,
  Copy,
  Download,
  FileText,
  ImageIcon,
  ListTree,
  Loader2,
  MoreHorizontal,
  Plus,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import {
  TemplateResizableHandle,
  TemplateResizablePanel,
  TemplateResizablePanelGroup,
} from "@/components/card-templates/template-resizable";
import { AsyncSearchPopover } from "@/components/shared/async-search-popover";
import { DatePicker } from "@/components/shared/date-picker";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type {
  DocumentTemplateField,
  DocumentTemplateRow,
} from "@/lib/types/document-template";
import { DOCUMENT_FIELD_TYPES } from "@/lib/types/document-template";
import type { DocumentTemplateFieldMapping } from "@/lib/card-templates/field-mapping";
import { cleanTemplateAddressValue } from "@/lib/card-templates/address";
import type { TemplateCanvasExport } from "@/components/card-templates/template-canvas-preview";
import { renderTemplateHtmlToPng } from "@/components/card-templates/render-template-preview";
import {
  ACTIVE_ACADEMIC_SESSION_EVENT,
  getStoredActiveAcademicSessions,
  type ActiveAcademicSession,
} from "@/lib/auth/active-academic-session";

const TemplateCanvasPreview = dynamic(
  () => import("@/components/card-templates/template-canvas-preview"),
  { ssr: false }
);

type CardTemplateTryoutProps = {
  template: DocumentTemplateRow;
  accessToken: string | null;
  isInstitutionTryout?: boolean;
  institutionId?: number | null;
  canEditTemplate?: boolean;
  onTemplateUpdated?: (template: DocumentTemplateRow) => void;
  initialStudentId?: number | string | null;
  initialStudentName?: string | null;
  initialFieldValues?: Record<string, string>;
  lockStudentSelection?: boolean;
};

type FieldMappingPayload = {
  mappings: DocumentTemplateFieldMapping[];
};

type DefaultsPayload = {
  fieldValues?: Record<string, string>;
  autoGenerateFields?: string[];
};

type StudentOption = {
  id: number;
  name: string;
  email: string | null;
  phone?: string | null;
  admission_number: string | null;
  institution_id: number;
  institution_name: string | null;
  program_name: string | null;
  section_name: string | null;
  role_code?: string | null;
  role_name?: string | null;
  is_profile_complete: boolean;
};

type DuplicateSavePrompt = {
  title: string;
  description: string;
  actionLabel: string;
};

function getCurrentTryoutSession(sessions: ActiveAcademicSession[]) {
  if (!sessions.length) return null;
  const defaultAcademicYearId = sessions.find((session) => session.institutionDefaultAcademicYearId)
    ?.institutionDefaultAcademicYearId;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    sessions.find((session) => session.id === defaultAcademicYearId) ??
    sessions.find((session) => {
      const start = new Date(session.startDate);
      const end = new Date(session.endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      return start <= today && today <= end;
    }) ??
    [...sessions]
      .filter((session) => {
        const start = new Date(session.startDate);
        start.setHours(0, 0, 0, 0);
        return start <= today;
      })
      .sort((left, right) => new Date(right.startDate).getTime() - new Date(left.startDate).getTime())[0] ??
    sessions[0] ??
    null
  );
}

type TemplateFieldEditorMode = "edit" | "add";

const FIELD_NAME_PATTERN = /^[a-z][a-zA-Z0-9]*$/;

function cloneTemplateField(field: DocumentTemplateField): DocumentTemplateField {
  return {
    ...field,
    preparation: field.preparation ? { ...field.preparation } : undefined,
  };
}

function createDraftField(sortOrder: number): DocumentTemplateField {
  return {
    field_name: "",
    label: "",
    field_type: "text",
    is_required: true,
    sort_order: sortOrder,
    preparation: {
      is_mapped: false,
      has_default: false,
      needs_action: true,
      source_field_label: null,
    },
  };
}

function validateTemplateField(
  field: DocumentTemplateField,
  fields: DocumentTemplateField[],
  currentIndex: number | null
) {
  const fieldName = field.field_name.trim();
  const label = field.label.trim();
  if (!FIELD_NAME_PATTERN.test(fieldName)) {
    return "Field name must start with a lowercase letter and use only letters or numbers.";
  }
  if (!label) return "Label is required.";
  if (!DOCUMENT_FIELD_TYPES.includes(field.field_type)) {
    return "Select a valid field type.";
  }
  const duplicate = fields.some(
    (candidate, index) =>
      index !== currentIndex && candidate.field_name.trim() === fieldName
  );
  if (duplicate) return `A field named ${fieldName} already exists.`;
  return null;
}

function normalizeTemplateField(field: DocumentTemplateField): DocumentTemplateField {
  return {
    ...field,
    field_name: field.field_name.trim(),
    label: field.label.trim(),
    sort_order: Number.isInteger(Number(field.sort_order))
      ? Number(field.sort_order)
      : 0,
    preparation: field.preparation
      ? {
          is_mapped: Boolean(field.preparation.is_mapped),
          has_default: Boolean(field.preparation.has_default),
          needs_action: Boolean(field.preparation.needs_action),
          source_field_label:
            field.preparation.source_field_label?.trim() || null,
        }
      : undefined,
  };
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function numberFromValue(value: string | undefined) {
  const parsed = Number(String(value ?? "").replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatComputedNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function formatInvoiceNumber(value: number) {
  if (!Number.isFinite(value)) return "";
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value);
}

function numberToIndianWords(value: number) {
  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];
  const whole = Math.max(0, Math.round(Number(value) || 0));

  function underHundred(amount: number) {
    if (amount < 20) return ones[amount];
    return [tens[Math.floor(amount / 10)], ones[amount % 10]].filter(Boolean).join(" ");
  }

  function underThousand(amount: number) {
    const hundred = Math.floor(amount / 100);
    const rest = amount % 100;
    return [
      hundred ? `${ones[hundred]} Hundred` : "",
      rest ? underHundred(rest) : "",
    ].filter(Boolean).join(" ");
  }

  if (!whole) return "Zero Only";
  const crores = Math.floor(whole / 10000000);
  const lakhs = Math.floor((whole % 10000000) / 100000);
  const thousands = Math.floor((whole % 100000) / 1000);
  const rest = whole % 1000;
  return [
    crores ? `${underThousand(crores)} Crore` : "",
    lakhs ? `${underThousand(lakhs)} Lakh` : "",
    thousands ? `${underThousand(thousands)} Thousand` : "",
    rest ? underThousand(rest) : "",
    "Only",
  ].filter(Boolean).join(" ");
}

function gradeFromPercentage(percentage: number) {
  const rounded = Math.round(percentage);
  if (rounded >= 91) return "A1";
  if (rounded >= 81) return "A2";
  if (rounded >= 71) return "B1";
  if (rounded >= 61) return "B2";
  if (rounded >= 51) return "C1";
  if (rounded >= 41) return "C2";
  if (rounded >= 33) return "D";
  return "E";
}

function firstNameFromValue(value: string | undefined) {
  const firstName = String(value ?? "").trim().split(/\s+/)[0] ?? "";
  if (!firstName || firstName.startsWith("{{")) return "Student";
  return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
}

function isHiddenTemplateValue(value: string | undefined) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return (
    normalized === "na" ||
    normalized === "n/a" ||
    normalized === "null" ||
    normalized === "-"
  );
}

function hasTemplateValue(value: string | undefined) {
  const normalized = String(value ?? "").trim();
  return Boolean(normalized) && !normalized.startsWith("{{") && !isHiddenTemplateValue(normalized);
}

function isBlankSubjectName(value: string | undefined) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return !normalized || normalized.startsWith("{{") || isHiddenTemplateValue(value);
}

function templateInputType(fieldType: string) {
  return fieldType === "number" ? "text" : fieldType;
}

function subjectFieldIndex(fieldName: string) {
  const match = fieldName.match(/^subject(\d+)(Name|MaxMarks|MarksObtained|Grade|Percentage)$/i);
  return match ? Number(match[1]) : null;
}

function replaceElementContentById(html: string, id: string, content: string) {
  const pattern = new RegExp(
    `(<([a-zA-Z][\\w:-]*)(?=[^>]*\\bid=["']${escapeRegExp(id)}["'])[^>]*>)([\\s\\S]*?)(<\\/\\2>)`,
    "g"
  );
  return html.replace(pattern, `$1${content}$4`);
}

function replaceFirstElementContentByClass(html: string, className: string, content: string) {
  const pattern = new RegExp(
    `(<([a-zA-Z][\\w:-]*)(?=[^>]*\\bclass=["'][^"']*\\b${escapeRegExp(className)}\\b[^"']*["'])[^>]*>)([\\s\\S]*?)(<\\/\\2>)`
  );
  return html.replace(pattern, `$1${content}$4`);
}

function appendInlineStyleToElementById(html: string, id: string, style: string) {
  const pattern = new RegExp(
    `<([a-zA-Z][\\w:-]*)(?=[^>]*\\bid=["']${escapeRegExp(id)}["'])([^>]*)>`,
    "g"
  );
  return html.replace(pattern, (match, tagName: string, attrs: string) => {
    if (/\sstyle=["'][^"']*["']/.test(attrs)) {
      return `<${tagName}${attrs.replace(/\sstyle=(["'])([^"']*)\1/, ` style=$1$2; ${style}$1`)}>`;
    }
    return `<${tagName}${attrs} style="${style}">`;
  });
}

function appendInlineStyleToFirstElementByClass(html: string, className: string, style: string) {
  const pattern = new RegExp(
    `<([a-zA-Z][\\w:-]*)(?=[^>]*\\bclass=["'][^"']*\\b${escapeRegExp(className)}\\b[^"']*["'])([^>]*)>`
  );
  return html.replace(pattern, (match, tagName: string, attrs: string) => {
    if (/\sstyle=["'][^"']*["']/.test(attrs)) {
      return `<${tagName}${attrs.replace(/\sstyle=(["'])([^"']*)\1/, ` style=$1$2; ${style}$1`)}>`;
    }
    return `<${tagName}${attrs} style="${style}">`;
  });
}

function injectResultCardLayoutFixes(html: string) {
  const css = `
    .footer {
      grid-template-columns: auto minmax(0, auto) 1px auto !important;
      justify-content: center !important;
      justify-items: center !important;
      text-align: center !important;
    }
    .quote-footer { text-align: center !important; }
    .values-row { justify-content: center !important; }
  `;
  if (html.includes("data-result-card-fixes")) return html;
  if (html.includes("</style>")) {
    return html.replace("</style>", `${css}\n    /* data-result-card-fixes */\n  </style>`);
  }
  return html.replace("</head>", `<style data-result-card-fixes>${css}</style></head>`);
}

function formatPercentageText(value: string | undefined) {
  if (isHiddenTemplateValue(value)) return "";
  const text = String(value ?? "").trim();
  if (!text) return "";
  return text.endsWith("%") ? text : `${text}%`;
}

function visibleSubjectIndexes(values: Record<string, string>) {
  const indexes: number[] = [];
  for (let index = 1; index <= 20; index += 1) {
    const maxMarks = numberFromValue(values[`subject${index}MaxMarks`]);
    const marksObtained = numberFromValue(values[`subject${index}MarksObtained`]);
    if (!isBlankSubjectName(values[`subject${index}Name`]) && maxMarks > 0 && marksObtained >= 0) {
      indexes.push(index);
    }
  }
  return indexes;
}

function buildComputedResultValues(values: Record<string, string>) {
  let totalMaxMarks = 0;
  let totalMarksObtained = 0;
  const computed: Record<string, string> = {};

  for (const index of visibleSubjectIndexes(values)) {
    const maxMarks = numberFromValue(values[`subject${index}MaxMarks`]);
    const marksObtained = numberFromValue(values[`subject${index}MarksObtained`]);
    totalMaxMarks += maxMarks;
    totalMarksObtained += marksObtained;
    computed[`subject${index}Percentage`] = `${Math.round((marksObtained / maxMarks) * 100)}%`;
  }

  const percentageValue = totalMaxMarks > 0 ? (totalMarksObtained / totalMaxMarks) * 100 : 0;
  const percentage = totalMaxMarks > 0 ? `${percentageValue.toFixed(2)}%` : "";
  const overallGrade = totalMaxMarks > 0 ? gradeFromPercentage(percentageValue) : "";
  const studentFirstName = firstNameFromValue(values.studentName);

  return {
    ...computed,
    totalMaxMarks: totalMaxMarks > 0 ? formatComputedNumber(totalMaxMarks) : "",
    totalMarksObtained: totalMaxMarks > 0 ? formatComputedNumber(totalMarksObtained) : "",
    percentage,
    overallPercentage: percentage,
    overallGrade,
    remarks:
      values.remarks?.trim() ||
      `${studentFirstName} has shown excellent academic performance.<br />Keep up the good work and continue to excel!`,
  };
}

function hideUnusedSubjectRows(html: string, values: Record<string, string>) {
  let subjectIndex = 0;
  return html.replace(
    /<tr\b(?=[^>]*\bclass=["'][^"']*\bsubject-row\b[^"']*["'])[^>]*>[\s\S]*?<\/tr>/g,
    (rowHtml) => {
      subjectIndex += 1;
      return isBlankSubjectName(values[`subject${subjectIndex}Name`])
        ? ""
        : rowHtml;
    }
  );
}

function applyComputedResultFields(html: string, values: Record<string, string>) {
  const computed = buildComputedResultValues(values);
  const visibleIndexes = visibleSubjectIndexes(values);
  let result = injectResultCardLayoutFixes(hideUnusedSubjectRows(html, values));

  for (const [key, value] of Object.entries(computed)) {
    result = result.replaceAll(`{{${key}}}`, key === "remarks" ? value : escapeHtml(value));
  }

  result = replaceElementContentById(result, "totalMaxMarksVal", escapeHtml(computed.totalMaxMarks));
  result = replaceElementContentById(result, "totalMarksObtainedVal", escapeHtml(computed.totalMarksObtained));
  result = replaceElementContentById(result, "overallGradeVal", escapeHtml(computed.overallGrade));
  result = replaceElementContentById(result, "summaryPercentageVal", escapeHtml(computed.percentage));
  result = replaceElementContentById(result, "overallPercentageVal", escapeHtml(computed.overallPercentage));
  result = replaceElementContentById(
    result,
    "attendancePercentageVal",
    escapeHtml(formatPercentageText(values.attendancePercentage))
  );

  for (let index = 1; index <= 20; index += 1) {
    result = replaceElementContentById(
      result,
      `subject${index}PercentVal`,
      !visibleIndexes.includes(index)
        ? ""
        : escapeHtml(computed[`subject${index}Percentage`] ?? "")
    );
    if (!visibleIndexes.includes(index)) {
      result = appendInlineStyleToElementById(result, `subject${index}PercentVal`, "display: none;");
    }
  }

  if (visibleIndexes.length > 0) {
    const colors = ["#2f80c8", "#7bb35f", "#f8a019", "#f45c54", "#58a7c7", "#7964bd", "#2f80c8"];
    const angleStep = 360 / visibleIndexes.length;
    const gradientParts = visibleIndexes.map((_, index) => {
      const startAngle = index * angleStep;
      const endAngle = (index + 1) * angleStep;
      return `${colors[index % colors.length]} ${startAngle}deg ${endAngle}deg`;
    });
    result = appendInlineStyleToFirstElementByClass(
      result,
      "donut-wrap",
      `background: conic-gradient(${gradientParts.join(", ")});`
    );
    visibleIndexes.forEach((subjectIndex, visibleIndex) => {
      const midAngle = visibleIndex * angleStep + angleStep / 2;
      const midAngleRad = (midAngle - 90) * (Math.PI / 180);
      const x = 126 + 86 * Math.cos(midAngleRad);
      const y = 126 + 86 * Math.sin(midAngleRad);
      result = appendInlineStyleToElementById(
        result,
        `subject${subjectIndex}PercentVal`,
        `display: block; left: ${x.toFixed(1)}px; top: ${y.toFixed(1)}px;`
      );
    });
  }

  return replaceFirstElementContentByClass(result, "remarks-text", computed.remarks);
}

function invoiceFieldIndex(fieldName: string) {
  const match = fieldName.match(/^feeItem(\d+)(Name|Amount)$/i);
  return match ? Number(match[1]) : null;
}

function isBlankInvoiceValue(value: string | undefined) {
  const normalized = String(value ?? "").trim();
  return !normalized || normalized.startsWith("{{") || isHiddenTemplateValue(normalized);
}

function visibleFeeItemIndexes(values: Record<string, string>) {
  const indexes: number[] = [];
  for (let index = 1; index <= 20; index += 1) {
    const name = values[`feeItem${index}Name`];
    const amount = values[`feeItem${index}Amount`];
    if (!isBlankInvoiceValue(name) && !isBlankInvoiceValue(amount) && numberFromValue(amount) > 0) {
      indexes.push(index);
    }
  }
  return indexes;
}

function removeElementsContainingPlaceholder(html: string, placeholder: string) {
  const escaped = escapeRegExp(placeholder);
  const removablePatterns = [
    new RegExp(
      `<div\\b[^>]*class=["']label["'][^>]*>[\\s\\S]*?<\\/div>\\s*<div\\b[^>]*class=["']colon["'][^>]*>[\\s\\S]*?<\\/div>\\s*<div\\b[^>]*class=["']value["'][^>]*>[\\s\\S]*?${escaped}[\\s\\S]*?<\\/div>`,
      "gi"
    ),
    new RegExp(`<tr\\b[^>]*>[\\s\\S]*?${escaped}[\\s\\S]*?<\\/tr>`, "gi"),
    new RegExp(`<li\\b[^>]*>[\\s\\S]*?${escaped}[\\s\\S]*?<\\/li>`, "gi"),
    new RegExp(`<p\\b[^>]*>[\\s\\S]*?${escaped}[\\s\\S]*?<\\/p>`, "gi"),
  ];
  return removablePatterns.reduce((result, pattern) => result.replace(pattern, ""), html);
}

function hideUnusedInvoiceRows(html: string, values: Record<string, string>) {
  let result = html;
  const visibleIndexes = visibleFeeItemIndexes(values);
  for (let index = 1; index <= 20; index += 1) {
    if (!visibleIndexes.includes(index)) {
      result = removeElementsContainingPlaceholder(result, `{{feeItem${index}Name}}`);
      result = removeElementsContainingPlaceholder(result, `{{feeItem${index}Amount}}`);
    }
  }

  for (let index = 1; index <= 20; index += 1) {
    if (isBlankInvoiceValue(values[`note${index}`])) {
      result = removeElementsContainingPlaceholder(result, `{{note${index}}}`);
    }
  }

  return result;
}

function buildComputedInvoiceValues(values: Record<string, string>) {
  const totalFee = visibleFeeItemIndexes(values).reduce(
    (sum, index) => sum + numberFromValue(values[`feeItem${index}Amount`]),
    0
  );
  const explicitTotal = numberFromValue(values.totalFee);
  const subtotal = totalFee || explicitTotal || numberFromValue(values.subtotalAmount);
  const concessionPercent = numberFromValue(
    values.concessionPercent ?? values.discountPercent ?? values.concession
  );
  const explicitConcession = numberFromValue(values.concessionAmount ?? values.discountAmount);
  const concessionAmount =
    explicitConcession > 0
      ? explicitConcession
      : concessionPercent > 0
        ? (subtotal * concessionPercent) / 100
        : 0;
  const netAmountPayable = Math.max(
    0,
    numberFromValue(values.netAmountPayable) || subtotal - concessionAmount
  );
  const paymentAmount =
    numberFromValue(values.paymentAmount) ||
    numberFromValue(values.totalAmount) ||
    numberFromValue(values.paidAmount) ||
    netAmountPayable;
  const amountWords =
    isBlankInvoiceValue(values.paymentAmountWords)
      ? numberToIndianWords(paymentAmount)
      : values.paymentAmountWords.trim();

  return {
    totalFee: formatInvoiceNumber(subtotal),
    subtotalAmount: formatInvoiceNumber(subtotal),
    concessionPercent: formatComputedNumber(concessionPercent),
    discountPercent: formatComputedNumber(concessionPercent),
    concessionAmount: formatInvoiceNumber(concessionAmount),
    discountAmount: formatInvoiceNumber(concessionAmount),
    netAmountPayable: formatInvoiceNumber(netAmountPayable),
    paymentAmount: formatInvoiceNumber(paymentAmount),
    paidAmount: formatInvoiceNumber(paymentAmount),
    totalAmount: formatInvoiceNumber(paymentAmount),
    paymentAmountWords: amountWords,
  };
}

function injectInvoiceLayoutFixes(html: string) {
  if (html.includes("data-invoice-template-fixes")) return html;
  const css = `
    [data-invoice-template-fixes] { display: none; }
    .payment-details, .payment-section, .payment-info { overflow: visible !important; }
    .payment-details table, .payment-section table, .payment-info table { table-layout: fixed !important; }
    .payment-details td, .payment-section td, .payment-info td { vertical-align: top !important; line-height: 1.35 !important; }
    .payment-grid { grid-template-columns: minmax(130px, 150px) 16px minmax(0, 1fr) !important; row-gap: 3px !important; }
    .payment-grid .value { min-width: 0 !important; overflow-wrap: anywhere !important; }
    #paymentAmountWordsVal { font-size: 14px !important; line-height: 1.3 !important; }
    .amount-words, .payment-amount-words, [data-field="paymentAmountWords"] {
      display: block !important;
      max-width: 100% !important;
      overflow-wrap: anywhere !important;
      word-break: normal !important;
      line-height: 1.35 !important;
    }
    .accountant-name, .signatory-name, [data-field="accountantName"], [data-field="authorizedSignatory"] {
      border-top: 0 !important;
      border-bottom: 1px dashed currentColor !important;
      padding-bottom: 2px !important;
      text-decoration: none !important;
    }
    .sig-line { height: 10px !important; margin: 0 0 6px 0 !important; }
    .sign-name { border-bottom: 1px dashed currentColor !important; padding: 0 8px 2px !important; }
  `;
  if (html.includes("</style>")) {
    return html.replace("</style>", `${css}\n    /* data-invoice-template-fixes */\n  </style>`);
  }
  if (html.includes("</head>")) {
    return html.replace("</head>", `<style data-invoice-template-fixes>${css}</style></head>`);
  }
  return `<style data-invoice-template-fixes>${css}</style>${html}`;
}

function applyComputedInvoiceFields(html: string, values: Record<string, string>) {
  const computed = buildComputedInvoiceValues(values);
  let result = injectInvoiceLayoutFixes(hideUnusedInvoiceRows(html, values));

  for (const [key, value] of Object.entries(computed)) {
    const replacement =
      key === "paymentAmountWords"
        ? `<span class="payment-amount-words">${escapeHtml(value)}</span>`
        : escapeHtml(value);
    result = result.replaceAll(`{{${key}}}`, replacement);
  }

  return result;
}

function sampleValue(field: DocumentTemplateField) {
  if (field.field_type === "date") return new Date().toISOString().slice(0, 10);
  if (field.field_type === "number") return "101";
  if (field.field_type === "email") return "student@example.com";
  if (field.field_type === "phone") return "9876543210";
  if (field.field_type === "image") return "";
  return field.label;
}

function getSaveDocumentLabel(template: DocumentTemplateRow) {
  const category = template.category_name.toLowerCase();
  if (category.includes("transfer certificate")) return "TC";
  if (category.includes("id card")) return "ID Card";
  if (category.includes("result")) return "Result";
  return template.category_name || "Document";
}

function isValidImageValue(value: string) {
  if (value.startsWith("data:image/")) return true;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function VerifiedProfileIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="size-6 shrink-0 text-emerald-500 drop-shadow-sm dark:text-emerald-400"
      fill="currentColor"
    >
      <path d="M12 2.25 14.1 4l2.72-.25 1.02 2.54 2.35 1.39-.65 2.65L20.75 12l-1.21 1.67.65 2.65-2.35 1.39-1.02 2.54-2.72-.25L12 21.75 9.9 20l-2.72.25-1.02-2.54-2.35-1.39.65-2.65L3.25 12l1.21-1.67-.65-2.65 2.35-1.39 1.02-2.54L9.9 4 12 2.25Zm4.32 7.17-1.43-1.34-4.13 4.4-1.75-1.75-1.39 1.39 3.18 3.18 5.52-5.88Z" />
    </svg>
  );
}

async function readJson(res: Response) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { error: "Server returned an invalid response" };
  }
}

function applyFieldValues(
  html: string,
  fields: DocumentTemplateField[],
  values: Record<string, string>
) {
  const computedInvoiceValues = buildComputedInvoiceValues(values);
  const htmlWithComputedRows = hideUnusedInvoiceRows(html, values);
  const populatedHtml = fields.reduce((result, field) => {
    const computedValue = computedInvoiceValues[field.field_name as keyof typeof computedInvoiceValues];
    const value = cleanTemplateAddressValue(
      field.field_name,
      field.label,
      computedValue ?? values[field.field_name] ?? ""
    );
    const replacement = isHiddenTemplateValue(value)
      ? ""
      : field.field_name === "paymentAmountWords"
        ? `<span class="payment-amount-words">${escapeHtml(value)}</span>`
        : field.field_type === "image"
          ? value
          : escapeHtml(value);
    return result.replaceAll(`{{${field.field_name}}}`, replacement);
  }, htmlWithComputedRows);
  return applyComputedResultFields(applyComputedInvoiceFields(populatedHtml, values), values);
}

function ImageField({
  field,
  value,
  error,
  onChange,
}: {
  field: DocumentTemplateField;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  function selectFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be 5MB or smaller");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange(String(reader.result));
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Input
          id={`try-${field.field_name}`}
          type="url"
          value={value.startsWith("data:image/") ? "" : value}
          placeholder="Paste image URL"
          onChange={(event) => onChange(event.target.value)}
          className="bg-background"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `try-${field.field_name}-error` : undefined}
        />
        <Button type="button" variant="outline" className="relative shrink-0">
          <Upload className="size-4" />
          Upload
          <input
            type="file"
            accept="image/*"
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label={`Upload ${field.label}`}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) selectFile(file);
              event.currentTarget.value = "";
            }}
          />
        </Button>
      </div>
      {value && (
        <div className="flex h-24 items-center justify-center overflow-hidden rounded-md border bg-muted/30">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="h-full w-full object-contain" />
        </div>
      )}
      {error && (
        <p
          id={`try-${field.field_name}-error`}
          className="text-sm font-medium text-destructive"
        >
          {error}
        </p>
      )}
    </div>
  );
}

export function CardTemplateTryout({
  template,
  accessToken,
  isInstitutionTryout = false,
  institutionId = null,
  canEditTemplate = false,
  onTemplateUpdated,
  initialStudentId = null,
  initialStudentName = null,
  initialFieldValues,
  lockStudentSelection = false,
}: CardTemplateTryoutProps) {
  const [editedTemplate, setEditedTemplate] = useState<DocumentTemplateRow | null>(null);
  const currentTemplate = editedTemplate ?? template;
  const [tryoutAcademicYearId, setTryoutAcademicYearId] = useState<number | null>(null);
  const fields = useMemo(() => currentTemplate.fields ?? [], [currentTemplate.fields]);
  const targetAudience = currentTemplate.category_target_audience === "staff" ? "staff" : "student";
  const recipientLabel = targetAudience === "staff" ? "Staff" : "Student";
  const recipientNoun = targetAudience === "staff" ? "staff member" : "student";
  const saveDocumentLabel = getSaveDocumentLabel(currentTemplate);
  const saveButtonText = `Save ${saveDocumentLabel}`;
  const savingButtonText = `Saving ${saveDocumentLabel}...`;
  const [isMobile, setIsMobile] = useState(false);
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((field) => [field.field_name, isInstitutionTryout ? "" : sampleValue(field)]))
  );
  const [mappings, setMappings] = useState<DocumentTemplateFieldMapping[]>([]);
  const [institutionDefaultFieldNames, setInstitutionDefaultFieldNames] = useState<Set<string>>(
    () => new Set()
  );
  const [mappingLoading, setMappingLoading] = useState(false);
  const [defaultsLoading, setDefaultsLoading] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [studentLoading, setStudentLoading] = useState(false);
  const [canvasImageSrc, setCanvasImageSrc] = useState<string | null>(null);
  const [generatedHtml, setGeneratedHtml] = useState("");
  const [currentCanvasExport, setCurrentCanvasExport] = useState<(() => TemplateCanvasExport | null) | null>(null);
  const [rendering, setRendering] = useState(false);
  const [savingCard, setSavingCard] = useState(false);
  const [duplicateSavePrompt, setDuplicateSavePrompt] = useState<DuplicateSavePrompt | null>(null);
  const [confirmingDuplicateSave, setConfirmingDuplicateSave] = useState(false);
  const [previewActionLoading, setPreviewActionLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [lockedFieldIssues, setLockedFieldIssues] = useState<string[]>([]);
  const [editorMode, setEditorMode] = useState<"code" | "fields" | null>(null);
  const [codeDraft, setCodeDraft] = useState("");
  const [fieldsDraft, setFieldsDraft] = useState<DocumentTemplateField[]>([]);
  const [fieldEditorMode, setFieldEditorMode] = useState<TemplateFieldEditorMode>("edit");
  const [selectedFieldIndex, setSelectedFieldIndex] = useState(0);
  const [newFieldDraft, setNewFieldDraft] = useState<DocumentTemplateField>(() =>
    createDraftField(0)
  );
  const [fieldDraftError, setFieldDraftError] = useState("");
  const [bulkInsertOpen, setBulkInsertOpen] = useState(false);
  const [bulkInsertJson, setBulkInsertJson] = useState("");
  const [bulkInsertError, setBulkInsertError] = useState("");
  const [pendingDeleteFieldIndex, setPendingDeleteFieldIndex] = useState<number | null>(null);
  const [editorSaving, setEditorSaving] = useState(false);
  const isTryoutDataLoading =
    isInstitutionTryout && (mappingLoading || defaultsLoading || studentLoading);
  const isSavingGeneratedDocument = savingCard || confirmingDuplicateSave;
  const isPreviewMenuBusy = isSavingGeneratedDocument || previewActionLoading;
  const selectedDraftField = fieldsDraft[selectedFieldIndex] ?? null;
  const pendingDeleteField =
    pendingDeleteFieldIndex === null ? null : fieldsDraft[pendingDeleteFieldIndex] ?? null;

  const mappedFieldNames = useMemo(
    () => new Set(mappings.map((mapping) => mapping.template_field_name)),
    [mappings]
  );
  const mappingSignature = useMemo(
    () =>
      mappings
        .map((mapping) => `${mapping.template_field_name}:${mapping.source_field_key}:${mapping.fallback_value ?? ""}`)
        .sort()
        .join("|"),
    [mappings]
  );
  const editableFields = useMemo(
    () => isInstitutionTryout
      ? fields.filter(
          (field) => {
            const subjectIndex = subjectFieldIndex(field.field_name);
            const subjectNameValue = subjectIndex
              ? values[`subject${subjectIndex}Name`]
              : undefined;
            const value = values[field.field_name];
            const hasMappedValue =
              mappedFieldNames.has(field.field_name) &&
              (field.field_type === "image"
                ? isHiddenTemplateValue(value) || (hasTemplateValue(value) && isValidImageValue(value))
                : hasTemplateValue(value) || isHiddenTemplateValue(value));
            return (
              !hasMappedValue &&
              !institutionDefaultFieldNames.has(field.field_name) &&
              !isHiddenTemplateValue(value) &&
              !(subjectIndex && field.field_name !== `subject${subjectIndex}Name` && isBlankSubjectName(subjectNameValue))
            );
          }
        )
      : fields,
    [fields, institutionDefaultFieldNames, isInstitutionTryout, mappedFieldNames, values]
  );
  const mappingByFieldName = useMemo(
    () => new Map(mappings.map((mapping) => [mapping.template_field_name, mapping])),
    [mappings]
  );
  const [studentValuesLoadedFor, setStudentValuesLoadedFor] = useState("");

  useEffect(() => {
    if (!isInstitutionTryout || !institutionId) return;
    const update = () => {
      const currentSession = getCurrentTryoutSession(getStoredActiveAcademicSessions(institutionId));
      setTryoutAcademicYearId(currentSession?.id ?? null);
    };
    const timeout = window.setTimeout(update, 0);

    window.addEventListener(ACTIVE_ACADEMIC_SESSION_EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener(ACTIVE_ACADEMIC_SESSION_EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, [institutionId, isInstitutionTryout]);

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 768);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    if (!isInstitutionTryout || !accessToken) return;
    let ignore = false;
    const timeout = window.setTimeout(() => {
      setMappingLoading(true);
      fetch(`/api/admin/master-data/card-templates/${currentTemplate.id}/field-mappings`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
        .then(async (res) => {
          const json = await readJson(res);
          if (!res.ok) throw new Error(json.error ?? "Failed to load mapped fields");
          if (!ignore) setMappings((json.data as FieldMappingPayload)?.mappings ?? []);
        })
        .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load mapped fields"))
        .finally(() => {
          if (!ignore) setMappingLoading(false);
        });
    }, 0);
    return () => {
      ignore = true;
      window.clearTimeout(timeout);
    };
  }, [accessToken, currentTemplate.id, isInstitutionTryout]);

  useEffect(() => {
    if (!isInstitutionTryout || !accessToken) return;
    let ignore = false;
    const timeout = window.setTimeout(() => {
      setDefaultsLoading(true);
      const params = new URLSearchParams();
      if (institutionId) params.set("institutionId", String(institutionId));
      const query = params.toString() ? `?${params.toString()}` : "";
      fetch(`/api/admin/master-data/card-templates/${currentTemplate.id}/defaults${query}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
        .then(async (res) => {
          const json = await readJson(res);
          if (!res.ok) throw new Error(json.error ?? "Failed to load default values");
          if (ignore) return;
          const payload = (json.data ?? {}) as DefaultsPayload;
          const fieldValues = payload.fieldValues ?? {};
          const defaultNames = new Set([
            ...Object.entries(fieldValues)
              .filter(([, value]) => hasTemplateValue(String(value ?? "")) || isHiddenTemplateValue(String(value ?? "")))
              .map(([key]) => key),
            ...(payload.autoGenerateFields ?? []),
          ]);
          setInstitutionDefaultFieldNames(defaultNames);
          setValues((current) => ({
            ...Object.fromEntries(fields.map((field) => [field.field_name, ""])),
            ...current,
            ...fieldValues,
          }));
        })
        .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load default values"))
        .finally(() => {
          if (!ignore) setDefaultsLoading(false);
        });
    }, 0);
    return () => {
      ignore = true;
      window.clearTimeout(timeout);
    };
  }, [accessToken, currentTemplate.id, fields, institutionId, isInstitutionTryout]);

  const fetchStudents = useMemo(
    () => async (search: string) => {
      if (!accessToken) return { data: [], hasMore: false };
      const params = new URLSearchParams({
        action: targetAudience === "staff" ? "staff" : "students",
        search,
      });
      if (institutionId) params.set("institutionId", String(institutionId));
      if (tryoutAcademicYearId) params.set("academicYearId", String(tryoutAcademicYearId));
      const res = await fetch(
        `/api/admin/master-data/card-templates/${currentTemplate.id}/tryout?${params.toString()}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const json = await readJson(res);
      if (!res.ok) {
        throw new Error(json.error ?? `Failed to load ${targetAudience === "staff" ? "staff" : "students"}`);
      }
      return {
        data: (json.data ?? []) as StudentOption[],
        hasMore: Boolean(json.hasMore),
      };
    },
    [accessToken, currentTemplate.id, institutionId, targetAudience, tryoutAcademicYearId]
  );

  async function loadStudentValues(nextStudentId: string) {
    if (!accessToken || !nextStudentId) return;
    setStudentLoading(true);
    try {
      const params = new URLSearchParams({
        action: targetAudience === "staff" ? "staff-values" : "student-values",
      });
      if (targetAudience === "staff") {
        params.set("staffUserId", nextStudentId);
      } else {
        params.set("studentId", nextStudentId);
      }
      if (institutionId) params.set("institutionId", String(institutionId));
      if (tryoutAcademicYearId) params.set("academicYearId", String(tryoutAcademicYearId));
      const res = await fetch(
        `/api/admin/master-data/card-templates/${currentTemplate.id}/tryout?${params.toString()}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? `Failed to load ${recipientNoun} details`);
      const payload = (json.data ?? {}) as {
        sourceValues?: Record<string, string>;
        institutionDefaults?: Record<string, string>;
      };
      const sourceValues = payload.sourceValues ?? {};
      const defaults = payload.institutionDefaults ?? {};
      const defaultNames = new Set(
        Object.entries(defaults)
          .filter(([, entryValue]) => hasTemplateValue(String(entryValue ?? "")) || isHiddenTemplateValue(String(entryValue ?? "")))
          .map(([key]) => key)
      );
      const nextValues = Object.fromEntries(
        fields.map((field) => [field.field_name, defaults[field.field_name] ?? ""])
      );
      for (const field of fields) {
        if (sourceValues[field.field_name] !== undefined) {
          nextValues[field.field_name] = sourceValues[field.field_name] ?? "";
        }
      }
      for (const mapping of mappings) {
        nextValues[mapping.template_field_name] =
          sourceValues[mapping.source_field_key] ?? mapping.fallback_value ?? "";
      }
      setInstitutionDefaultFieldNames(defaultNames);
      const mergedValues = { ...nextValues, ...(initialFieldValues ?? {}) };
      setValues(mergedValues);
      setLockedFieldIssues(getLockedFieldIssues(mergedValues, nextStudentId));
      setStudentValuesLoadedFor(
        `${nextStudentId}:${institutionId ?? ""}:${tryoutAcademicYearId ?? ""}:${mappingSignature}`
      );
      setFieldErrors({});
      setCanvasImageSrc(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to load ${recipientNoun} details`);
    } finally {
      setStudentLoading(false);
    }
  }

  useEffect(() => {
    if (!initialFieldValues) return;
    setValues((current) => ({ ...current, ...initialFieldValues }));
  }, [initialFieldValues]);

  useEffect(() => {
    if (!isInstitutionTryout || !initialStudentId) return;
    const nextStudentId = String(initialStudentId);
    setStudentName(initialStudentName ?? "");
    if (studentId !== nextStudentId) setStudentId(nextStudentId);
    const loadKey = `${nextStudentId}:${institutionId ?? ""}:${tryoutAcademicYearId ?? ""}:${mappingSignature}`;
    if (accessToken && !mappingLoading && !defaultsLoading) {
      if (studentValuesLoadedFor !== loadKey) void loadStudentValues(nextStudentId);
    }
  }, [
    accessToken,
    defaultsLoading,
    institutionId,
    initialStudentId,
    initialStudentName,
    isInstitutionTryout,
    mappingSignature,
    mappingLoading,
    studentId,
    studentValuesLoadedFor,
    tryoutAcademicYearId,
  ]);

  function getLockedFieldIssues(nextValues = values, selectedStudentId = studentId) {
    if (!isInstitutionTryout || !selectedStudentId) return [];
    return fields.flatMap((field) => {
      if (!mappedFieldNames.has(field.field_name)) return [];
      const mapping = mappingByFieldName.get(field.field_name);
      const fieldValue = (nextValues[field.field_name] ?? "").trim();
      const isRequired = field.is_required || field.field_type === "image";
      if (!isRequired) return [];
      if (!fieldValue) {
        return [
          `${mapping?.source_field_label ?? field.label} is missing for ${field.label}`,
        ];
      }
      if (isHiddenTemplateValue(fieldValue)) return [];
      if (field.field_type === "image" && !isValidImageValue(fieldValue)) {
        return [
          `${mapping?.source_field_label ?? field.label} needs a valid image for ${field.label}`,
        ];
      }
      return [];
    });
  }

  async function generatePreview() {
    if (!currentTemplate.html_template) {
      toast.error("This template does not contain HTML");
      return;
    }
    if (isInstitutionTryout && !studentId) {
      toast.error(`Select a ${recipientNoun} first`);
      return;
    }

    const errors = Object.fromEntries(
      fields.flatMap((field) => {
        const value = (values[field.field_name] ?? "").trim();
        const isMappedInstitutionField =
          isInstitutionTryout && mappedFieldNames.has(field.field_name);
        const intentionallyBlank = isHiddenTemplateValue(value);
        const mustHaveValue =
          (field.is_required || field.field_type === "image") &&
          (!isInstitutionTryout || isMappedInstitutionField);
        if (mustHaveValue && !value) {
          return [[field.field_name, `${field.label} is required`]];
        }
        if (field.field_type === "image" && value && !intentionallyBlank && !isValidImageValue(value)) {
          return [
            [
              field.field_name,
              `${field.label} needs an image upload or valid HTTPS URL`,
            ],
          ];
        }
        return [];
      })
    );
    setFieldErrors(errors);
    const nextLockedIssues = getLockedFieldIssues();
    setLockedFieldIssues(nextLockedIssues);

    const firstInvalidField = fields.find((field) => errors[field.field_name]);
    if (firstInvalidField) {
      document
        .getElementById(`try-field-${firstInvalidField.field_name}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      const missingCount = Object.keys(errors).length;
      toast.error(
        missingCount === 1
          ? errors[firstInvalidField.field_name]
          : `${missingCount} required fields are missing`
      );
      return;
    }

    setRendering(true);
    try {
      const externalImageUrls = fields
        .filter((field) => field.field_type === "image")
        .map((field) => values[field.field_name] ?? "")
        .filter((value) => /^https:\/\//i.test(value));
      let resolvedImages: Record<string, string> = {};

      if (externalImageUrls.length) {
        if (!accessToken) throw new Error("Your session is not available");
        const response = await fetch(
          "/api/admin/master-data/card-templates/preview-images",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ urls: externalImageUrls }),
          }
        );
        const json = await response.json();
        if (!response.ok) throw new Error(json.error ?? "External images could not be loaded");
        resolvedImages = json.data ?? {};
      }

      const renderValues = Object.fromEntries(
        Object.entries(values).map(([key, value]) => [
          key,
          resolvedImages[value] ?? value,
        ])
      );
      const populatedHtml = applyFieldValues(
        currentTemplate.html_template,
        fields,
        renderValues
      );
      setGeneratedHtml(populatedHtml);
      setCanvasImageSrc(await renderTemplateHtmlToPng(populatedHtml));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Template preview failed");
    } finally {
      setRendering(false);
    }
  }

  function downloadPng() {
    if (!canvasImageSrc) return;
    const link = document.createElement("a");
    link.href = canvasImageSrc;
    link.download = `${currentTemplate.name || "card-template"}.png`;
    link.click();
  }

  function downloadPdf() {
    if (!canvasImageSrc) return;
    return new Promise<void>((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const landscape = image.width > image.height;
        const pdf = new jsPDF({
          orientation: landscape ? "landscape" : "portrait",
          unit: "px",
          format: [image.width, image.height],
        });
        pdf.addImage(canvasImageSrc, "PNG", 0, 0, image.width, image.height);
        pdf.save(`${currentTemplate.name || "card-template"}.pdf`);
        resolve();
      };
      image.onerror = () => reject(new Error("Preview image could not be loaded"));
      image.src = canvasImageSrc;
    });
  }

  function downloadCurrentSizePng() {
    const exported = currentCanvasExport?.();
    if (!exported) return;
    const link = document.createElement("a");
    link.href = exported.dataUrl;
    link.download = `${currentTemplate.name || "card-template"}-${exported.width}x${exported.height}.png`;
    link.click();
  }

  function downloadCurrentSizePdf() {
    const exported = currentCanvasExport?.();
    if (!exported) return;
    const landscape = exported.width > exported.height;
    const pdf = new jsPDF({
      orientation: landscape ? "landscape" : "portrait",
      unit: "px",
      format: [exported.width, exported.height],
    });
    pdf.addImage(exported.dataUrl, "PNG", 0, 0, exported.width, exported.height);
    pdf.save(`${currentTemplate.name || "card-template"}-${exported.width}x${exported.height}.pdf`);
  }

  async function runPreviewMenuAction(action: () => void | Promise<void>) {
    setPreviewActionLoading(true);
    try {
      await action();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action could not be completed");
    } finally {
      window.setTimeout(() => setPreviewActionLoading(false), 350);
    }
  }

  async function saveGeneratedCard(confirmUpdate = false) {
    if (!accessToken) {
      toast.error("Your session is not available");
      return false;
    }
    if (!studentId) {
      toast.error(`Select a ${recipientNoun} before saving`);
      return false;
    }
    if (targetAudience === "staff" && !institutionId) {
      toast.error("Select an institution before saving the staff letter");
      return false;
    }

    setSavingCard(true);
    try {
      const canvasExport = currentCanvasExport?.();
      const saveImageUrl = canvasExport?.dataUrl ?? canvasImageSrc;
      const saveHtml = generatedHtml || (
        currentTemplate.html_template
          ? applyFieldValues(currentTemplate.html_template, fields, values)
          : ""
      );
      if (!saveImageUrl || !saveHtml) {
        toast.error("Generate the card before saving");
        return false;
      }
      const response = await fetch(
        targetAudience === "staff" ? "/api/admin/staff/letters" : "/api/admin/students/cards",
        {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          targetAudience === "staff"
            ? {
                institutionId,
                templateId: currentTemplate.id,
                staffUserId: Number(studentId),
                renderedHtml: saveHtml,
                fieldValues: values,
                imageUrl: saveImageUrl,
                canvasExport: canvasExport
                  ? { width: canvasExport.width, height: canvasExport.height }
                  : null,
              }
            : {
                templateId: currentTemplate.id,
                studentId: Number(studentId),
                academicYearId: tryoutAcademicYearId,
                renderedHtml: saveHtml,
                fieldValues: values,
                imageUrl: saveImageUrl,
                confirmUpdate,
                canvasExport: canvasExport
                  ? { width: canvasExport.width, height: canvasExport.height }
                  : null,
              }
        ),
        }
      );
      const json = await readJson(response);
      if (response.status === 409 && json.code === "DUPLICATE_GENERATED_DOCUMENT") {
        const documentLabel = String(json.documentLabel ?? saveDocumentLabel);
        const message = String(
          json.message ?? `${documentLabel} already exists for this student.`
        );
        toast.error(message);
        setDuplicateSavePrompt({
          title: `Update ${documentLabel}?`,
          description: `${message} Do you want to update the existing ${documentLabel}?`,
          actionLabel: String(json.actionLabel ?? `Update ${documentLabel}`),
        });
        return false;
      }
      if (!response.ok) throw new Error(json.error ?? "Card could not be saved");
      toast.success(
        targetAudience === "staff"
          ? `${saveDocumentLabel} saved to staff letters.`
          : json.data?.updated
          ? `${saveDocumentLabel} updated in student account.`
          : `${saveDocumentLabel} saved to student account.`
      );
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Card could not be saved");
      return false;
    } finally {
      setSavingCard(false);
    }
  }

  async function confirmDuplicateSave() {
    setConfirmingDuplicateSave(true);
    try {
      const saved = await saveGeneratedCard(true);
      if (saved) setDuplicateSavePrompt(null);
    } finally {
      setConfirmingDuplicateSave(false);
    }
  }

  function updateDraftField(
    index: number,
    updater: (field: DocumentTemplateField) => DocumentTemplateField
  ) {
    setFieldDraftError("");
    setFieldsDraft((current) =>
      current.map((field, fieldIndex) =>
        fieldIndex === index ? updater(cloneTemplateField(field)) : field
      )
    );
  }

  function updateNewField(
    updater: (field: DocumentTemplateField) => DocumentTemplateField
  ) {
    setFieldDraftError("");
    setNewFieldDraft((current) => updater(cloneTemplateField(current)));
  }

  function openAddFieldPanel() {
    setFieldEditorMode("add");
    setFieldDraftError("");
    setNewFieldDraft(createDraftField(fieldsDraft.length));
  }

  function addFieldToDraft() {
    const normalized = normalizeTemplateField({
      ...newFieldDraft,
      sort_order: fieldsDraft.length,
    });
    const error = validateTemplateField(normalized, fieldsDraft, null);
    if (error) {
      setFieldDraftError(error);
      return;
    }
    setFieldsDraft((current) => [...current, normalized]);
    setSelectedFieldIndex(fieldsDraft.length);
    setFieldEditorMode("edit");
    setFieldDraftError("");
    toast.success("Field added to draft. Save the template to update the database.");
  }

  function requestDeleteField(index: number) {
    setPendingDeleteFieldIndex(index);
  }

  function confirmDeleteField() {
    if (pendingDeleteFieldIndex === null) return;
    const deleteIndex = pendingDeleteFieldIndex;
    const nextFields = fieldsDraft
      .filter((_, index) => index !== deleteIndex)
      .map((field, index) => ({ ...field, sort_order: index }));
    setFieldsDraft(nextFields);
    if (nextFields.length === 0) {
      setSelectedFieldIndex(0);
      setFieldEditorMode("add");
      setNewFieldDraft(createDraftField(0));
    } else {
      setSelectedFieldIndex((selected) => {
        if (selected >= nextFields.length) return nextFields.length - 1;
        if (selected > deleteIndex) return selected - 1;
        return selected;
      });
    }
    setPendingDeleteFieldIndex(null);
    setFieldDraftError("");
    toast.success("Field removed from draft. Save the template to delete it from the database.");
  }

  function openEditor(mode: "code" | "fields") {
    setEditorMode(mode);
    setCodeDraft(currentTemplate.html_template ?? "");
    const nextFields = fields.map(cloneTemplateField);
    setFieldsDraft(nextFields);
    setSelectedFieldIndex(0);
    setFieldEditorMode(nextFields.length ? "edit" : "add");
    setNewFieldDraft(createDraftField(nextFields.length));
    setFieldDraftError("");
    setPendingDeleteFieldIndex(null);
  }

  async function copyFieldSchemaJson() {
    const schema = fieldsDraft.map((field, index) =>
      normalizeTemplateField({ ...field, sort_order: index })
    );
    try {
      await navigator.clipboard.writeText(JSON.stringify(schema, null, 2));
      toast.success("Schema JSON copied");
    } catch {
      toast.error("Could not copy schema JSON");
    }
  }

  function openBulkInsertDialog() {
    setBulkInsertOpen(true);
    setBulkInsertJson("");
    setBulkInsertError("");
  }

  function bulkInsertFields() {
    let parsed: unknown;
    try {
      parsed = JSON.parse(bulkInsertJson);
    } catch {
      setBulkInsertError("Paste a valid JSON array of fields.");
      return;
    }
    if (!Array.isArray(parsed)) {
      setBulkInsertError("Bulk insert expects a JSON array.");
      return;
    }
    const nextFields = [...fieldsDraft];
    const incomingFields: DocumentTemplateField[] = [];
    for (const [entryIndex, entry] of parsed.entries()) {
      if (!entry || typeof entry !== "object") {
        setBulkInsertError(`Field ${entryIndex + 1}: Use a field object.`);
        return;
      }
      const source = entry as Partial<DocumentTemplateField>;
      const normalized = normalizeTemplateField({
        field_name: String(source.field_name ?? "").trim(),
        label: String(source.label ?? "").trim(),
        field_type: source.field_type ?? "text",
        is_required: source.is_required !== false,
        sort_order: nextFields.length + incomingFields.length,
        preparation: source.preparation
          ? {
              is_mapped: Boolean(source.preparation.is_mapped),
              has_default: Boolean(source.preparation.has_default),
              needs_action: Boolean(source.preparation.needs_action),
              source_field_label: source.preparation.source_field_label ?? null,
            }
          : {
              is_mapped: false,
              has_default: false,
              needs_action: true,
              source_field_label: null,
            },
      });
      const error = validateTemplateField(
        normalized,
        [...nextFields, ...incomingFields],
        null
      );
      if (error) {
        setBulkInsertError(`Field ${entryIndex + 1}: ${error}`);
        return;
      }
      incomingFields.push(normalized);
    }
    if (!incomingFields.length) {
      setBulkInsertError("Paste at least one field.");
      return;
    }
    setFieldsDraft([...nextFields, ...incomingFields]);
    setSelectedFieldIndex(nextFields.length);
    setFieldEditorMode("edit");
    setBulkInsertOpen(false);
    setBulkInsertJson("");
    setBulkInsertError("");
    toast.success(`${incomingFields.length} fields added to draft. Save the template to update the database.`);
  }

  function isFieldUsedInTemplate(fieldName: string) {
    const trimmedName = fieldName.trim();
    if (!trimmedName) return false;
    return new RegExp(`{{\\s*${escapeRegExp(trimmedName)}\\s*}}`).test(codeDraft);
  }

  async function saveTemplateContent() {
    if (!accessToken || !canEditTemplate) return;
    const parsedFields = fieldsDraft.map((field, index) =>
      normalizeTemplateField({ ...field, sort_order: index })
    );
    for (let index = 0; index < parsedFields.length; index += 1) {
      const error = validateTemplateField(parsedFields[index], parsedFields, index);
      if (error) {
        setEditorMode("fields");
        setFieldEditorMode("edit");
        setSelectedFieldIndex(index);
        setFieldDraftError(error);
        toast.error(error);
        return;
      }
    }

    setEditorSaving(true);
    try {
      const response = await fetch(
        `/api/admin/master-data/card-templates/${currentTemplate.id}/content`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            html_template: codeDraft,
            fields: parsedFields,
          }),
        }
      );
      const json = await readJson(response);
      if (!response.ok) throw new Error(json.error ?? "Template could not be saved");
      const updatedTemplate = {
        ...currentTemplate,
        ...(json.data as Partial<DocumentTemplateRow>),
        fields: (json.data as DocumentTemplateRow).fields ?? parsedFields,
      };
      setEditedTemplate(updatedTemplate);
      onTemplateUpdated?.(updatedTemplate);
      setCanvasImageSrc(null);
      setEditorMode(null);
      toast.success("Template updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Template could not be saved");
    } finally {
      setEditorSaving(false);
    }
  }

  function renderFieldForm({
    field,
    index,
    mode,
  }: {
    field: DocumentTemplateField;
    index: number | null;
    mode: TemplateFieldEditorMode;
  }) {
    const updateField = (updater: (field: DocumentTemplateField) => DocumentTemplateField) => {
      if (mode === "add") {
        updateNewField(updater);
      } else if (index !== null) {
        updateDraftField(index, updater);
      }
    };
    const isInUse = isFieldUsedInTemplate(field.field_name);

    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="shrink-0 border-b p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold">
                {mode === "add" ? "Adding a New Field" : "Field Details"}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {mode === "add"
                  ? "Create a placeholder field used by the template code."
                  : "Edit the placeholder name, label, type, and order."}
              </p>
            </div>
            {mode === "edit" && index !== null && (
              <div className="flex shrink-0 items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium ${
                    isInUse
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                      : "border-muted-foreground/20 bg-muted/40 text-muted-foreground"
                  }`}
                >
                  <span
                    className={`size-2 rounded-full ${
                      isInUse ? "bg-emerald-500" : "bg-muted-foreground/50"
                    }`}
                  />
                  {isInUse ? "In use" : "Not in use"}
                </span>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => requestDeleteField(index)}
                  disabled={editorSaving}
                >
                  <Trash2 className="size-4" />
                  Delete Field
                </Button>
              </div>
            )}
          </div>
          {fieldDraftError && (
            <div className="mt-4 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{fieldDraftError}</span>
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="template-field-id">ID</Label>
              <Input
                id="template-field-id"
                value={field.id ? String(field.id) : "Assigned after save"}
                readOnly
                className="bg-muted/50 text-muted-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-field-sort-order">Sort Order</Label>
              <Input
                id="template-field-sort-order"
                type="number"
                value={field.sort_order}
                onChange={(event) =>
                  updateField((current) => ({
                    ...current,
                    sort_order: Number(event.target.value),
                  }))
                }
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-field-name">Field Name</Label>
              <Input
                id="template-field-name"
                value={field.field_name}
                placeholder="schoolLogo"
                onChange={(event) =>
                  updateField((current) => ({
                    ...current,
                    field_name: event.target.value,
                  }))
                }
                className="bg-background font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Use this in code as {field.field_name ? `{{${field.field_name}}}` : "{{fieldName}}"}.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-field-label">Label</Label>
              <Input
                id="template-field-label"
                value={field.label}
                placeholder="School Logo"
                onChange={(event) =>
                  updateField((current) => ({
                    ...current,
                    label: event.target.value,
                  }))
                }
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label>Field Type</Label>
              <Select
                value={field.field_type}
                onValueChange={(value) =>
                  updateField((current) => ({
                    ...current,
                    field_type: value as DocumentTemplateField["field_type"],
                  }))
                }
              >
                <SelectTrigger className="w-full bg-background">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_FIELD_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Required</Label>
              <label className="flex h-10 items-center gap-3 rounded-md border bg-background px-3 text-sm">
                <Checkbox
                  checked={field.is_required}
                  onCheckedChange={(checked) =>
                    updateField((current) => ({
                      ...current,
                      is_required: checked === true,
                    }))
                  }
                />
                Required field
              </label>
            </div>
          </div>

          <div className="mt-5 rounded-md border bg-muted/20 p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div>
                <h4 className="font-medium">Preparation</h4>
                <p className="mt-1 text-sm text-muted-foreground">
                  Mapping and default status are calculated from institution setup. They are shown here for context.
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="flex items-center gap-3 rounded-md border bg-background px-3 py-2 text-sm">
                <Checkbox checked={Boolean(field.preparation?.is_mapped)} disabled />
                Is mapped
              </label>
              <label className="flex items-center gap-3 rounded-md border bg-background px-3 py-2 text-sm">
                <Checkbox checked={Boolean(field.preparation?.has_default)} disabled />
                Has default
              </label>
              <label className="flex items-center gap-3 rounded-md border bg-background px-3 py-2 text-sm">
                <Checkbox checked={Boolean(field.preparation?.needs_action)} disabled />
                Needs action
              </label>
              <div className="space-y-2">
                <Label htmlFor="template-field-source-label">Source Field Label</Label>
                <Input
                  id="template-field-source-label"
                  value={field.preparation?.source_field_label ?? ""}
                  readOnly
                  placeholder="Not mapped"
                  className="bg-muted/50 text-muted-foreground"
                />
              </div>
            </div>
          </div>
        </div>

        {mode === "add" && (
          <DialogFooter className="shrink-0 border-t p-5">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setFieldEditorMode(fieldsDraft.length ? "edit" : "add");
                setFieldDraftError("");
              }}
              disabled={!fieldsDraft.length || editorSaving}
            >
              Cancel Add
            </Button>
            <Button
              type="button"
              onClick={addFieldToDraft}
              disabled={editorSaving}
            >
              <Plus className="size-4" />
              Add Now
            </Button>
          </DialogFooter>
        )}
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-hidden bg-background text-foreground">
      <TemplateResizablePanelGroup
        id={`card-template-tryout-${currentTemplate.id}-${isMobile ? "mobile" : "desktop"}`}
        direction={isMobile ? "vertical" : "horizontal"}
        className="h-full w-full"
      >
        <TemplateResizablePanel
          id={`card-template-tryout-fields-${currentTemplate.id}-${isMobile ? "mobile" : "desktop"}`}
          defaultSize={isMobile ? "55%" : "34%"}
          minSize={isMobile ? "35%" : "24%"}
        >
          <div className="flex h-full flex-col overflow-hidden">
            <div className="shrink-0 border-b px-5 py-5 md:px-7">
              <h2 className="text-xl font-bold">
                {isInstitutionTryout ? `${recipientLabel} & Remaining Fields` : "Template Fields"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {isInstitutionTryout
                  ? `Select a ${recipientNoun}. Mapped fields fill automatically; only remaining fields are editable.`
                  : `Enter sample details to test ${currentTemplate.name}.`}
              </p>
            </div>
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 md:px-7">
              {isInstitutionTryout && (
                <div className="space-y-2 rounded-md border bg-card/40 p-4">
                  <Label>{recipientLabel}</Label>
                  <AsyncSearchPopover<StudentOption>
                    value={studentId}
                    selectedLabel={studentName}
                    onChange={(value) => {
                      if (lockStudentSelection) return;
                      setStudentId(value);
                      if (!value) {
                        setStudentName("");
                        setInstitutionDefaultFieldNames(new Set());
                        setValues(
                          Object.fromEntries(fields.map((field) => [field.field_name, ""]))
                        );
                        setLockedFieldIssues([]);
                        setFieldErrors({});
                        setCanvasImageSrc(null);
                        return;
                      }
                      void loadStudentValues(value);
                    }}
                    onSelectItem={(student) => {
                      if (lockStudentSelection) return;
                      setStudentName(student.name);
                    }}
                    fetcher={(search) => fetchStudents(search)}
                    getValue={(student) => String(student.id)}
                    getLabel={(student) => student.name}
                    renderItem={(student) => (
                      <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{student.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {[
                              targetAudience === "staff"
                                ? student.role_name || student.role_code || student.email || `ID: ${student.id}`
                                : student.admission_number || student.email || `ID: ${student.id}`,
                              student.institution_name,
                              student.program_name,
                              student.section_name,
                            ].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                        {student.is_profile_complete && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span
                                  className="inline-flex shrink-0"
                                  aria-label="Profile complete"
                                >
                                  <VerifiedProfileIcon />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="right" sideOffset={8}>
                                Profile complete
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    )}
                    placeholder={`Select ${recipientNoun}...`}
                    searchPlaceholder={`Search ${targetAudience === "staff" ? "staff" : "students"}...`}
                    emptyText={`No ${targetAudience === "staff" ? "staff members" : "students"} found`}
                    disabled={lockStudentSelection || mappingLoading || studentLoading}
                    loading={mappingLoading || studentLoading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Platform mapped fields are locked and will be filled from this {recipientNoun} record.
                  </p>
                  {!isTryoutDataLoading && lockedFieldIssues.length > 0 && (
                    <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
                      <div className="flex items-center gap-2 font-semibold text-destructive">
                        <AlertCircle className="size-4" />
                        Some mapped values need input
                      </div>
                      <p className="mt-1 text-xs text-destructive/80">
                        Fill these fields below now, or update the saved profile/default values later.
                      </p>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-destructive/90">
                        {lockedFieldIssues.map((issue) => (
                          <li key={issue}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {isInstitutionTryout && (mappingLoading || defaultsLoading) ? (
                <div className="flex min-h-32 items-center justify-center gap-2 rounded-md border p-5 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Loading remaining fields...
                </div>
              ) : (
                <>
                  {editableFields.some((field) => /^subject\d+Name$/i.test(field.field_name)) && (
                    <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
                      Subject slots are optional. Fill only the subjects needed; leave unused subject fields empty or write NA. Totals, percentage, overall grade, and remarks are calculated automatically when you generate.
                    </div>
                  )}
                  {editableFields.map((field) => (
                <div
                  key={field.field_name}
                  id={`try-field-${field.field_name}`}
                  className="scroll-m-5 space-y-2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <Label htmlFor={`try-${field.field_name}`}>
                      {field.label}
                      {!isInstitutionTryout && (field.is_required || field.field_type === "image")
                        ? " *"
                        : ""}
                    </Label>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {`{{${field.field_name}}}`}
                    </span>
                  </div>
                  {field.field_type === "image" ? (
                    <ImageField
                      field={field}
                      value={values[field.field_name] ?? ""}
                      error={fieldErrors[field.field_name]}
                      onChange={(value) => {
                        setValues((current) => ({
                          ...current,
                          [field.field_name]: value,
                        }));
                        setFieldErrors((current) => {
                          if (!current[field.field_name]) return current;
                          const next = { ...current };
                          delete next[field.field_name];
                          return next;
                        });
                      }}
                    />
                  ) : field.field_type === "textarea" ? (
                    <>
                      <Textarea
                        id={`try-${field.field_name}`}
                        value={values[field.field_name] ?? ""}
                        onChange={(event) => {
                          setValues((current) => ({
                            ...current,
                            [field.field_name]: event.target.value,
                          }));
                          setFieldErrors((current) => {
                            if (!current[field.field_name]) return current;
                            const next = { ...current };
                            delete next[field.field_name];
                            return next;
                          });
                        }}
                        className="bg-background"
                        aria-invalid={Boolean(fieldErrors[field.field_name])}
                        aria-describedby={
                          fieldErrors[field.field_name]
                            ? `try-${field.field_name}-error`
                            : undefined
                        }
                      />
                      {fieldErrors[field.field_name] && (
                        <p
                          id={`try-${field.field_name}-error`}
                          className="text-sm font-medium text-destructive"
                        >
                          {fieldErrors[field.field_name]}
                        </p>
                      )}
                    </>
                  ) : field.field_type === "date" ? (
                    <>
                      <DatePicker
                        value={values[field.field_name] ?? ""}
                        onChange={(value) => {
                          setValues((current) => ({
                            ...current,
                            [field.field_name]: value,
                          }));
                          setFieldErrors((current) => {
                            if (!current[field.field_name]) return current;
                            const next = { ...current };
                            delete next[field.field_name];
                            return next;
                          });
                        }}
                        placeholder="Select date"
                        className="bg-background"
                      />
                      {fieldErrors[field.field_name] && (
                        <p
                          id={`try-${field.field_name}-error`}
                          className="text-sm font-medium text-destructive"
                        >
                          {fieldErrors[field.field_name]}
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <Input
                        id={`try-${field.field_name}`}
                        type={templateInputType(field.field_type)}
                        value={values[field.field_name] ?? ""}
                        onChange={(event) => {
                          setValues((current) => ({
                            ...current,
                            [field.field_name]: event.target.value,
                          }));
                          setFieldErrors((current) => {
                            if (!current[field.field_name]) return current;
                            const next = { ...current };
                            delete next[field.field_name];
                            return next;
                          });
                        }}
                        className="bg-background"
                        aria-invalid={Boolean(fieldErrors[field.field_name])}
                        aria-describedby={
                          fieldErrors[field.field_name]
                            ? `try-${field.field_name}-error`
                            : undefined
                        }
                      />
                      {fieldErrors[field.field_name] && (
                        <p
                          id={`try-${field.field_name}-error`}
                          className="text-sm font-medium text-destructive"
                        >
                          {fieldErrors[field.field_name]}
                        </p>
                      )}
                    </>
                  )}
                </div>
                  ))}
                </>
              )}
              {isInstitutionTryout && !mappingLoading && !defaultsLoading && editableFields.length === 0 && (
                <div className="rounded-md border p-5 text-center text-sm text-muted-foreground">
                  All fields are filled by database mappings or institution defaults. Select a {recipientNoun} and generate.
                </div>
              )}
              {!isInstitutionTryout && fields.length === 0 && (
                <div className="rounded-md border p-5 text-center text-sm text-muted-foreground">
                  This template has no dynamic fields.
                </div>
              )}
            </div>
            <div className="shrink-0 border-t p-5 md:px-7">
              <div className={isInstitutionTryout ? "grid gap-2 sm:grid-cols-2" : ""}>
                <Button
                  type="button"
                  onClick={() => void generatePreview()}
                  disabled={rendering || isTryoutDataLoading}
                  className="h-11 w-full font-semibold"
                >
                  {rendering || isTryoutDataLoading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      {rendering ? "Generating Design..." : "Loading Data..."}
                    </>
                  ) : (
                    <>
                      <ImageIcon className="size-4" />
                      Generate Design
                    </>
                  )}
                </Button>
                {isInstitutionTryout && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void saveGeneratedCard()}
                    disabled={
                      isSavingGeneratedDocument ||
                      rendering ||
                      isTryoutDataLoading ||
                      !studentId
                    }
                    className="h-11 w-full font-semibold"
                  >
                    {isSavingGeneratedDocument ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        {savingButtonText}
                      </>
                    ) : (
                      <>
                        <Save className="size-4" />
                        {saveButtonText}
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </TemplateResizablePanel>

        <TemplateResizableHandle
          id={`card-template-tryout-separator-${currentTemplate.id}-${isMobile ? "mobile" : "desktop"}`}
        />

        <TemplateResizablePanel
          id={`card-template-tryout-preview-${currentTemplate.id}-${isMobile ? "mobile" : "desktop"}`}
          defaultSize={isMobile ? "45%" : "66%"}
        >
          <div className="relative h-full min-w-0 bg-muted/20">
            {canEditTemplate && (
              <div className="absolute right-5 top-4 z-40 flex items-center gap-1 rounded-md border bg-background/95 p-1 shadow-xl">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-2 px-3"
                  onClick={() => openEditor("code")}
                >
                  <Code2 className="size-4" />
                  Code
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-2 px-3"
                  onClick={() => openEditor("fields")}
                >
                  <ListTree className="size-4" />
                  Fields
                </Button>
              </div>
            )}
            {canvasImageSrc && !rendering && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className={canEditTemplate ? "absolute right-5 top-16 z-30 shadow-xl" : "absolute right-5 top-4 z-30 shadow-xl"}
                    title="Download preview"
                  >
                    {isPreviewMenuBusy ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <MoreHorizontal className="size-4" />
                    )}
                    <span className="sr-only">Download preview</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuItem onClick={() => void runPreviewMenuAction(downloadCurrentSizePng)}>
                    <Download className="size-4" />
                    <span className="whitespace-nowrap">Download Current Size PNG</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void runPreviewMenuAction(downloadCurrentSizePdf)}>
                    <FileText className="size-4" />
                    <span className="whitespace-nowrap">Download Current Size PDF</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => void runPreviewMenuAction(downloadPng)}>
                    <Download className="size-4" />
                    <span className="whitespace-nowrap">Download Original PNG</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void runPreviewMenuAction(downloadPdf)}>
                    <FileText className="size-4" />
                    <span className="whitespace-nowrap">Download Original PDF</span>
                  </DropdownMenuItem>
                  {isInstitutionTryout && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        disabled={
                          isSavingGeneratedDocument ||
                          isTryoutDataLoading ||
                          !studentId
                        }
                        onClick={() => void saveGeneratedCard()}
                      >
                        {isSavingGeneratedDocument ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Save className="size-4" />
                        )}
                        <span className="whitespace-nowrap">
                          {isSavingGeneratedDocument ? savingButtonText : saveButtonText}
                        </span>
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {rendering ? (
              <div className="flex h-full items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="size-5 animate-spin" />
                Rendering preview...
              </div>
            ) : (
              <TemplateCanvasPreview
                imageSrc={canvasImageSrc}
                renderMode="persisted"
                onCurrentExportChange={(exporter) =>
                  setCurrentCanvasExport(() => exporter)
                }
              />
            )}
          </div>
        </TemplateResizablePanel>
      </TemplateResizablePanelGroup>
      <Dialog open={Boolean(editorMode)} onOpenChange={(open) => !open && setEditorMode(null)}>
        <DialogContent
          className="flex h-[86dvh] max-h-[900px] w-[92vw] max-w-[1180px] flex-col gap-0 overflow-hidden p-0 sm:max-w-[1180px]"
          onPointerDownOutside={(event) => event.preventDefault()}
        >
          <DialogHeader className="shrink-0 border-b px-5 py-4 pr-14">
            <div className="flex items-start justify-between gap-4">
              <div>
                <DialogTitle className="flex items-center gap-2">
                  {editorMode === "fields" ? (
                    <ListTree className="size-4 text-primary" />
                  ) : (
                    <Code2 className="size-4 text-primary" />
                  )}
                  {editorMode === "fields" ? "Edit Template Fields" : "Edit Template Code"}
                </DialogTitle>
                <DialogDescription className="mt-2">
                  {editorMode === "fields"
                    ? "Update the placeholder field JSON used by the template."
                    : "Update the template HTML. Use {{fieldName}} placeholders for dynamic values."}
                </DialogDescription>
              </div>
              {editorMode === "fields" && (
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={openBulkInsertDialog}
                    disabled={editorSaving}
                  >
                    <Plus className="size-4" />
                    Bulk Insert
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void copyFieldSchemaJson()}
                    disabled={editorSaving}
                  >
                    <Copy className="size-4" />
                    Copy Schema JSON
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>
          {editorMode === "fields" ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <TemplateResizablePanelGroup
                id={`template-fields-editor-${currentTemplate.id}-${isMobile ? "mobile" : "desktop"}`}
                direction={isMobile ? "vertical" : "horizontal"}
                className="min-h-0 flex-1"
              >
                <TemplateResizablePanel
                  id={`template-fields-editor-list-${currentTemplate.id}-${isMobile ? "mobile" : "desktop"}`}
                  defaultSize={isMobile ? "42%" : "34%"}
                  minSize={isMobile ? 25 : 24}
                >
                  <div className="flex h-full min-h-0 flex-col border-r bg-muted/10">
                    <div className="shrink-0 border-b p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h3 className="font-semibold">Fields</h3>
                          <p className="text-sm text-muted-foreground">
                            {fieldsDraft.length} placeholder{fieldsDraft.length === 1 ? "" : "s"}
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          onClick={openAddFieldPanel}
                          disabled={editorSaving}
                        >
                          <Plus className="size-4" />
                          Add Field
                        </Button>
                      </div>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto p-3">
                      {fieldsDraft.length ? (
                        <div className="space-y-2">
                          {fieldsDraft.map((field, index) => {
                            const isSelected =
                              fieldEditorMode === "edit" && selectedFieldIndex === index;
                            const isInUse = isFieldUsedInTemplate(field.field_name);
                            return (
                              <button
                                key={`${field.id ?? "new"}-${field.field_name}-${index}`}
                                type="button"
                                onClick={() => {
                                  setSelectedFieldIndex(index);
                                  setFieldEditorMode("edit");
                                  setFieldDraftError("");
                                }}
                                className={`w-full rounded-md border p-3 text-left transition ${
                                  isSelected
                                    ? "border-primary bg-primary/10"
                                    : isInUse
                                      ? "bg-background hover:bg-muted/60"
                                      : "border-muted-foreground/10 bg-muted/20 opacity-60 hover:opacity-90"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="flex min-w-0 items-center gap-2">
                                    <span
                                      className={`size-2 shrink-0 rounded-full ${
                                        isInUse ? "bg-emerald-500" : "bg-muted-foreground/50"
                                      }`}
                                      title={isInUse ? "In use in template code" : "Not used in template code"}
                                    />
                                    <span className="truncate font-medium">
                                      {field.label || "Untitled Field"}
                                    </span>
                                  </span>
                                  <span className="shrink-0 rounded border px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
                                    {field.field_type}
                                  </span>
                                </div>
                                <div className="mt-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                                  <span className="truncate font-mono">
                                    {field.field_name || "fieldName"}
                                  </span>
                                  <span>#{field.sort_order}</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex h-full min-h-36 items-center justify-center rounded-md border border-dashed p-5 text-center text-sm text-muted-foreground">
                          No fields yet. Add a field to create the first placeholder.
                        </div>
                      )}
                    </div>
                  </div>
                </TemplateResizablePanel>

                <TemplateResizableHandle
                  id={`template-fields-editor-handle-${currentTemplate.id}-${isMobile ? "mobile" : "desktop"}`}
                />

                <TemplateResizablePanel
                  id={`template-fields-editor-detail-${currentTemplate.id}-${isMobile ? "mobile" : "desktop"}`}
                  defaultSize={isMobile ? "58%" : "66%"}
                  minSize={isMobile ? 35 : 40}
                >
                  {fieldEditorMode === "add" ? (
                    renderFieldForm({
                      field: newFieldDraft,
                      index: null,
                      mode: "add",
                    })
                  ) : selectedDraftField ? (
                    renderFieldForm({
                      field: selectedDraftField,
                      index: selectedFieldIndex,
                      mode: "edit",
                    })
                  ) : (
                    <div className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">
                      Select a field or add a new one.
                    </div>
                  )}
                </TemplateResizablePanel>
              </TemplateResizablePanelGroup>
              <DialogFooter className="shrink-0 border-t p-5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditorMode(null)}
                  disabled={editorSaving}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => void saveTemplateContent()}
                  disabled={editorSaving}
                >
                  {editorSaving ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Template"
                  )}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col gap-4 p-5">
              <Textarea
                value={codeDraft}
                onChange={(event) => setCodeDraft(event.target.value)}
                spellCheck={false}
                className="min-h-0 flex-1 resize-none bg-background font-mono text-xs leading-relaxed"
              />
              <DialogFooter className="shrink-0 p-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditorMode(null)}
                  disabled={editorSaving}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => void saveTemplateContent()}
                  disabled={editorSaving}
                >
                  {editorSaving ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Template"
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={bulkInsertOpen} onOpenChange={setBulkInsertOpen}>
        <DialogContent
          className="w-[88vw] max-h-[82dvh] max-w-5xl overflow-hidden p-0 sm:max-w-5xl"
          onPointerDownOutside={(event) => event.preventDefault()}
        >
          <DialogHeader className="border-b px-4 py-3">
            <DialogTitle className="flex items-center gap-2">
              <Plus className="size-4 text-primary" />
              Bulk Insert Fields
            </DialogTitle>
            <DialogDescription>
              Paste a JSON array of fields. IDs and pasted sort order are ignored; new fields continue after the current last field.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 p-3">
            <Textarea
              value={bulkInsertJson}
              onChange={(event) => {
                setBulkInsertJson(event.target.value);
                setBulkInsertError("");
              }}
              placeholder={`[
  {
    "field_name": "overallGrade",
    "label": "Overall Grade",
    "field_type": "text",
    "is_required": true
  }
]`}
              spellCheck={false}
              className="h-[42dvh] resize-none bg-background font-mono text-xs leading-relaxed"
            />
            {bulkInsertError && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>{bulkInsertError}</span>
              </div>
            )}
          </div>
          <DialogFooter className="border-t px-4 py-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setBulkInsertOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={bulkInsertFields}>
              <Plus className="size-4" />
              Bulk Insert
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={pendingDeleteFieldIndex !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteFieldIndex(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-destructive" />
              Delete template field?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Deleting {pendingDeleteField?.label ?? "this field"} removes the placeholder from the database after you save the template. If the template code still uses {pendingDeleteField?.field_name ? `{{${pendingDeleteField.field_name}}}` : "this placeholder"}, the generated design may show a missing value. Please update the template code too.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteField}>
              Delete Field
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={Boolean(duplicateSavePrompt)}
        onOpenChange={(open) => {
          if (!open && !confirmingDuplicateSave) setDuplicateSavePrompt(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{duplicateSavePrompt?.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {duplicateSavePrompt?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={confirmingDuplicateSave}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={confirmingDuplicateSave}
              onClick={(event) => {
                event.preventDefault();
                void confirmDuplicateSave();
              }}
            >
              {confirmingDuplicateSave ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Updating...
                </>
              ) : (
                duplicateSavePrompt?.actionLabel
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
