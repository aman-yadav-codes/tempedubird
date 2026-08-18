CREATE TABLE IF NOT EXISTS institution_role_permission_denials (
    institution_id INTEGER NOT NULL,
    role_id INTEGER NOT NULL,
    permission_id INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT institution_role_permission_denials_pkey
        PRIMARY KEY (institution_id, role_id, permission_id),

    CONSTRAINT institution_role_permission_denials_institution_id_fkey
        FOREIGN KEY (institution_id)
        REFERENCES institution_profiles(id)
        ON DELETE CASCADE,

    CONSTRAINT institution_role_permission_denials_role_id_fkey
        FOREIGN KEY (role_id)
        REFERENCES roles(id)
        ON DELETE CASCADE,

    CONSTRAINT institution_role_permission_denials_permission_id_fkey
        FOREIGN KEY (permission_id)
        REFERENCES permissions(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_irpd_institution_role
ON institution_role_permission_denials(institution_id, role_id);
