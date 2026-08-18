import { randomUUID } from "crypto";

import { AiProvider, BuiltInAiContentField, BuiltInAiContentTemplate, AiScholarshipResponse } from "@/lib/types/ai";

type QwenSessionState = {
    chat_id?: string | null;
    last_response_id?: string | null;
};

function buildEndpoint(baseUrl: string, chatId?: string | null) {
    const trimmed = baseUrl.trim().replace(/\/$/, "");
    if (/chat\/completions$/i.test(trimmed)) {
        return chatId ? `${trimmed}${trimmed.includes("?") ? "&" : "?"}chat_id=${encodeURIComponent(chatId)}` : trimmed;
    }
    if (/chat\.qwen\.ai/i.test(trimmed)) {
        const endpoint = trimmed.includes("/api/v2/") ? trimmed : `${trimmed}/api/v2/chat/completions`;
        return chatId ? `${endpoint}${endpoint.includes("?") ? "&" : "?"}chat_id=${encodeURIComponent(chatId)}` : endpoint;
    }
    if (/\/v1$/i.test(trimmed)) {
        return `${trimmed}/chat/completions`;
    }
    return `${trimmed}/v1/chat/completions`;
}

function parseCredentialHeaders(token?: string | null) {
    const raw = token?.trim();
    if (!raw) return {};
    const headerKeys = new Set([
        "accept",
        "content-type",
        "origin",
        "referer",
        "source",
        "version",
        "user-agent",
        "bx-v",
        "bx-ua",
        "bx-umidtoken",
        "cookie",
        "x-request-id",
    ]);

    try {
        const parsed = JSON.parse(raw) as unknown;
        const source = asRecord(parsed);
        const headers = asRecord(source?.headers) ?? source;
        const result: Record<string, string> = {};
        for (const [key, value] of Object.entries(headers ?? {})) {
            const normalizedKey = key.toLowerCase();
            if (headerKeys.has(normalizedKey) && typeof value === "string" && value.trim()) result[normalizedKey] = value.trim();
        }
        return result;
    } catch {
        const result: Record<string, string> = {};
        const jsHeaderPattern = /["']([A-Za-z0-9-]+)["']\s*:\s*["`]([^"`']*)["`]/g;
        for (const match of raw.matchAll(jsHeaderPattern)) {
            const normalizedKey = match[1].toLowerCase();
            if (headerKeys.has(normalizedKey) && match[2].trim()) {
                result[normalizedKey] = match[2].trim();
            }
        }
        if (Object.keys(result).length) return result;

        if (raw.includes("=") && (raw.includes(";") || raw.startsWith("token="))) {
            return { cookie: raw };
        }
        return { cookie: `token=${raw};` };
    }
}

function buildQwenHeaders(provider: AiProvider, chatId?: string | null) {
    const credentialHeaders = parseCredentialHeaders(provider.token);
    return {
        accept: "application/json",
        "content-type": "application/json",
        origin: "https://chat.qwen.ai",
        referer: chatId ? `https://chat.qwen.ai/c/${chatId}` : "https://chat.qwen.ai/",
        source: "web",
        version: "0.2.66",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36",
        "bx-v": "2.5.36",
        "x-request-id": randomUUID(),
        ...credentialHeaders,
    };
}

function stripMarkdownJsonFence(text: string) {
    return text
        .trim()
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
}

function extractJson(text: string) {
    const trimmed = stripMarkdownJsonFence(text);
    const firstObject = trimmed.indexOf("{");
    const lastObject = trimmed.lastIndexOf("}");
    if (firstObject >= 0 && lastObject > firstObject) return trimmed.slice(firstObject, lastObject + 1);

    const firstArray = trimmed.indexOf("[");
    const lastArray = trimmed.lastIndexOf("]");
    if (firstArray >= 0 && lastArray > firstArray) return trimmed.slice(firstArray, lastArray + 1);

    return trimmed;
}

