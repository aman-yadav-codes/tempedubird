import psycopg2, os

db_url = None
for f in ['.env.local', '.env']:
    if os.path.exists(f):
        for line in open(f):
            if line.startswith('DATABASE_URL='):
                db_url = line.strip().split('=', 1)[1].strip('"\'')
                break
    if db_url: break

conn = psycopg2.connect(db_url)
cur = conn.cursor()

cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'sales_contacts' ORDER BY ordinal_position")
print("sales_contacts:", cur.fetchall())

cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'staff_job_applications' ORDER BY ordinal_position")
print("staff_job_applications:", cur.fetchall())

