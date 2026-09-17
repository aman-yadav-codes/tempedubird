const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    const studentId = 1;
    const institutionId = 9;

    const idCardsRes = await pool.query(`
      SELECT
        card.id,
        card.title,
        'id_card' AS document_kind,
        'ID Card' AS category_name,
        'id-card' AS category_slug,
        card.image_url,
        card.pdf_url,
        card.rendered_html,
        card.canvas_width,
        card.canvas_height,
        card.version,
        card.status,
        card.created_at,
        card.updated_at,
        institution.name AS institution_name,
        generator.full_name AS generated_by_name
      FROM student_id_cards card
      INNER JOIN institution_profiles institution ON institution.id = card.institution_id
      LEFT JOIN users generator ON generator.id = card.generated_by
      WHERE card.student_id = $1
        AND card.institution_id = $2
        AND COALESCE(card.is_deleted, FALSE) = FALSE
      ORDER BY card.created_at DESC, card.id DESC
    `, [studentId, institutionId]);
    console.log('ID cards count:', idCardsRes.rows.length);

    const genDocsRes = await pool.query(`
      SELECT
        doc.id,
        doc.title,
        'generated_document' AS document_kind,
        COALESCE(cc.name, 'Generated Document') AS category_name,
        COALESCE(cc.slug, 'document') AS category_slug,
        doc.image_url,
        doc.pdf_url,
        doc.rendered_html,
        doc.canvas_width,
        doc.canvas_height,
        doc.version,
        doc.status,
        doc.created_at,
        doc.updated_at,
        institution.name AS institution_name,
        generator.full_name AS generated_by_name
      FROM institution_generated_documents doc
      INNER JOIN institution_profiles institution ON institution.id = doc.institution_id
      LEFT JOIN card_categories cc ON cc.id = doc.card_category_id
      LEFT JOIN users generator ON generator.id = doc.generated_by
      WHERE doc.reference_id = $1
        AND (doc.reference_type LIKE 'student%' OR doc.reference_type = 'student')
        AND doc.institution_id = $2
        AND COALESCE(doc.is_deleted, FALSE) = FALSE
      ORDER BY doc.created_at DESC, doc.id DESC
    `, [studentId, institutionId]);
    console.log('Gen docs count:', genDocsRes.rows.length);

    const uploadedDocsRes = await pool.query(`
      SELECT
        sd.id,
        sd.document_type,
        sd.document_number,
        sd.file_url,
        sd.is_verified,
        sd.resource_type,
        sd.created_at,
        sd.updated_at,
        verifier.full_name AS verified_by_name
      FROM student_documents sd
      LEFT JOIN users verifier ON verifier.id = sd.verified_by
      WHERE sd.student_id = $1
        AND COALESCE(sd.is_deleted, FALSE) = FALSE
      ORDER BY sd.created_at DESC, sd.id DESC
    `, [studentId]);
    console.log('Uploaded docs count:', uploadedDocsRes.rows.length);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
run();