function asRecord(value: unknown): Record<string, unknown> | null {
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function nestedString(record: Record<string, unknown> | null, path: string[]) {
    let current: unknown = record;
    for (const key of path) {
        const currentRecord = asRecord(current);
        if (!currentRecord) return "";
        current = currentRecord[key];
    }
    return typeof current === "string" ? current : "";
}

function extractQwenChunkText(payload: unknown) {
    const root = asRecord(payload);
    if (!root) return "";

    const parts: string[] = [
        nestedString(root, ["content"]),
        nestedString(root, ["text"]),
        nestedString(root, ["message", "content"]),
        nestedString(root, ["output", "text"]),
    ];

    const choices = Array.isArray(root.choices) ? root.choices : [];
    for (const choice of choices) {
        const choiceRecord = asRecord(choice);
        parts.push(
            nestedString(choiceRecord, ["delta", "content"]),
            nestedString(choiceRecord, ["delta", "phase", "content"]),
            nestedString(choiceRecord, ["delta", "phase", "text"]),
            nestedString(choiceRecord, ["message", "content"]),
            nestedString(choiceRecord, ["content"]),
            nestedString(choiceRecord, ["text"])
        );
    }

    return parts.join("");
}

function extractQwenResponseId(payload: unknown) {
    const root = asRecord(payload);
    if (!root) return null;

    const responseCreated = asRecord(root["response.created"]);
    const responseId = responseCreated?.response_id;
    if (typeof responseId === "string" && responseId) return responseId;

    const directResponseId = root.response_id;
    if (typeof directResponseId === "string" && directResponseId) return directResponseId;

    const response = asRecord(root.response);
    const nestedResponseId = response?.id ?? response?.response_id;
    return typeof nestedResponseId === "string" && nestedResponseId ? nestedResponseId : null;
}

async function createQwenChat(provider: AiProvider, headers: Record<string, string>) {
    const response = await fetch("https://chat.qwen.ai/api/v2/chats/new", {
        method: "POST",
        headers: {
            ...headers,
            referer: "https://chat.qwen.ai/",
        },
        body: JSON.stringify({
            title: "New Chat",
            models: [provider.model_name || "qwen3.7-plus"],
            chat_mode: "normal",
            chat_type: "t2t",
            timestamp: Date.now(),
            project_id: "",
        }),
    });

    const raw = await response.text();
    if (isQwenValidationChallenge(raw)) {
        throw new Error(raw);
    }
    if (!response.ok) return null;

    try {
        const parsed = JSON.parse(raw);
        const chatId = parsed?.data?.id;
        return parsed?.success && typeof chatId === "string" ? chatId : null;
    } catch {
        return null;
    }
}

function isMissingQwenChat(raw: string) {
    try {
        const parsed = JSON.parse(raw);
        const details = parsed?.data?.details ?? parsed?.message ?? parsed?.error ?? "";
        return typeof details === "string" && /not exist|is not exist/i.test(details);
    } catch {
        return /not exist|is not exist/i.test(raw);
    }
}

function isQwenValidationChallenge(raw: string) {
    try {
        const parsed = JSON.parse(raw);
        const ret = Array.isArray(parsed?.ret) ? parsed.ret.join(" ") : "";
        const challengeUrl = typeof parsed?.data?.url === "string" ? parsed.data.url : "";
        return /FAIL_SYS_USER_VALIDATE|RGV587_ERROR/i.test(ret) || /action=captcha|punish/i.test(challengeUrl);
    } catch {
        return /FAIL_SYS_USER_VALIDATE|RGV587_ERROR|action=captcha|punish/i.test(raw);
    }
}

async function readQwenStream(response: Response) {
    let raw = "";
    let fullText = "";
    let receivedResponseId: string | null = null;

    if (!response.body) return { raw, fullText, receivedResponseId };

    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    for await (const chunk of response.body as unknown as AsyncIterable<Uint8Array>) {
        buffer += decoder.decode(chunk, { stream: true });
        let boundary = buffer.indexOf("\n");

        while (boundary !== -1) {
            const line = buffer.substring(0, boundary).trim();
            buffer = buffer.substring(boundary + 1);
            raw += `${line}\n`;

            if (line) {
                const lineContent = line.startsWith("data:") ? line.replace(/^data:\s*/, "").trim() : line;
                if (lineContent && lineContent !== "[DONE]") {
                    try {
                        const parsed = JSON.parse(lineContent);
                        receivedResponseId = extractQwenResponseId(parsed) ?? receivedResponseId;
                        fullText += extractQwenChunkText(parsed);
                    } catch {
                        // Ignore non-JSON stream fragments, matching the CLI script behavior.
                    }
                }
            }

            boundary = buffer.indexOf("\n");
        }
    }

    if (buffer.trim()) raw += buffer.trim();
    return { raw, fullText, receivedResponseId };
}

function repairJsonCandidate(candidate: string) {
    return candidate
        .replace(/[\u201C\u201D]/g, "\"")
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/,\s*([}\]])/g, "$1")
        .replace(/([{,]\s*)([A-Za-z_$][\w$-]*)\s*:/g, "$1\"$2\":")
        .replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, (_match, value: string) => `"${value.replace(/"/g, "\\\"")}"`);
}

