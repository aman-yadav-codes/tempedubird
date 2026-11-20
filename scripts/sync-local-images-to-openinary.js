/**
 * Script: sync-local-images-to-openinary.js
 *
 * Scans all image files in `public/uploads/` (media, documents, tickets, etc.)
 * and uploads them to the Openinary self-hosted media service under the
 * configured folder (OPENINARY_UPLOAD_FOLDER, default: "maa-sharda").
 *
 * Honors Openinary rate limits (max 100 req/min) with automatic backoff and retry.
 * Saves a local mapping `public/uploads/openinary-sync-map.json` and
 * updates database columns referencing the local paths.
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { Pool } = require('pg');

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const OPENINARY_API_URL = (process.env.OPENINARY_API_URL || 'https://media.143gb.com/api').replace(/\/+$/, '');
const OPENINARY_API_KEY = (process.env.OPENINARY_API_KEY || '').trim();
const OPENINARY_UPLOAD_FOLDER = (process.env.OPENINARY_UPLOAD_FOLDER || 'maa-sharda').trim();
const UPLOAD_URL = OPENINARY_API_URL.endsWith('/upload') ? OPENINARY_API_URL : `${OPENINARY_API_URL}/upload`;
const BASE_URL = OPENINARY_API_URL.replace(/\/api$/, '');

const SUPPORTED_IMAGE_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'webp', 'svg', 'gif', 'avif', 'heic', 'heif', 'bmp'
]);

const MAP_FILE_PATH = path.join(process.cwd(), 'public', 'uploads', 'openinary-sync-map.json');

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function loadSyncMap() {
  if (fs.existsSync(MAP_FILE_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(MAP_FILE_PATH, 'utf8'));
    } catch {
      return {};
    }
  }
  return {};
}

function saveSyncMap(syncMap) {
  try {
    fs.mkdirSync(path.dirname(MAP_FILE_PATH), { recursive: true });
    fs.writeFileSync(MAP_FILE_PATH, JSON.stringify(syncMap, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save sync map:', err.message);
  }
}

function getMimeType(ext) {
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'svg':
      return 'image/svg+xml';
    case 'gif':
      return 'image/gif';
    case 'avif':
      return 'image/avif';
    case 'bmp':
      return 'image/bmp';
    default:
      return 'application/octet-stream';
  }
}

function scanFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanFiles(fullPath, fileList);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase().replace(/^\./, '');
      if (SUPPORTED_IMAGE_EXTENSIONS.has(ext)) {
        fileList.push(fullPath);
      }
    }
  }
  return fileList;
}

async function uploadToOpeninary(filePath, relativePath, targetFolder) {
  const filename = path.basename(filePath);
  const ext = path.extname(filename).toLowerCase().replace(/^\./, '');
  const mimeType = getMimeType(ext);
  const buffer = fs.readFileSync(filePath);

  const blob = new Blob([buffer], { type: mimeType });
  const formData = new FormData();
  formData.append('files', blob, filename);
  formData.append('folder', targetFolder);

  const res = await fetch(UPLOAD_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENINARY_API_KEY}`,
    },
    body: formData,
  });

  const json = await res.json().catch(() => null);

  if (!res.ok || !json?.success || !Array.isArray(json.files) || json.files.length === 0) {
    const errMsg = json?.errors?.[0]?.error || json?.message || json?.error || `HTTP ${res.status}`;
    const err = new Error(errMsg);
    (err).status = res.status;
    throw err;
  }

  const uploaded = json.files[0];
  const urlPath = uploaded.url || `/t/${uploaded.path || `${targetFolder}/${filename}`}`;
  const fullUrl = urlPath.startsWith('http') ? urlPath : `${BASE_URL}${urlPath}`;

  return {
    url: fullUrl,
    path: uploaded.path || `${targetFolder}/${filename}`,
  };
}

const DB_COLUMNS_TO_UPDATE = [
  { table: 'institution_profiles', column: 'founder_image_url' },
  { table: 'institution_profiles', column: 'logo_url' },
  { table: 'institution_media', column: 'url' },
  { table: 'users', column: 'avatar_url' },
  { table: 'vendors', column: 'profile_image' },
  { table: 'platform_company_info', column: 'banner_url' },
  { table: 'platform_company_info', column: 'founder_image_url' },
  { table: 'platform_company_info', column: 'logo_url' },
  { table: 'businesses', column: 'founder_image_url' },
  { table: 'businesses_and_professionals', column: 'founder_image_url' },
  { table: 'business_profiles', column: 'logo_url' },
  { table: 'business_profiles', column: 'banner_url' },
  { table: 'business_profiles', column: 'founder_image_url' },
  { table: 'business_profiles', column: 'cover_image_url' },
  { table: 'professional_profiles', column: 'avatar_url' },
  { table: 'professional_profiles', column: 'banner_url' },
];

async function updateDatabaseReferences(syncMap) {
  if (!process.env.DATABASE_URL) {
    console.log('[DB] No DATABASE_URL configured, skipping database update.');
    return;
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const entries = Object.entries(syncMap);
  if (entries.length === 0) {
    pool.end();
    return;
  }

  console.log(`\n[DB] Updating database references across all tables for ${entries.length} uploaded files...`);
  let updatedTotal = 0;

  try {
    for (const { table, column } of DB_COLUMNS_TO_UPDATE) {
      for (const [localUrl, openinaryUrl] of entries) {
        try {
          const res = await pool.query(
            `UPDATE "${table}" SET "${column}" = $1 WHERE "${column}" = $2 OR "${column}" LIKE '%' || $3`,
            [openinaryUrl, localUrl, path.basename(localUrl)]
          );
          if (res.rowCount && res.rowCount > 0) {
            updatedTotal += res.rowCount;
            console.log(`[DB] Updated ${res.rowCount} row(s) in "${table}"."${column}" -> ${openinaryUrl}`);
          }
        } catch {
          // Ignore if table/column does not exist
        }
      }
    }
    console.log(`[DB] Finished updating database. Total rows modified: ${updatedTotal}`);
  } catch (dbErr) {
    console.warn('[DB] Warning updating database references:', dbErr.message);
  } finally {
    await pool.end();
  }
}

async function main() {
  console.log('====================================================');
  console.log(' Openinary Image Sync Tool');
  console.log('====================================================');
  console.log('API URL:        ', UPLOAD_URL);
  console.log('Upload Folder:  ', OPENINARY_UPLOAD_FOLDER);
  console.log('Has API Key:    ', Boolean(OPENINARY_API_KEY));
  console.log('====================================================\n');

  if (!OPENINARY_API_KEY) {
    console.error('Error: OPENINARY_API_KEY is not configured in .env or .env.local');
    process.exit(1);
  }

  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    console.log('No public/uploads directory found.');
    return;
  }

  const allImages = scanFiles(uploadsDir);
  console.log(`Found ${allImages.length} local images in public/uploads/`);

  const syncMap = loadSyncMap();
  let alreadySynced = 0;

  const pendingImages = allImages.filter((filePath) => {
    const rel = path.relative(path.join(process.cwd(), 'public'), filePath).replace(/\\/g, '/');
    const webUrl = `/${rel}`;
    if (syncMap[webUrl]) {
      alreadySynced++;
      return false;
    }
    return true;
  });

  console.log(`Already synced: ${alreadySynced} images`);
  console.log(`Remaining to upload: ${pendingImages.length} images to folder "${OPENINARY_UPLOAD_FOLDER}"...\n`);

  let successCount = 0;
  let failCount = 0;
  const errors = [];

  for (let i = 0; i < pendingImages.length; i++) {
    const filePath = pendingImages[i];
    const rel = path.relative(path.join(process.cwd(), 'public'), filePath).replace(/\\/g, '/');
    const webUrl = `/${rel}`;
    const filename = path.basename(filePath);

    let attempts = 0;
    let uploaded = false;

    while (attempts < 3 && !uploaded) {
      attempts++;
      try {
        const result = await uploadToOpeninary(filePath, webUrl, OPENINARY_UPLOAD_FOLDER);
        syncMap[webUrl] = result.url;
        successCount++;
        uploaded = true;
        saveSyncMap(syncMap);
        console.log(`[${i + 1}/${pendingImages.length}] ✓ ${filename} -> ${result.url}`);
        // Small pacing delay to stay safely under 100 req/60s
        await sleep(650);
      } catch (err) {
        const errMsg = err.message || '';
        if (errMsg.includes('Rate limit') || err.status === 429) {
          console.warn(`[RATE LIMIT] Hit rate limit on attempt ${attempts}. Pausing for 62s to reset window...`);
          await sleep(62000);
          // Loop will retry
        } else if (errMsg.includes('EHOSTUNREACH') || errMsg.includes('ECONNREFUSED')) {
          console.error(`[ABORT] Media server storage is unreachable (${errMsg}). Halting.`);
          i = pendingImages.length;
          break;
        } else {
          console.error(`[${i + 1}/${pendingImages.length}] ✗ ${filename} (attempt ${attempts}): ${errMsg}`);
          if (attempts >= 3) {
            failCount++;
            errors.push({ file: filename, webUrl, error: errMsg });
          } else {
            await sleep(2000);
          }
        }
      }
    }
  }

  saveSyncMap(syncMap);

  console.log('\n====================================================');
  console.log(' Sync Summary:');
  console.log(` - Total Local Images: ${allImages.length}`);
  console.log(` - Previously Synced:  ${alreadySynced}`);
  console.log(` - Newly Synced:       ${successCount}`);
  console.log(` - Total Active Sync:  ${Object.keys(syncMap).length}`);
  console.log(` - Failed:             ${failCount}`);
  console.log('====================================================\n');

  if (Object.keys(syncMap).length > 0) {
    await updateDatabaseReferences(syncMap);
  }

  if (errors.length > 0) {
    console.log('\nFailures detail:');
    errors.forEach((e) => console.log(`  - ${e.file}: ${e.error}`));
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
