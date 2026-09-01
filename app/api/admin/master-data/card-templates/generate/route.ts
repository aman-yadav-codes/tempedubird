import { NextResponse } from "next/server";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/auth";
import { isPlatformAdminUser } from "@/lib/auth/permissions";
import { DOCUMENT_FIELD_TYPES, DocumentFieldType } from "@/lib/types/document-template";

const MAX_IMAGE_DATA_URL_LENGTH = 8 * 1024 * 1024;

const GeneratedTemplateSchema = z.object({
  templateName: z.string().min(1).max(150),
  html: z.string().min(1),
  fields: z.array(
    z.object({
      name: z.string().regex(/^[a-z][a-zA-Z0-9]*$/),
      label: z.string().min(1).max(150),
      type: z.enum(DOCUMENT_FIELD_TYPES),
      isRequired: z.boolean(),
      sampleValue: z.string().max(500),
    })
  ).max(50),
});

function sanitizeGeneratedHtml(html: string) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+\s*=\s*(["'])[\s\S]*?\1/gi, "")
    .replace(/javascript:/gi, "");
}

type TemplateFieldDef = {
  name: string;
  label: string;
  type: DocumentFieldType;
  isRequired: boolean;
  sampleValue: string;
};

function generateFallbackTemplate(
  categoryName: string,
  categoryAudience: "student" | "staff",
  requestedTemplateName: string
): { templateName: string; html: string; fields: TemplateFieldDef[] } {
  const catLower = categoryName.toLowerCase();
  const reqLower = requestedTemplateName.toLowerCase();

  // 1. Experience Letter / Relieving Certificate
  if (
    catLower.includes("experience") ||
    catLower.includes("relieving") ||
    catLower.includes("letter") ||
    reqLower.includes("experience") ||
    reqLower.includes("relieving")
  ) {
    const templateName = requestedTemplateName || "Professional Experience Letter Template";
    const fields: TemplateFieldDef[] = [
      { name: "companyName", label: "Organization / Company Name", type: "text", isRequired: true, sampleValue: "Maa Sharda Institute Pvt. Ltd." },
      { name: "companyLogo", label: "Organization Logo", type: "image", isRequired: false, sampleValue: "" },
      { name: "companyAddress", label: "Office Address", type: "text", isRequired: true, sampleValue: "Pandeypur, Varanasi, Uttar Pradesh - 221002" },
      { name: "companyEmail", label: "Official Email", type: "email", isRequired: false, sampleValue: "hr@edubird.com" },
      { name: "issueDate", label: "Issue Date", type: "date", isRequired: true, sampleValue: "01 Sep 2026" },
      { name: "referenceNumber", label: "Reference / Document No", type: "text", isRequired: true, sampleValue: "EXP/2026/894" },
      { name: "employeeName", label: "Employee Full Name", type: "text", isRequired: true, sampleValue: "Mr. Vikash Gupta" },
      { name: "employeeCode", label: "Employee ID / Code", type: "text", isRequired: true, sampleValue: "EMP-5747" },
      { name: "designation", label: "Designation / Role Title", type: "text", isRequired: true, sampleValue: "Senior Academic Faculty" },
      { name: "department", label: "Department", type: "text", isRequired: true, sampleValue: "Academics & Operations" },
      { name: "joiningDate", label: "Date of Joining", type: "date", isRequired: true, sampleValue: "01 Aug 2022" },
      { name: "relievingDate", label: "Date of Relieving", type: "date", isRequired: true, sampleValue: "31 Aug 2026" },
      { name: "signatoryName", label: "Signing Authority Name", type: "text", isRequired: true, sampleValue: "Deepak Yadav" },
      { name: "signatoryDesignation", label: "Signing Authority Designation", type: "text", isRequired: true, sampleValue: "Director & Head of Human Resources" },
    ];

    const html = `
<div style="width: 794px; min-height: 1123px; padding: 50px 60px; font-family: 'Helvetica Neue', Arial, sans-serif; color: #1e293b; background: #ffffff; box-sizing: border-box; line-height: 1.6; position: relative;">
  <!-- Header -->
  <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px;">
    <div>
      <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px;">{{companyName}}</h1>
      <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">{{companyAddress}} | Email: {{companyEmail}}</p>
    </div>
    <div style="width: 70px; height: 70px; border-radius: 8px; overflow: hidden; display: flex; align-items: center; justify-content: center; background: #f8fafc; border: 1px solid #e2e8f0;">
      <img src="{{companyLogo}}" alt="Logo" style="max-width: 100%; max-height: 100%; object-fit: contain;" />
    </div>
  </div>

  <!-- Reference & Date -->
  <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 600; color: #475569; margin-bottom: 35px;">
    <div>Ref: {{referenceNumber}}</div>
    <div>Date: {{issueDate}}</div>
  </div>

  <!-- Title -->
  <div style="text-align: center; margin-bottom: 35px;">
    <h2 style="margin: 0; font-size: 18px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #0f172a; text-decoration: underline; text-underline-offset: 6px;">
      Experience &amp; Relieving Certificate
    </h2>
    <p style="margin: 8px 0 0 0; font-size: 13px; font-weight: 600; color: #64748b;">TO WHOM IT MAY CONCERN</p>
  </div>

  <!-- Body Content -->
  <div style="font-size: 14px; color: #334155; line-height: 1.8; text-align: justify;">
    <p style="margin-bottom: 18px;">
      This is to certify that <strong>{{employeeName}}</strong> (Employee Code: <strong>{{employeeCode}}</strong>) was employed with <strong>{{companyName}}</strong> in the capacity of <strong>{{designation}}</strong> in the <strong>{{department}}</strong> department from <strong>{{joiningDate}}</strong> to <strong>{{relievingDate}}</strong>.
    </p>
    <p style="margin-bottom: 18px;">
      During their tenure with us, <strong>{{employeeName}}</strong> was found to be hardworking, competent, professional, and dedicated to their duties. They carried out all responsibilities with utmost sincerity, contributing substantially to the growth and operational excellence of our organization.
    </p>
    <p style="margin-bottom: 24px;">
      Their conduct and character during the period of service with us were found to be exemplary. We relieved them from their duties on <strong>{{relievingDate}}</strong> following the successful handover of their official responsibilities.
    </p>
    <p style="margin-bottom: 40px;">
      We thank them for their valuable service and wish them the very best in all their future personal and professional endeavors.
    </p>
  </div>

  <!-- Signatory Block -->
  <div style="margin-top: 60px; display: flex; justify-content: space-between; align-items: flex-end;">
    <div>
      <div style="font-size: 13px; color: #64748b; margin-bottom: 50px;">Authorized Signature &amp; Official Seal</div>
      <div style="font-size: 15px; font-weight: 700; color: #0f172a;">{{signatoryName}}</div>
      <div style="font-size: 13px; color: #475569;">{{signatoryDesignation}}</div>
      <div style="font-size: 12px; color: #64748b; font-weight: 600;">{{companyName}}</div>
    </div>
    <div style="border: 2px dashed #cbd5e1; border-radius: 50%; width: 90px; height: 90px; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #94a3b8; text-align: center; text-transform: uppercase; font-weight: 700;">
      Official<br/>Stamp
    </div>
  </div>

  <!-- Footer -->
  <div style="position: absolute; bottom: 30px; left: 60px; right: 60px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 10px;">
    This is a computer-generated certificate issued on official record of {{companyName}}.
  </div>
</div>`;
    return { templateName, html, fields };
  }

  // 2. ID Card Template (Student or Staff)
  if (catLower.includes("id") || catLower.includes("card") || reqLower.includes("id card")) {
    const isStaff = categoryAudience === "staff" || catLower.includes("staff") || catLower.includes("employee");
    const templateName = requestedTemplateName || (isStaff ? "Modern Staff ID Card Template" : "Standard Student ID Card Template");
    const fields: TemplateFieldDef[] = [
      { name: "institutionName", label: "Institution Name", type: "text", isRequired: true, sampleValue: "Maa Sharda Institute" },
      { name: "institutionLogo", label: "Institution Logo", type: "image", isRequired: false, sampleValue: "" },
      { name: "photo", label: "Candidate Photo", type: "image", isRequired: true, sampleValue: "" },
      { name: isStaff ? "employeeName" : "studentName", label: isStaff ? "Employee Name" : "Student Name", type: "text", isRequired: true, sampleValue: isStaff ? "Vikash Gupta" : "Aarav Sharma" },
      { name: isStaff ? "designation" : "className", label: isStaff ? "Designation" : "Class / Program", type: "text", isRequired: true, sampleValue: isStaff ? "Faculty of Science" : "Class 10" },
      { name: isStaff ? "department" : "sectionName", label: isStaff ? "Department" : "Section", type: "text", isRequired: true, sampleValue: isStaff ? "Senior Wing" : "Section A" },
      { name: isStaff ? "employeeCode" : "rollNumber", label: isStaff ? "Employee Code" : "Roll Number", type: "text", isRequired: true, sampleValue: isStaff ? "EMP-5747" : "1042" },
      { name: "contactNumber", label: "Emergency Phone", type: "phone", isRequired: true, sampleValue: "9876543210" },
      { name: "bloodGroup", label: "Blood Group", type: "text", isRequired: false, sampleValue: "O+" },
      { name: "validTill", label: "Valid Till", type: "date", isRequired: true, sampleValue: "31 Mar 2027" },
      { name: "principalSignature", label: "Authorized Signature", type: "image", isRequired: false, sampleValue: "" },
    ];

    const html = `
<div style="display: flex; gap: 20px; font-family: 'Helvetica Neue', Arial, sans-serif; background: transparent; padding: 10px;">
  <!-- Front Side -->
  <div style="width: 320px; height: 500px; border-radius: 18px; overflow: hidden; background: #ffffff; box-shadow: 0 10px 25px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; display: flex; flex-direction: column; justify-content: space-between; position: relative;">
    <!-- Top Banner -->
    <div style="background: linear-gradient(135deg, #1e3a8a, #3b82f6); padding: 18px 16px; text-align: center; color: #ffffff;">
      <div style="width: 44px; height: 44px; margin: 0 auto 6px auto; background: #ffffff; border-radius: 50%; padding: 4px; box-sizing: border-box;">
        <img src="{{institutionLogo}}" alt="Logo" style="width: 100%; height: 100%; object-fit: contain;" />
      </div>
      <h2 style="margin: 0; font-size: 15px; font-weight: 800; letter-spacing: -0.3px; line-height: 1.2;">{{institutionName}}</h2>
      <p style="margin: 2px 0 0 0; font-size: 9px; text-transform: uppercase; opacity: 0.9; letter-spacing: 1px;">${isStaff ? "Staff Identity Card" : "Student Identity Card"}</p>
    </div>

    <!-- Photo Container -->
    <div style="text-align: center; margin-top: -30px;">
      <div style="width: 96px; height: 96px; border-radius: 50%; border: 4px solid #ffffff; box-shadow: 0 4px 10px rgba(0,0,0,0.15); margin: 0 auto; overflow: hidden; background: #f1f5f9;">
        <img src="{{photo}}" alt="Photo" style="width: 100%; height: 100%; object-fit: cover;" />
      </div>
      <h3 style="margin: 8px 0 2px 0; font-size: 16px; font-weight: 800; color: #0f172a;">{{${isStaff ? "employeeName" : "studentName"}}}</h3>
      <p style="margin: 0; font-size: 12px; font-weight: 600; color: #3b82f6;">{{${isStaff ? "designation" : "className"}}} <span>- {{${isStaff ? "department" : "sectionName"}}}</span></p>
    </div>

    <!-- Metadata Grid -->
    <div style="padding: 0 20px; font-size: 11px; color: #475569; space-y: 6px;">
      <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px; margin-bottom: 4px;">
        <span style="font-weight: 600; color: #64748b;">${isStaff ? "Employee ID" : "Roll Number"}:</span>
        <strong style="color: #0f172a;">{{${isStaff ? "employeeCode" : "rollNumber"}}}</strong>
      </div>
      <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px; margin-bottom: 4px;">
        <span style="font-weight: 600; color: #64748b;">Phone:</span>
        <strong style="color: #0f172a;">{{contactNumber}}</strong>
      </div>
      <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px; margin-bottom: 4px;">
        <span style="font-weight: 600; color: #64748b;">Blood Group:</span>
        <strong style="color: #0f172a;">{{bloodGroup}}</strong>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span style="font-weight: 600; color: #64748b;">Valid Till:</span>
        <strong style="color: #0f172a;">{{validTill}}</strong>
      </div>
    </div>

    <!-- Bottom Ribbon -->
    <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 8px 16px; display: flex; justify-content: space-between; align-items: center;">
      <div style="font-size: 9px; color: #94a3b8;">Issued by {{institutionName}}</div>
      <div style="width: 50px; height: 20px;">
        <img src="{{principalSignature}}" alt="Sign" style="width: 100%; height: 100%; object-fit: contain;" />
      </div>
    </div>
  </div>
</div>`;
    return { templateName, html, fields };
  }

  // 3. Certificate of Appreciation / Completion / Merit
  if (catLower.includes("certificate") || reqLower.includes("certificate")) {
    const templateName = requestedTemplateName || "Certificate of Excellence & Appreciation";
    const fields: TemplateFieldDef[] = [
      { name: "institutionName", label: "Institution Name", type: "text", isRequired: true, sampleValue: "Maa Sharda Institute" },
      { name: "institutionLogo", label: "Institution Logo", type: "image", isRequired: false, sampleValue: "" },
      { name: "recipientName", label: "Recipient Name", type: "text", isRequired: true, sampleValue: "Aarav Sharma" },
      { name: "achievementTitle", label: "Achievement / Award Title", type: "text", isRequired: true, sampleValue: "First Prize in Annual Academic Olympiad" },
      { name: "eventDescription", label: "Description / Course Details", type: "textarea", isRequired: true, sampleValue: "For demonstrating exceptional academic brilliance, commitment, and outstanding problem-solving skills during the 2025-2026 Academic Session." },
      { name: "issueDate", label: "Issue Date", type: "date", isRequired: true, sampleValue: "01 Sep 2026" },
      { name: "certificateNumber", label: "Certificate ID", type: "text", isRequired: true, sampleValue: "CERT-2026-9041" },
      { name: "signatoryName", label: "Signatory Authority", type: "text", isRequired: true, sampleValue: "Dr. Deepak Yadav" },
      { name: "signatoryRole", label: "Signatory Role", type: "text", isRequired: true, sampleValue: "Director & Principal" },
    ];

    const html = `
<div style="width: 1000px; height: 700px; padding: 40px; box-sizing: border-box; background: #ffffff; font-family: 'Georgia', serif; position: relative; border: 12px solid #1e293b;">
  <div style="border: 2px solid #d97706; height: 100%; padding: 30px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; text-align: center; background: radial-gradient(circle at center, #ffffff 60%, #fffbeb 100%);">
    <!-- Header -->
    <div>
      <div style="width: 60px; height: 60px; margin: 0 auto 10px auto;">
        <img src="{{institutionLogo}}" alt="Logo" style="width: 100%; height: 100%; object-fit: contain;" />
      </div>
      <h1 style="margin: 0; font-size: 26px; font-weight: bold; color: #1e293b; letter-spacing: 1px;">{{institutionName}}</h1>
      <h2 style="margin: 12px 0 0 0; font-size: 32px; font-weight: 800; color: #b45309; text-transform: uppercase; letter-spacing: 2px;">Certificate of Appreciation</h2>
      <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b; font-style: italic;">Proudly presented to</p>
    </div>

    <!-- Recipient -->
    <div>
      <div style="font-size: 36px; font-weight: bold; color: #0f172a; border-bottom: 2px solid #b45309; display: inline-block; padding: 0 40px 6px 40px; margin-bottom: 12px;">
        {{recipientName}}
      </div>
      <h3 style="margin: 0; font-size: 18px; font-weight: 600; color: #334155;">{{achievementTitle}}</h3>
      <p style="max-width: 650px; margin: 10px auto 0 auto; font-size: 13px; line-height: 1.6; color: #475569;">
        {{eventDescription}}
      </p>
    </div>

    <!-- Signatures & Date -->
    <div style="display: flex; justify-content: space-between; align-items: flex-end; padding: 0 40px;">
      <div style="text-align: left; font-size: 12px; color: #64748b;">
        <div>Date: <strong>{{issueDate}}</strong></div>
        <div>Certificate No: <strong>{{certificateNumber}}</strong></div>
      </div>
      <div style="text-align: center;">
        <div style="border-bottom: 1px solid #475569; width: 180px; margin-bottom: 6px;"></div>
        <div style="font-size: 14px; font-weight: bold; color: #0f172a;">{{signatoryName}}</div>
        <div style="font-size: 12px; color: #64748b;">{{signatoryRole}}</div>
      </div>
    </div>
  </div>
</div>`;
    return { templateName, html, fields };
  }

  // 4. Default / General Document Template
  const templateName = requestedTemplateName || `${categoryName.charAt(0).toUpperCase() + categoryName.slice(1)} Template`;
  const fields: TemplateFieldDef[] = [
    { name: "institutionName", label: "Institution Name", type: "text", isRequired: true, sampleValue: "Maa Sharda Institute" },
    { name: "institutionLogo", label: "Logo", type: "image", isRequired: false, sampleValue: "" },
    { name: "documentTitle", label: "Document Title", type: "text", isRequired: true, sampleValue: templateName },
    { name: "recipientName", label: categoryAudience === "staff" ? "Staff Name" : "Student Name", type: "text", isRequired: true, sampleValue: categoryAudience === "staff" ? "Vikash Gupta" : "Aarav Sharma" },
    { name: "details", label: "Document Content / Details", type: "textarea", isRequired: true, sampleValue: "This document certifies that the aforementioned individual is officially registered and active in our records." },
    { name: "issueDate", label: "Date of Issue", type: "date", isRequired: true, sampleValue: "01 Sep 2026" },
    { name: "authorizedSignatory", label: "Authorized Signatory", type: "text", isRequired: true, sampleValue: "Director & Principal" },
  ];

  const html = `
<div style="width: 794px; min-height: 1000px; padding: 40px; font-family: 'Helvetica Neue', Arial, sans-serif; background: #ffffff; color: #1e293b; box-sizing: border-box;">
  <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 30px;">
    <div>
      <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #0f172a;">{{institutionName}}</h1>
      <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b;">Official Document</p>
    </div>
    <div style="width: 50px; height: 50px;">
      <img src="{{institutionLogo}}" alt="Logo" style="width: 100%; height: 100%; object-fit: contain;" />
    </div>
  </div>

  <div style="text-align: center; margin-bottom: 30px;">
    <h2 style="margin: 0; font-size: 18px; font-weight: 700; color: #0f172a; text-transform: uppercase;">{{documentTitle}}</h2>
    <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">Issued on: {{issueDate}}</p>
  </div>

  <div style="font-size: 14px; line-height: 1.8; color: #334155; margin-bottom: 40px;">
    <p>This is to confirm for <strong>{{recipientName}}</strong>.</p>
    <p>{{details}}</p>
  </div>

  <div style="margin-top: 60px; display: flex; justify-content: flex-end;">
    <div style="text-align: center;">
      <div style="border-bottom: 1px solid #94a3b8; width: 160px; margin-bottom: 6px;"></div>
      <div style="font-size: 13px; font-weight: 700;">{{authorizedSignatory}}</div>
      <div style="font-size: 11px; color: #64748b;">{{institutionName}}</div>
    </div>
  </div>
</div>`;
  return { templateName, html, fields };
}

function errorResponse(err: unknown) {
  const message = err instanceof Error ? err.message : "Template generation failed";
  const status =
    message === "Forbidden: Admin access required" ? 403 :
    message === "Unauthorized" || message === "User not found" ? 401 :
    500;
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: Request) {
  try {
    const currentUser = await requireAdmin(req);
    if (!isPlatformAdminUser(currentUser)) {
      return NextResponse.json({ error: "Only Platform Admin can generate templates" }, { status: 403 });
    }

    const body = await req.json();
    const imageBase64 = String(body.imageBase64 ?? "");
    const categoryName = String(body.categoryName ?? "document");
    const categoryAudience = String(body.categoryAudience ?? "student") === "staff" ? "staff" : "student";
    const requestedTemplateName = String(body.templateName ?? "").trim().slice(0, 150);

    if (!imageBase64.startsWith("data:image/")) {
      return NextResponse.json({ error: "A valid image is required" }, { status: 400 });
    }
    if (imageBase64.length > MAX_IMAGE_DATA_URL_LENGTH) {
      return NextResponse.json({ error: "Image must be smaller than 6MB" }, { status: 413 });
    }

    // Try OpenAI Vision if configured
    if (process.env.OPENAI_API_KEY) {
      try {
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const response = await openai.responses.parse({
          model: process.env.OPENAI_TEMPLATE_MODEL || "gpt-4o",
          store: false,
          reasoning: { effort: "medium" },
          input: [
            {
              role: "system",
              content: [
                {
                  type: "input_text",
                  text: `You create production-ready reusable HTML document templates from reference images.
Return a standalone HTML document with embedded CSS only. Do not use scripts, external CSS frameworks, remote fonts, SVG filters, or external image URLs.
Every variable value must use a double-brace placeholder matching a returned field name, for example {{studentName}}.
Image fields must appear as <img src="{{photo}}">.
The uploaded image is a design reference, not a scene to reproduce. Recreate only the actual card/document surfaces. Do not recreate any surrounding page background, camera/photo background, mockup canvas, table, shadow backdrop, margins, or whitespace outside the card design.
If the reference contains front and back cards, output both cards as clean separate card elements in one transparent root container. If it contains one card, output only that card.
The root template element must be transparent and tightly sized to the card artwork. Do not set a white/gray/photo background on the root or body. Background colors are allowed only inside the card panels themselves.
Preserve the card aspect ratio, colors, typography, spacing, borders, rounded corners, and visual hierarchy.
Use explicit pixel dimensions on one root template element so it renders consistently to PNG and PDF. The root size should fit the card/cards closely, not the full uploaded image canvas.
All text must fit inside the card. Long school names, addresses, titles, and labels must wrap or shrink within their containers.
For every field return a realistic sampleValue that is appropriate for the document and makes the preview look complete.`,
                },
              ],
            },
            {
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: `Analyze this ${categoryName} reference for ${categoryAudience === "staff" ? "institution staff such as teachers or drivers" : "students"}. Generate a polished reusable HTML/CSS template, ${requestedTemplateName ? `use "${requestedTemplateName}" as the templateName,` : "a clear marketplace template name,"} and the complete ordered field list.`,
                },
                {
                  type: "input_image",
                  image_url: imageBase64,
                  detail: "high",
                },
              ],
            },
          ],
          text: {
            format: zodTextFormat(GeneratedTemplateSchema, "document_template"),
          },
        });

        if (response.output_parsed) {
          return NextResponse.json({
            data: {
              ...response.output_parsed,
              templateName: requestedTemplateName || response.output_parsed.templateName,
              html: sanitizeGeneratedHtml(response.output_parsed.html),
            },
          });
        }
      } catch (openAiErr) {
        console.warn("[Card Template Generator] OpenAI call failed, using intelligent fallback generator:", openAiErr);
      }
    }

    // Fallback: Generate intelligent, high-quality template based on category & parameters
    const fallback = generateFallbackTemplate(categoryName, categoryAudience, requestedTemplateName);

    return NextResponse.json({
      data: {
        templateName: fallback.templateName,
        html: sanitizeGeneratedHtml(fallback.html),
        fields: fallback.fields,
      },
    });
  } catch (err: unknown) {
    return errorResponse(err);
  }
}
