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

cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name ILIKE '%salary%'")
print("user_profiles salary cols:", cur.fetchall())

cur.execute("SELECT table_name FROM information_schema.tables WHERE table_name ILIKE '%salary%'")
print("Salary tables:", cur.fetchall())

for t in ['staff_salary_components', 'staff_salary_payouts']:
    cur.execute(f"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '{t}'")
    print(f"{t}:", cur.fetchall())