function parseAiJson(text: string) {
    const candidate = extractJson(text);
    const attempts = Array.from(new Set([candidate, repairJsonCandidate(candidate)]));
    let lastError: unknown;

    for (const attempt of attempts) {
        try {
            return JSON.parse(attempt) as unknown;
        } catch (error) {
            lastError = error;
        }
    }

    if (lastError instanceof Error) {
        throw new Error(`AI response was not valid JSON. ${lastError.message}`);
    }
    throw new Error("AI response was not valid JSON.");
}

function toLabel(fieldKey: string) {
    return fieldKey
        .replace(/[_-]+/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase())
        .trim();
}

function buildContentPrompt(input: {
    contentType: BuiltInAiContentTemplate;
    institutionName: string;
    context?: string | null;
    tweakMessage?: string | null;
    fieldList: string;
    enabledFields: BuiltInAiContentField[];
}) {
    const { contentType, institutionName, context, tweakMessage, fieldList, enabledFields } = input;

    const fieldKeys = enabledFields.map((field) => field.field_key.toLowerCase());
    const hasAboutField = fieldKeys.some((fieldKey) => ["about", "description", "summary"].includes(fieldKey));
    const hasHistoryField = fieldKeys.some((fieldKey) => ["history", "institution_history"].includes(fieldKey));
    const hasHighlightsField = fieldKeys.some((fieldKey) => ["key_highlights", "highlights"].includes(fieldKey));
    const hasContactFields = ["email", "phone", "website_url", "establish_year", "established_year"].some((fieldKey) => fieldKeys.includes(fieldKey));
    const arrayFieldKeys = new Set([
        "key_highlights",
        "highlights",
        "eligibility",
        "required_documents",
        "scholarship_amount",
        "application_process",
        "financial_assistance",
        "year_wise_cutoffs",
        "notes",
        "facilities",
    ]);

    const requiredFields = enabledFields.reduce<Record<string, { type: string; required: boolean; instruction: string }>>((accumulator, field) => {
        const normalizedKey = field.field_key.toLowerCase();
        const expectsArray = arrayFieldKeys.has(normalizedKey);
        const expectsYearwiseCutoffs = normalizedKey === "year_wise_cutoffs";
        const expectsFacilities = normalizedKey === "facilities";
        accumulator[field.field_key] = {
            type: expectsArray ? "array" : "string",
            required: true,
            instruction: expectsFacilities
                ? "Return an array of facility objects. Each object must include facility_type_id, facility_type, title, description, and optional highlights array. Include exactly one object per selected facility type from context."
                : expectsYearwiseCutoffs
                ? "Return an array of verified year sections. Each section should include year, exam_name when known, and rows/cutoffs with category, quota, program/branch, round fields, cutoff, rank, or marks only when verified."
                : expectsArray
                ? `Return clean, useful ${toLabel(field.field_key).toLowerCase()} items for ${contentType.name} as an array of strings.`
                : `Write a clean, useful ${toLabel(field.field_key).toLowerCase()} section for ${contentType.name}.`,
        };
        return accumulator;
    }, {});

    const responseExample = enabledFields.reduce<Record<string, unknown>>((accumulator, field) => {
        const normalizedKey = field.field_key.toLowerCase();
        if (["about", "description", "summary"].includes(normalizedKey)) {
            accumulator[field.field_key] = [
                `${institutionName} is a well-established institution with a strong academic profile and student-focused learning environment.`,
                `It provides credible, practical education supported by experienced faculty, relevant facilities, and a clear focus on long-term student outcomes.`,
            ].join("\n\n");
            return accumulator;
        }

        if (["history", "institution_history"].includes(normalizedKey)) {
            accumulator[field.field_key] = `${institutionName} has a documented institutional history that reflects its growth, educational mission, and local relevance.`;
            return accumulator;
        }

        if (["key_highlights", "highlights"].includes(normalizedKey)) {
            accumulator[field.field_key] = [
                "Recognized academic track record",
                "Experienced faculty and student support",
                "Modern campus infrastructure",
                "Program variety and practical learning focus",
            ];
            return accumulator;
        }

        if (["eligibility", "required_documents", "scholarship_amount", "application_process", "financial_assistance"].includes(normalizedKey)) {
            accumulator[field.field_key] = [
                `Sample ${toLabel(field.field_key).toLowerCase()} item 1`,
                `Sample ${toLabel(field.field_key).toLowerCase()} item 2`,
                `Sample ${toLabel(field.field_key).toLowerCase()} item 3`,
            ];
            return accumulator;
        }

        if (normalizedKey === "year_wise_cutoffs") {
            accumulator[field.field_key] = [
                {
                    year: "2024",
                    exam_name: "Verified exam name",
                    rows: [
                        {
                            category: "General",
                            round_1: "Verified cutoff value",
                        },
                    ],
                },
            ];
            return accumulator;
        }

        if (normalizedKey === "facilities") {
            accumulator[field.field_key] = [
                {
                    facility_type_id: 1,
                    facility_type: "Library",
                    title: "Library",
                    description: `${institutionName} provides a library facility that supports reading, reference work, assignments, and academic preparation.`,
                    highlights: [
                        "Student-friendly study support",
                        "Useful academic resources",
                        "Suitable space for reading and preparation",
                    ],
                },
            ];
            return accumulator;
        }

        if (["email", "contact_email"].includes(normalizedKey)) {
            accumulator[field.field_key] = "info@example.com";
            return accumulator;
        }

        if (["phone", "contact_phone", "contact_number"].includes(normalizedKey)) {
            accumulator[field.field_key] = "9876543210";
            return accumulator;
        }

        if (["website_url", "website", "url"].includes(normalizedKey)) {
            accumulator[field.field_key] = "https://example.com";
            return accumulator;
        }

        if (["establish_year", "established_year", "year_established"].includes(normalizedKey)) {
            accumulator[field.field_key] = "2000";
            return accumulator;
        }

        accumulator[field.field_key] = [`Sample ${toLabel(field.field_key).toLowerCase()} item 1`, `Sample ${toLabel(field.field_key).toLowerCase()} item 2`];
        return accumulator;
    }, {});

    const aboutRules: string[] = [];
    if (hasAboutField) {
        aboutRules.push(
            "For about/description/summary, write at least 2 substantial paragraphs.",
            "Keep the about text informative and complete, around 180 to 260 words when possible.",
            "Include the institution overview, academic profile, history, campus strengths, and notable qualities without shortening the content too much.",
            "Do not include email, phone, website, or established year inside the about body unless the field list explicitly requires it."
        );
    }
    if (hasHistoryField) {
        aboutRules.push("For history, provide a full paragraph with the founding context and institutional growth.");
    }
    if (hasHighlightsField) {
        aboutRules.push("For key_highlights/highlights, return 4 to 6 concise bullet strings.");
    }
    if (hasContactFields) {
        aboutRules.push("For email, phone, website_url, and establish_year, return only the exact scalar value for each field.");
    }

    return JSON.stringify({
        prompt_template: contentType.prompt_template.trim(),
        task: `Generate ${contentType.name.toLowerCase()} content using verified real internet data only`,
        response_format: "strict_json",
        rules: {
            return_valid_json_only: true,
            no_extra_text: true,
            no_markdown: true,
            no_html: true,
            no_jsx: true,
            use_real_time_data: true,
            strict_fact_checking: true,
            verify_before_writing: true,
            search_deeply_for_topic: true,
            do_not_hallucinate: true,
            never_generate_fake_information: true,
            never_assume_missing_values: true,
            only_use_verified_information: true,
            skip_unverified_information: true,
            remove_citations: true,
            remove_reference_numbers: true,
            remove_square_brackets: true,
            remove_source_references: true,
            clean_response_before_return: true,
            exclude_unrelated_sections: true,
            keep_response_clean: true,
            keep_response_medium_length: true,
            allow_extra_json_headings_from_tweak_message: true,
            extra_headings_format: "Use snake_case top-level keys. Values should be a string or an array of strings.",
            ...(aboutRules.length ? { about_content_rules: aboutRules } : {}),
        },
        required_fields: requiredFields,
        response_example: responseExample,
        data: {
            institution: institutionName,
            content_type: contentType.slug,
            context: context?.trim() || null,
            tweak_message: tweakMessage?.trim() || null,
            enabled_fields: fieldList,
        },
    });
}

