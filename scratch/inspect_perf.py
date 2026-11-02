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

for table in ['staff_performance_points_ledger', 'penalty_rules', 'task_score_adjustments', 'sales_packages']:
    cur.execute(f"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '{table}' ORDER BY ordinal_position")
    cols = cur.fetchall()
    print(f"--- {table} ---")
    print(", ".join([f"{c[0]} ({c[1]})" for c in cols]))

cur.execute("SELECT table_name FROM information_schema.tables WHERE table_name ILIKE '%perform%' OR table_name ILIKE '%leaderboard%'")
print("Matching tables:", cur.fetchall())

