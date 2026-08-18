import { NextResponse } from "next/server";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/auth";
import { isPlatformAdminUser } from "@/lib/auth/permissions";
import { DOCUMENT_FIELD_TYPES } from "@/lib/types/document-template";

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
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OpenAI is not configured" }, { status: 500 });
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

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.responses.parse({
      model: process.env.OPENAI_TEMPLATE_MODEL || "gpt-5.5",
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
Improve the reference when needed so the final template is production ready: center the student photo, school logo, headings, footer logo, barcode, and signature in their intended areas; align front/back cards evenly; keep side ribbons and bottom branding balanced.
Never paste or recreate the uploaded card image as a nested screenshot inside the generated card. Rebuild the design with HTML/CSS shapes, text, and placeholders only.
All text must fit inside the card. Long school names, addresses, titles, and labels must wrap or shrink within their containers using max-width, line-height, overflow-wrap:anywhere, text-align:center where appropriate, and overflow:hidden only when clipping is intentional. Do not let text bleed outside rounded cards, navy panels, footers, or white content boxes.
School names and subtitles should be centered with the logo and must remain readable even when the institution name is long. Prefer two-line wrapping over horizontal clipping.
For every field return a realistic sampleValue that is appropriate for the document and makes the preview look complete. Use coherent mock data, not labels, placeholder words, lorem ipsum, "dummy", "test", or repeated generic values. Keep related values consistent, such as school name, student name, class, roll number, dates, marks, certificate details, addresses, and contact information. For image fields return an empty sampleValue because the application supplies the uploaded image.
Return separately mappable fields. Never combine two database values into one placeholder. In particular, do not create names like classSection, classAndSection, studentClassSection, classWithSection, or programSection. Use separate fields such as className or programName and sectionName. Also keep institution values separate from student values, for example schoolName, schoolLogo, schoolEmail, schoolPhone, schoolWebsite, schoolAddress, principalName, studentName, className, sectionName, rollNumber, admissionNumber, and dateOfBirth.
When the visual design displays class and section together, write the HTML with two placeholders near each other, for example <span>{{className}}</span> - <span>{{sectionName}}</span>. Return both fields separately in the fields array. Never return only one combined class/section field.
Do not include editable form controls inside the generated HTML.`,
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Analyze this ${categoryName} reference for ${categoryAudience === "staff" ? "institution staff such as teachers or drivers" : "students"}. Generate a polished reusable HTML/CSS template, ${requestedTemplateName ? `use "${requestedTemplateName}" as the templateName,` : "a clear marketplace template name,"} and the complete ordered field list. Crop mentally to the real card/document only and remove any surrounding background from the generated design. Improve alignment and spacing where the reference is imperfect. If the design shows class and section together, still return two separate placeholders/fields for class or program and section, and place both placeholders in the HTML.`,
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

    if (!response.output_parsed) {
      return NextResponse.json({ error: "AI did not return a template" }, { status: 502 });
    }

    return NextResponse.json({
      data: {
        ...response.output_parsed,
        templateName: requestedTemplateName || response.output_parsed.templateName,
        html: sanitizeGeneratedHtml(response.output_parsed.html),
      },
    });
  } catch (err: unknown) {
    return errorResponse(err);
  }
}
