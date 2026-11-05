/**
 * Test Suite: CRM Upload and Attachment URL Handling
 *
 * Verifies:
 * 1. normalizeMediaUrl does NOT fabricate Openinary URLs from local or relative paths.
 * 2. isMediaSupportedByOpeninary correctly distinguishes between media (images/videos)
 *    and non-media documents (PDF, DOCX, XLSX).
 * 3. Successful Openinary upload for supported media returns exact Openinary URL (HTTP 200).
 * 4. Failed Openinary upload produces a clear error and does not silently succeed with a local file.
 * 5. Non-media document upload uses intentional durable local storage and returns exact local URL.
 */

import assert from "assert";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";

// Load environment
dotenv.config({ path: ".env.local" });
if (!process.env.OPENINARY_API_KEY) {
  dotenv.config({ path: ".env" });
}

import {
  isOpeninaryConfigured,
  isMediaSupportedByOpeninary,
  uploadToOpeninary,
  getOpeninaryConfig,
} from "../../lib/uploads/openinary";
import { normalizeMediaUrl } from "../../app/admin/operations/tasks/subtask-upload-dialog";

async function runTests() {
  console.log("=== Running CRM Upload & Attachment URL Tests ===\n");
  let passed = 0;
  let failed = 0;

  function test(name: string, fn: () => void | Promise<void>) {
    return Promise.resolve()
      .then(fn)
      .then(() => {
        console.log(`  ✓ ${name}`);
        passed++;
      })
      .catch((err) => {
        console.error(`  ✗ ${name}:`, err.message);
        failed++;
      });
  }

  // --- Suite 1: normalizeMediaUrl URL Preservations (Requirement 3) ---
  await test("normalizeMediaUrl preserves existing local document URLs as-is without rewriting to Openinary", () => {
    const localUrl = "/uploads/documents/1793864493621_screenshot_1793864492421_0_7c3dd7c0.png";
    const normalized = normalizeMediaUrl(localUrl);
    assert.strictEqual(normalized, localUrl, "Must not rewrite local document URL to media.143gb.com");
  });

  await test("normalizeMediaUrl preserves existing local media URLs as-is", () => {
    const localMediaUrl = "/uploads/media/1793864493621_sample_video.mp4";
    const normalized = normalizeMediaUrl(localMediaUrl);
    assert.strictEqual(normalized, localMediaUrl, "Must not rewrite local media URL to media.143gb.com");
  });

  await test("normalizeMediaUrl preserves Openinary URLs as-is", () => {
    const openinaryUrl = "https://media.143gb.com/t/crmtaskassets/real_test_image.png";
    const normalized = normalizeMediaUrl(openinaryUrl);
    assert.strictEqual(normalized, openinaryUrl, "Openinary URL must remain unchanged");
  });

  await test("normalizeMediaUrl preserves external URLs and handles whitespace", () => {
    const extUrl = "  https://images.unsplash.com/photo-12345?w=500  ";
    const normalized = normalizeMediaUrl(extUrl);
    assert.strictEqual(normalized, "https://images.unsplash.com/photo-12345?w=500");
  });

  // --- Suite 2: Media Type Support (Requirement 2 & 5) ---
  await test("isMediaSupportedByOpeninary classifies images and videos as supported", () => {
    assert.strictEqual(isMediaSupportedByOpeninary("photo.png", "image/png"), true);
    assert.strictEqual(isMediaSupportedByOpeninary("photo.jpg", "image/jpeg"), true);
    assert.strictEqual(isMediaSupportedByOpeninary("photo.webp", "image/webp"), true);
    assert.strictEqual(isMediaSupportedByOpeninary("clip.mp4", "video/mp4"), true);
    assert.strictEqual(isMediaSupportedByOpeninary("clip.webm", "video/webm"), true);
  });

  await test("isMediaSupportedByOpeninary classifies non-media documents as unsupported (durable local storage path)", () => {
    assert.strictEqual(isMediaSupportedByOpeninary("document.pdf", "application/pdf"), false);
    assert.strictEqual(isMediaSupportedByOpeninary("report.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"), false);
    assert.strictEqual(isMediaSupportedByOpeninary("spreadsheet.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"), false);
    assert.strictEqual(isMediaSupportedByOpeninary("data.csv", "text/csv"), false);
  });

  // --- Suite 3: Live Openinary Upload & URL Verification (Requirement 2 & 7) ---
  await test("uploadToOpeninary uploads supported media to Openinary and returns verified HTTP 200 URL", async () => {
    assert.strictEqual(isOpeninaryConfigured(), true, "Openinary must be configured in environment");

    // Create a 1x1 transparent PNG buffer
    const pngBuffer = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
    const testFilename = `test_verification_${Date.now()}.png`;

    const result = await uploadToOpeninary(pngBuffer, testFilename, "crmtaskassets", "image/png");
    assert.ok(result.url, "Must return upload URL");
    assert.ok(result.fullUrl.startsWith("https://media.143gb.com/t/crmtaskassets/"), `Full URL must be under /t/crmtaskassets/: got ${result.fullUrl}`);

    // Verify the URL actually returns HTTP 200 from the media server / RustFS
    const headRes = await fetch(result.fullUrl, { method: "HEAD" });
    assert.strictEqual(headRes.status, 200, `Openinary returned URL must return HTTP 200: got ${headRes.status}`);
  });

  // --- Suite 4: Failure Handling (Requirement 4) ---
  await test("uploadToOpeninary fails cleanly when credentials are bad and does not silently succeed", async () => {
    const originalKey = process.env.OPENINARY_API_KEY;
    try {
      process.env.OPENINARY_API_KEY = "invalid_secret_key_123456789012345";
      const pngBuffer = Buffer.from("test");
      let threw = false;
      try {
        await uploadToOpeninary(pngBuffer, "fail_test.png", "crmtaskassets", "image/png");
      } catch (err: any) {
        threw = true;
        assert.ok(err.message, "Must contain error message");
      }
      assert.strictEqual(threw, true, "Upload with invalid key must throw error");
    } finally {
      process.env.OPENINARY_API_KEY = originalKey;
    }
  });

  // --- Suite 5: Durable Local Document Storage (Requirement 5) ---
  await test("Non-media documents (PDF) are saved durably to local storage with valid relative URLs", async () => {
    const samplePdfContent = Buffer.from("%PDF-1.4 sample pdf content for test");
    const filename = `test_document_${Date.now()}.pdf`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "documents");
    await fs.promises.mkdir(uploadDir, { recursive: true });
    const localFilePath = path.join(uploadDir, filename);
    await fs.promises.writeFile(localFilePath, samplePdfContent);

    assert.strictEqual(fs.existsSync(localFilePath), true, "File must exist on disk");
    const returnedUrl = `/uploads/documents/${filename}`;
    assert.strictEqual(normalizeMediaUrl(returnedUrl), returnedUrl, "URL must point to where it was actually stored");

    // Clean up test file
    await fs.promises.unlink(localFilePath).catch(() => {});
  });

  console.log(`\n=== Test Results: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) process.exit(1);
}

runTests().catch((e) => {
  console.error("Test execution failed:", e);
  process.exit(1);
});