export async function generateContentWithProvider(options: {
    provider: AiProvider;
    contentType: BuiltInAiContentTemplate;
    fields: BuiltInAiContentField[];
    institutionName: string;
    context?: string | null;
    tweakMessage?: string | null;
}) {
    const { provider, contentType, fields, institutionName, context, tweakMessage } = options;
    const enabledFields = fields.filter((field) => field.is_enabled).sort((a, b) => a.sort_order - b.sort_order);
    const fieldList = enabledFields.map((field) => `- ${field.field_key}: ${field.label}`).join("\n");

    const endpoint = buildEndpoint(provider.base_url, provider.chat_id);
    const isQwenEndpoint = /chat\.qwen\.ai/i.test(endpoint);
    const contentPrompt = buildContentPrompt({
        contentType,
        institutionName,
        context,
        tweakMessage,
        fieldList,
        enabledFields,
    });
    const qwenMessageId = randomUUID();
    const payload = isQwenEndpoint
        ? {
            stream: true,
            version: "2.1",
            incremental_output: true,
            chat_id: provider.chat_id || undefined,
            chat_mode: "normal",
            model: provider.model_name || undefined,
            parent_id: provider.last_response_id || null,
            messages: [
                {
                    fid: qwenMessageId,
                    parentId: provider.last_response_id || null,
                    childrenIds: [],
                    role: "user",
                    content: contentPrompt,
                    user_action: "chat",
                    files: [],
                    timestamp: Math.floor(Date.now() / 1000),
                    models: [provider.model_name || "qwen3.7-plus"],
                    chat_type: "t2t",
                    feature_config: {
                        thinking_enabled: false,
                        output_schema: "phase",
                        research_mode: "normal",
                        auto_thinking: true,
                        thinking_mode: "Fast",
                        auto_search: true,
                    },
                    extra: {
                        meta: {
                            subChatType: "t2t",
                        },
                    },
                    sub_chat_type: "t2t",
                    parent_id: provider.last_response_id || null,
                },
            ],
            timestamp: Math.floor(Date.now() / 1000),
        }
        : {
            model: provider.model_name || undefined,
            messages: [
                {
                    role: "system",
                    content: "You generate structured educational content. Return JSON only.",
                },
                {
                    role: "user",
                    content: [
                        contentType.prompt_template.trim(),
                        "",
                        `Institution: ${institutionName}`,
                        `Content type: ${contentType.slug}`,
                        "",
                        "Return valid JSON only with these enabled fields:",
                        fieldList,
                        context ? `\nContext:\n${context.trim()}` : "",
                        tweakMessage ? `\nUser tweak request:\n${tweakMessage.trim()}` : "",
                    ].join("\n"),
                },
            ],
            stream: false,
        };

    console.log("[AI][Provider] outgoing request", {
        endpoint,
        provider: {
            id: provider.id,
            slug: provider.slug,
            base_url: provider.base_url,
            chat_id: provider.chat_id,
            has_last_response_id: Boolean(provider.last_response_id),
            model_name: provider.model_name,
            has_token: Boolean(provider.token),
        },
        payload: JSON.stringify(payload, null, 2),
    });

    const start = Date.now();
    let raw = "";
    let session: QwenSessionState = {
        chat_id: provider.chat_id,
        last_response_id: provider.last_response_id,
    };

    const messageContent = isQwenEndpoint
        ? await (async () => {
            let chatId = provider.chat_id || null;
            let lastResponseId = provider.last_response_id || null;

            for (let attempt = 0; attempt < 2; attempt += 1) {
                const qwenEndpoint = buildEndpoint(provider.base_url, chatId);
                const headers = buildQwenHeaders(provider, chatId);
                const qwenPayload = {
                    ...payload,
                    chat_id: chatId || undefined,
                    parent_id: lastResponseId,
                    messages: [
                        {
                            ...payload.messages[0],
                            parentId: lastResponseId,
                            parent_id: lastResponseId,
                        },
                    ],
                };

                const response = await fetch(qwenEndpoint, {
                    method: "POST",
                    headers,
                    body: JSON.stringify(qwenPayload),
                });

                raw = await response.text();
                const contentType = response.headers.get("content-type") ?? "";

                if (!contentType.includes("text/event-stream")) {
                    if (isQwenValidationChallenge(raw)) {
                        throw new Error(raw);
                    }
                    if (isMissingQwenChat(raw)) {
                        const newChatId = await createQwenChat(provider, headers);
                        if (newChatId) {
                            chatId = newChatId;
                            lastResponseId = null;
                            session = { chat_id: chatId, last_response_id: lastResponseId };
                            continue;
                        }
                    }
                    throw new Error(raw || `AI provider request failed with status ${response.status}`);
                }

                let fullText = "";
                let receivedResponseId: string | null = null;
                for (const line of raw.split(/\r?\n/)) {
                    if (!line) continue;
                    const lineContent = line.startsWith("data:") ? line.replace(/^data:\s*/, "").trim() : line.trim();
                    if (!lineContent || lineContent === "[DONE]") continue;
                    try {
                        const parsed = JSON.parse(lineContent);
                        receivedResponseId = extractQwenResponseId(parsed) ?? receivedResponseId;
                        fullText += extractQwenChunkText(parsed);
                    } catch {
                        continue;
                    }
                }

                session = {
                    chat_id: chatId,
                    last_response_id: receivedResponseId || lastResponseId,
                };
                return fullText || raw;
            }

            throw new Error("AI provider request failed after refreshing the Qwen chat");
        })()
        : await (async () => {
            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(provider.token ? { Authorization: `Bearer ${provider.token}` } : {}),
                },
                body: JSON.stringify(payload),
            });

            raw = await response.text();
            if (!response.ok) {
                throw new Error(raw || "AI provider request failed");
            }

            const json = JSON.parse(raw);
            return json?.choices?.[0]?.message?.content ?? json?.message?.content ?? json?.content ?? raw;
        })();

    const parsed = parseAiJson(messageContent);

    return {
        elapsed_ms: Date.now() - start,
        data: parsed as AiScholarshipResponse,
        raw,
        session,
    };
}

