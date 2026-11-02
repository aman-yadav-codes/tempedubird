const fs = require('fs');

// Patch app/api/admin/sales/clients/credentials/route.ts
let cred = fs.readFileSync('app/api/admin/sales/clients/credentials/route.ts', 'utf8');

cred = cred.replace(
  `      await db.query(
        \`UPDATE users
         SET password = $1,
             email = COALESCE($2, email),
             phone = COALESCE($3, phone),
             is_active = TRUE,
             updated_at = NOW()
         WHERE id = $4\`,
        [hashedPassword, cleanEmail, cleanPhone, finalUserId]
      );`,
  `      await db.query(
        \`UPDATE users
         SET password = $1,
             full_name = COALESCE(NULLIF($2, ''), full_name),
             email = COALESCE($3, email),
             phone = COALESCE($4, phone),
             is_active = TRUE,
             is_deleted = FALSE,
             deleted_at = NULL,
             deleted_by = NULL,
             updated_at = NOW()
         WHERE id = $5\`,
        [hashedPassword, clientFullName, cleanEmail, cleanPhone, finalUserId]
      );`
);

cred = cred.replace(
  `    if (client.institution_id && clientRoleId) {
      await db.query(
        \`INSERT INTO institution_memberships (institution_id, user_id, role_id, is_active)
         VALUES ($1, $2, $3, TRUE)
         ON CONFLICT (institution_id, user_id, role_id)
         DO UPDATE SET is_active = TRUE, updated_at = NOW()\`,
        [client.institution_id, finalUserId, clientRoleId]
      ).catch(() => {});
    }`,
  `    if (client.institution_id && clientRoleId) {
      await db.query(
        \`INSERT INTO institution_memberships (institution_id, user_id, role_id, is_active, is_deleted, status, is_current)
         VALUES ($1, $2, $3, TRUE, FALSE, 'ACTIVE', TRUE)
         ON CONFLICT (institution_id, user_id)
         DO UPDATE SET 
           role_id = EXCLUDED.role_id,
           is_active = TRUE, 
           is_deleted = FALSE, 
           status = 'ACTIVE',
           is_current = TRUE,
           deleted_at = NULL, 
           updated_at = NOW()\`,
        [client.institution_id, finalUserId, clientRoleId]
      ).catch((err) => {
        console.warn("[Client Credentials] Membership update warning:", err.message);
      });
    }`
);

fs.writeFileSync('app/api/admin/sales/clients/credentials/route.ts', cred, 'utf8');
console.log("Patched credentials route!");

// Patch app/api/auth/login/route.ts
let login = fs.readFileSync('app/api/auth/login/route.ts', 'utf8');

login = login.replace(
  `          let clientUserId = client.user_id;
          if (clientUserId) {
            const u = await db.query(\`SELECT id, full_name, email, phone, is_active FROM users WHERE id = $1\`, [clientUserId]);
            if (u.rows.length > 0) {
              user = u.rows[0];
            }
          }`,
  `          let clientUserId = client.user_id;
          if (clientUserId) {
            const u = await db.query(
              \`UPDATE users 
               SET is_active = TRUE, is_deleted = FALSE, deleted_at = NULL, deleted_by = NULL, updated_at = NOW() 
               WHERE id = $1 
               RETURNING id, full_name, email, phone, is_active\`,
              [clientUserId]
            );
            if (u.rows.length > 0) {
              user = u.rows[0];
            }
          }`
);

login = login.replace(
  `            if (client.institution_id) {
              await db.query(
                \`INSERT INTO institution_memberships (institution_id, user_id, role_id, is_active)
                 VALUES ($1, $2, $3, TRUE)
                 ON CONFLICT (institution_id, user_id, role_id) DO UPDATE SET is_active = TRUE\`,
                [client.institution_id, user.id, clientRoleId]
              ).catch(() => {});
            }`,
  `            if (client.institution_id) {
              await db.query(
                \`INSERT INTO institution_memberships (institution_id, user_id, role_id, is_active, is_deleted, status, is_current)
                 VALUES ($1, $2, $3, TRUE, FALSE, 'ACTIVE', TRUE)
                 ON CONFLICT (institution_id, user_id) 
                 DO UPDATE SET 
                   role_id = EXCLUDED.role_id,
                   is_active = TRUE, 
                   is_deleted = FALSE, 
                   status = 'ACTIVE',
                   is_current = TRUE,
                   deleted_at = NULL, 
                   updated_at = NOW()\`,
                [client.institution_id, user.id, clientRoleId]
              ).catch(() => {});
            }`
);

fs.writeFileSync('app/api/auth/login/route.ts', login, 'utf8');
console.log("Patched login route!");

