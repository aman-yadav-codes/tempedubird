CREATE TABLE IF NOT EXISTS user_documents (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL,
    document_number VARCHAR(100),
    file_url TEXT NOT NULL,
    public_id TEXT,
    resource_type VARCHAR(50),
    is_verified BOOLEAN DEFAULT FALSE NOT NULL,
    verified_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_documents_user ON user_documents(user_id);