export async function generateJsonWithProvider(options: {
    provider: AiProvider;
    prompt: string;
}) {
    const { provider, prompt } = options;
    const endpoint = buildEndpoint(provider.base_url, provider.chat_id);
    const isQwenEndpoint = /chat\.qwen\.ai/i.test(endpoint);
    const qwenMessageId = randomUUID();
    const start = Date.now();
    let raw = "";
    let session: QwenSessionState = {
        chat_id: provider.chat_id,
        last_response_id: provider.last_response_id,
    };

    const messageContent = isQwenEndpoint
        ? await (async () => {
            let chatId = provider.chat_id || null;
            let lastResponseId = provider.last_response_id || null;

            for (let attempt = 0; attempt < 2; attempt += 1) {
                const qwenEndpoint = buildEndpoint(provider.base_url, chatId);
                const headers = buildQwenHeaders(provider, chatId);
                const qwenPayload = {
                    stream: true,
                    version: "2.1",
                    incremental_output: true,
                    chat_id: chatId || undefined,
                    chat_mode: "normal",
                    model: provider.model_name || undefined,
                    parent_id: lastResponseId,
                    messages: [
                        {
                            fid: qwenMessageId,
                            parentId: lastResponseId,
                            childrenIds: [],
                            role: "user",
                            content: prompt,
                            user_action: "chat",
                            files: [],
                            timestamp: Math.floor(Date.now() / 1000),
                            models: [provider.model_name || "qwen3.7-plus"],
                            chat_type: "t2t",
                            feature_config: {
                                thinking_enabled: false,
                                output_schema: "phase",
                                research_mode: "normal",
                                auto_thinking: true,
                                thinking_mode: "Fast",
                                auto_search: false,
                            },
                            extra: {
                                meta: {
                                    subChatType: "t2t",
                                },
                            },
                            sub_chat_type: "t2t",
                            parent_id: lastResponseId,
                        },
                    ],
                    timestamp: Math.floor(Date.now() / 1000),
                };

                const response = await fetch(qwenEndpoint, {
                    method: "POST",
                    headers,
                    body: JSON.stringify(qwenPayload),
                });

                raw = await response.text();
                const contentType = response.headers.get("content-type") ?? "";

                if (!contentType.includes("text/event-stream")) {
                    if (isQwenValidationChallenge(raw)) {
                        throw new Error(raw);
                    }
                    if (isMissingQwenChat(raw)) {
                        const newChatId = await createQwenChat(provider, headers);
                        if (newChatId) {
                            chatId = newChatId;
                            lastResponseId = null;
                            session = { chat_id: chatId, last_response_id: lastResponseId };
                            continue;
                        }
                    }
                    throw new Error(raw || `AI provider request failed with status ${response.status}`);
                }

                let fullText = "";
                let receivedResponseId: string | null = null;
                for (const line of raw.split(/\r?\n/)) {
                    if (!line) continue;
                    const lineContent = line.startsWith("data:") ? line.replace(/^data:\s*/, "").trim() : line.trim();
                    if (!lineContent || lineContent === "[DONE]") continue;
                    try {
                        const parsed = JSON.parse(lineContent);
                        receivedResponseId = extractQwenResponseId(parsed) ?? receivedResponseId;
                        fullText += extractQwenChunkText(parsed);
                    } catch {
                        continue;
                    }
                }

                session = {
                    chat_id: chatId,
                    last_response_id: receivedResponseId || lastResponseId,
                };
                return fullText || raw;
            }

            throw new Error("AI provider request failed after refreshing the Qwen chat");
        })()
        : await (async () => {
            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(provider.token ? { Authorization: `Bearer ${provider.token}` } : {}),
                },
                body: JSON.stringify({
                    model: provider.model_name || undefined,
                    messages: [
                        {
                            role: "system",
                            content: "You generate structured educational content. Return JSON only.",
                        },
                        {
                            role: "user",
                            content: prompt,
                        },
                    ],
                    stream: false,
                }),
            });

            raw = await response.text();
            if (!response.ok) {
                throw new Error(raw || "AI provider request failed");
            }

            const json = JSON.parse(raw);
            return json?.choices?.[0]?.message?.content ?? json?.message?.content ?? json?.content ?? raw;
        })();

    return {
        elapsed_ms: Date.now() - start,
        data: parseAiJson(messageContent),
        raw,
        session,
    };
}
