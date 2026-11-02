import psycopg2
import os

db_url = None
with open('.env.local', 'r', encoding='utf-8') as f:
    for line in f:
        if line.startswith('DATABASE_URL='):
            db_url = line.strip().split('=', 1)[1].strip('"\'')
            break

if not db_url:
    print('DATABASE_URL not found')
    exit(1)

conn = psycopg2.connect(db_url)
cur = conn.cursor()
cur.execute('SELECT id, title, sub_tasks FROM operations_tasks ORDER BY updated_at DESC LIMIT 5')
rows = cur.fetchall()
for r in rows:
    print('TASK ID:', r[0], 'TITLE:', r[1])
    subs = r[2] or []
    for s in subs:
        uploads = s.get('uploads') or []
        print(f"  SUB: {s.get('id')} - {s.get('title')[:40]} | UPLOADS COUNT: {len(uploads)}")
        for u in uploads:
            print(f"    - FILE: {u.get('file_name')} | URL: {u.get('file_url')[:60]}")
cur.close()
conn.close()

