CREATE TABLE IF NOT EXISTS institution_user_permissions (
    institution_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    permission_id INTEGER NOT NULL,

    created_by INTEGER,
    updated_by INTEGER,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT institution_user_permissions_pkey
        PRIMARY KEY (institution_id, user_id, permission_id),

    CONSTRAINT institution_user_permissions_institution_id_fkey
        FOREIGN KEY (institution_id)
        REFERENCES institution_profiles(id)
        ON DELETE CASCADE,

    CONSTRAINT institution_user_permissions_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT institution_user_permissions_permission_id_fkey
        FOREIGN KEY (permission_id)
        REFERENCES permissions(id)
        ON DELETE CASCADE,

    CONSTRAINT institution_user_permissions_created_by_fkey
        FOREIGN KEY (created_by)
        REFERENCES users(id),

    CONSTRAINT institution_user_permissions_updated_by_fkey
        FOREIGN KEY (updated_by)
        REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_iup_institution_user
ON institution_user_permissions(institution_id, user_id);

CREATE INDEX IF NOT EXISTS idx_iup_user
ON institution_user_permissions(user_id);

CREATE INDEX IF NOT EXISTS idx_iup_permission
ON institution_user_permissions(permission_id);
