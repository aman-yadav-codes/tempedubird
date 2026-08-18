import * as htmlToImage from "html-to-image";

const NON_VISUAL_TAGS = new Set(["STYLE", "SCRIPT", "LINK", "META", "TITLE"]);
const TRANSPARENT_PIXEL =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

function getVisualChildren(element: HTMLElement) {
  return Array.from(element.children).filter(
    (child): child is HTMLElement =>
      child instanceof HTMLElement && !NON_VISUAL_TAGS.has(child.tagName)
  );
}

function getElementArea(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  return rect.width * rect.height;
}

function shouldStripWrapperBackground(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  return getVisualChildren(element).length > 1 || rect.width >= 1200 || rect.height >= 1200;
}

function getRenderTarget(doc: Document) {
  const bodyChildren = getVisualChildren(doc.body);
  if (bodyChildren.length === 0) return doc.body;

  let target = bodyChildren.reduce((largest, child) =>
    getElementArea(child) > getElementArea(largest) ? child : largest
  );

  for (let depth = 0; depth < 3; depth += 1) {
    const children = getVisualChildren(target);
    if (children.length !== 1) break;
    const child = children[0];
    const targetRect = target.getBoundingClientRect();
    const childRect = child.getBoundingClientRect();
    const targetIsViewportLike = targetRect.width >= 1200 || targetRect.height >= 1200;
    const childIsMeaningfullySmaller =
      childRect.width > 0 &&
      childRect.height > 0 &&
      (childRect.width < targetRect.width * 0.9 || childRect.height < targetRect.height * 0.9);
    if (!targetIsViewportLike && !childIsMeaningfullySmaller) break;
    target = child;
  }

  return target;
}

function normalizeHtmlInput(html: string) {
  return html
    .trim()
    .replace(/^```(?:html)?\s*/i, "")
    .replace(/\s*```$/i, "");
}

function sanitizePreviewDocument(doc: Document) {
  doc.querySelectorAll("script, link[rel='stylesheet']").forEach((node) => node.remove());
  doc.querySelectorAll("style").forEach((style) => {
    style.textContent = (style.textContent ?? "").replace(/@import[^;]+;/gi, "");
  });
  Array.from(doc.images).forEach((image) => {
    const source = image.getAttribute("src") ?? "";
    if (!source.trim()) image.src = TRANSPARENT_PIXEL;
    image.decoding = "sync";
    image.crossOrigin = "anonymous";
  });
}

function getRenderableSize(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const width = Math.ceil(Math.max(rect.width, element.scrollWidth, element.offsetWidth));
  const height = Math.ceil(Math.max(rect.height, element.scrollHeight, element.offsetHeight));
  return { width, height };
}

async function waitForImages(doc: Document) {
  await Promise.all(
    Array.from(doc.images).map((image) =>
      image.complete
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            image.addEventListener("load", () => resolve(), { once: true });
            image.addEventListener(
              "error",
              () => {
                image.src = TRANSPARENT_PIXEL;
                resolve();
              },
              { once: true }
            );
          })
    )
  );
}

async function waitForFonts(doc: Document) {
  if (!("fonts" in doc)) return;
  try {
    await doc.fonts.ready;
  } catch {
    // Font readiness should not block template previews.
  }
}

async function renderNodeToPng(target: HTMLElement) {
  const size = getRenderableSize(target);
  if (!size.width || !size.height) {
    throw new Error("Generated template has no visible render area");
  }

  return htmlToImage.toPng(target, {
    width: size.width,
    height: size.height,
    quality: 1,
    pixelRatio: 2,
    cacheBust: true,
    backgroundColor: "transparent",
    skipFonts: true,
    style: {
      margin: "0",
      transform: "none",
    },
  });
}

async function renderFromMainDocument(doc: Document, target: HTMLElement) {
  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "-10000px";
  host.style.top = "0";
  host.style.background = "transparent";
  host.style.pointerEvents = "none";
  host.style.zIndex = "-1";

  const styleText = Array.from(doc.querySelectorAll("style"))
    .map((style) => style.textContent ?? "")
    .join("\n");
  if (styleText.trim()) {
    const style = document.createElement("style");
    style.textContent = styleText;
    host.appendChild(style);
  }

  const clone = target.cloneNode(true);
  if (!(clone instanceof HTMLElement)) {
    throw new Error("Generated template preview could not be prepared");
  }
  host.appendChild(clone);
  document.body.appendChild(host);

  try {
    await new Promise<void>((resolve) => window.setTimeout(resolve, 100));
    return await renderNodeToPng(clone);
  } finally {
    host.remove();
  }
}

export async function renderTemplateHtmlToPng(html: string) {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("sandbox", "allow-same-origin");
  iframe.style.position = "fixed";
  iframe.style.left = "-10000px";
  iframe.style.top = "0";
  iframe.style.width = "1600px";
  iframe.style.height = "1600px";
  iframe.style.border = "0";
  iframe.style.background = "transparent";
  document.body.appendChild(iframe);

  try {
    const doc = iframe.contentDocument;
    if (!doc) throw new Error("Could not prepare template preview");
    doc.open();
    doc.write(normalizeHtmlInput(html));
    doc.close();

    await new Promise<void>((resolve) => {
      const finish = () => window.setTimeout(resolve, 250);
      if (doc.readyState === "complete") finish();
      else iframe.addEventListener("load", finish, { once: true });
    });

    const reset = doc.createElement("style");
    reset.textContent = `
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        width: max-content !important;
        min-width: 0 !important;
        height: max-content !important;
        min-height: 0 !important;
        background: transparent !important;
        overflow: visible !important;
      }
      body {
        display: inline-block !important;
      }
    `;
    doc.head.appendChild(reset);
    sanitizePreviewDocument(doc);

    await waitForFonts(doc);
    await waitForImages(doc);

    const target = getRenderTarget(doc);
    if (shouldStripWrapperBackground(target)) {
      target.style.backgroundColor = "transparent";
      target.style.backgroundImage = "none";
    }

    try {
      return await renderNodeToPng(target);
    } catch (error) {
      console.warn("[template-preview] iframe render failed; retrying in main document", error);
      return await renderFromMainDocument(doc, target);
    }
  } finally {
    iframe.remove();
  }
}

export function buildTransparentPreviewDocument(html: string) {
  return `
    <!doctype html>
    <html>
      <head>
        <style>
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: max-content !important;
            min-width: 0 !important;
            height: max-content !important;
            min-height: 0 !important;
            background: transparent !important;
            overflow: visible !important;
          }
          body {
            display: inline-block !important;
          }
        </style>
      </head>
      <body>${html}</body>
    </html>
  `;
}
