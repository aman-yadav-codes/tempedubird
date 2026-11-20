/**
 * Script: sync-local-images-to-openinary.js
 *
 * Scans all image files in `public/uploads/` (media, documents, tickets, etc.)
 * and uploads them to the Openinary self-hosted media service under the
 * configured folder (OPENINARY_UPLOAD_FOLDER, default: "maa-sharda").
 *
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
    throw new Error(errMsg);
  }

  const uploaded = json.files[0];
  const urlPath = uploaded.url || `/t/${uploaded.path || `${targetFolder}/${filename}`}`;
  const fullUrl = urlPath.startsWith('http') ? urlPath : `${BASE_URL}${urlPath}`;

  return {
    url: fullUrl,
    path: uploaded.path || `${targetFolder}/${filename}`,
  };
}

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

  console.log(`\n[DB] Checking database references for ${entries.length} mapped images...`);

  try {
    for (const [localUrl, openinaryUrl] of entries) {
      // 1. Institution profiles
      await pool.query(
        `UPDATE institution_profiles SET logo_url = $1 WHERE logo_url = $2`,
        [openinaryUrl, localUrl]
      ).catch(() => {});
      await pool.query(
        `UPDATE institution_profiles SET founder_image_url = $1 WHERE founder_image_url = $2`,
        [openinaryUrl, localUrl]
      ).catch(() => {});

      // 2. Business profiles
      await pool.query(
        `UPDATE business_profiles SET logo_url = $1 WHERE logo_url = $2`,
        [openinaryUrl, localUrl]
      ).catch(() => {});
      await pool.query(
        `UPDATE business_profiles SET cover_image_url = $1 WHERE cover_image_url = $2`,
        [openinaryUrl, localUrl]
      ).catch(() => {});
      await pool.query(
        `UPDATE business_profiles SET founder_image_url = $1 WHERE founder_image_url = $2`,
        [openinaryUrl, localUrl]
      ).catch(() => {});

      // 3. Professional profiles
      await pool.query(
        `UPDATE professional_profiles SET avatar_url = $1 WHERE avatar_url = $2`,
        [openinaryUrl, localUrl]
      ).catch(() => {});
      await pool.query(
        `UPDATE professional_profiles SET banner_url = $1 WHERE banner_url = $2`,
        [openinaryUrl, localUrl]
      ).catch(() => {});

      // 4. Users
      await pool.query(
        `UPDATE users SET avatar_url = $1 WHERE avatar_url = $2`,
        [openinaryUrl, localUrl]
      ).catch(() => {});
    }
    console.log('[DB] Database references updated successfully.');
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
  const alreadySynced = Object.keys(syncMap).length;
  console.log(`Already synced previously: ${alreadySynced} images`);

  let successCount = 0;
  let failCount = 0;
  let skippedCount = 0;
  const errors = [];

  for (let i = 0; i < allImages.length; i++) {
    const filePath = allImages[i];
    // Form relative web URL, e.g. "/uploads/media/deepak_yadav_founder.jpg"
    const rel = path.relative(path.join(process.cwd(), 'public'), filePath).replace(/\\/g, '/');
    const webUrl = `/${rel}`;

    if (syncMap[webUrl]) {
      skippedCount++;
      continue;
    }

    const filename = path.basename(filePath);
    process.stdout.write(`[${i + 1}/${allImages.length}] Uploading ${filename} to "${OPENINARY_UPLOAD_FOLDER}"... `);

    try {
      const result = await uploadToOpeninary(filePath, webUrl, OPENINARY_UPLOAD_FOLDER);
      syncMap[webUrl] = result.url;
      successCount++;
      console.log(`✓ DONE => ${result.url}`);
      saveSyncMap(syncMap);
    } catch (err) {
      failCount++;
      console.log(`✗ FAILED: ${err.message}`);
      errors.push({ file: filename, webUrl, error: err.message });
      // If server MinIO is unreachable, stop spamming the server and report clearly
      if (err.message.includes('EHOSTUNREACH') || err.message.includes('ECONNREFUSED')) {
        console.warn(`\n[ABORT] Media server storage backend (${err.message}) is currently unreachable.`);
        console.warn('Stopping further uploads. Once the media storage backend is running, re-run:');
        console.warn('  npm run openinary:sync\n');
        break;
      }
    }
  }

  saveSyncMap(syncMap);

  console.log('\n====================================================');
  console.log(' Sync Summary:');
  console.log(` - Total Found:   ${allImages.length}`);
  console.log(` - Already Synced:${skippedCount}`);
  console.log(` - Newly Synced:  ${successCount}`);
  console.log(` - Failed/Pending:${failCount}`);
  console.log('====================================================\n');

  if (successCount > 0) {
    await updateDatabaseReferences(syncMap);
  }

  if (errors.length > 0) {
    console.log('Failures detail:');
    errors.forEach((e) => console.log(`  - ${e.file}: ${e.error}`));
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
