"""
Feed category-tree CSV rows into Postgres.

CSV format:
    parent_id,name,slug

Examples from the project root:
    python manual-tools/feeder.py
    python manual-tools/feeder.py "BACHELORS - BACHELORS.csv" --dry-run
    python manual-tools/feeder.py "BACHELORS - BACHELORS.csv"
    python manual-tools/feeder.py C:\\path\\to\\file.csv --db-url "postgresql://..."

Put files in manual-tools/input for the interactive menu, or pass a path
directly. DATABASE_URL is read from the environment or from .env.local in the
current working directory/project root.
"""

from __future__ import annotations

import argparse
import csv
import os
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import TypeAlias

try:
    import psycopg
except ImportError:  # pragma: no cover - depends on local environment
    psycopg = None


SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
INPUT_DIR = SCRIPT_DIR / "input"
REQUIREMENTS_FILE = SCRIPT_DIR / "requirements.txt"
ParentId: TypeAlias = int | None


@dataclass(frozen=True)
class CategoryRow:
    line_number: int
    parent_id: ParentId
    name: str
    slug: str


def format_csv_row_details(parent_id: str, name: str, slug: str) -> str:
    parent_value = parent_id.strip() or "<blank>"
    name_value = name.strip() or "<blank>"
    slug_value = slug.strip() or "<blank>"
    return f"parent_id={parent_value!r}, name={name_value!r}, slug={slug_value!r}"


def normalize_slug(value: str) -> str:
    return value.strip().casefold()


def parse_env_file(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key:
            values[key] = value
    return values


def resolve_database_url(explicit_url: str | None) -> str:
    if explicit_url:
        return explicit_url

    env_url = os.environ.get("DATABASE_URL")
    if env_url:
        return env_url

    for env_path in (Path.cwd() / ".env.local", PROJECT_ROOT / ".env.local"):
        file_url = parse_env_file(env_path).get("DATABASE_URL")
        if file_url:
            return file_url

    raise SystemExit(
        "DATABASE_URL not found. Pass --db-url or set DATABASE_URL in .env.local."
    )


def resolve_csv_path(filename: str) -> Path:
    candidate = Path(filename).expanduser()
    if candidate.exists():
        return candidate.resolve()

    input_candidate = INPUT_DIR / filename
    if input_candidate.exists():
        return input_candidate.resolve()

    downloads_candidate = Path.home() / "Downloads" / filename
    if downloads_candidate.exists():
        return downloads_candidate.resolve()

    raise SystemExit(f"CSV file not found: {filename}")


def read_rows(path: Path) -> list[CategoryRow]:
    rows: list[CategoryRow] = []
    seen_by_parent_slug: dict[tuple[ParentId, str], CategoryRow] = {}
    duplicate_groups: dict[tuple[ParentId, str], list[CategoryRow]] = {}
    errors: list[str] = []

    with path.open("r", newline="", encoding="utf-8-sig") as file:
        reader = csv.reader(file)
        for line_number, row in enumerate(reader, start=1):
            if not row or all(not cell.strip() for cell in row):
                continue
            if len(row) < 3:
                errors.append(
                    f"Line {line_number}: expected parent_id,name,slug but got {row!r}"
                )
                continue

            parent_raw, name_raw, slug_raw = row[:3]
            name = name_raw.strip()
            slug = slug_raw.strip()
            row_details = format_csv_row_details(parent_raw, name_raw, slug_raw)

            parent_text = parent_raw.strip()
            if parent_text:
                try:
                    parent_id: ParentId = int(parent_text)
                except ValueError as exc:
                    errors.append(
                        f"Line {line_number}: parent_id must be an integer. {row_details}"
                    )
                    continue

                if parent_id <= 0:
                    errors.append(
                        f"Line {line_number}: parent_id must be positive. {row_details}"
                    )
                    continue
            else:
                parent_id = None

            if not name:
                errors.append(f"Line {line_number}: name is required. {row_details}")
            if not slug:
                errors.append(f"Line {line_number}: slug is required. {row_details}")
            if not name or not slug:
                continue

            key = (parent_id, normalize_slug(slug))
            first_row = seen_by_parent_slug.get(key)
            if first_row:
                duplicate_groups.setdefault(key, [first_row]).append(
                    CategoryRow(line_number, parent_id, name, slug)
                )
                continue
            category_row = CategoryRow(line_number, parent_id, name, slug)
            seen_by_parent_slug[key] = category_row
            rows.append(category_row)

    duplicates = [
        row
        for group in duplicate_groups.values()
        for row in group[1:]
    ]

    if not rows:
        raise SystemExit("CSV has no rows to import.")
    if errors or duplicates:
        messages = ["CSV validation failed."]
        if errors:
            messages.append("")
            messages.append("-------------------- field error start --------------------")
            messages.append(f"Field error count: {len(errors)}")
            messages.extend(errors[:50])
            if len(errors) > 50:
                messages.append(f"... and {len(errors) - 50} more field error(s).")
            messages.append("-------------------- field error end ----------------------")
        if duplicates:
            messages.append("")
            messages.append("-------------------- duplicate error start ----------------")
            messages.append(f"Duplicate slug error count: {len(duplicates)}")
            messages.append(
                "Same slug under the same parent is blocked; same slug under different parents is allowed."
            )
            for duplicate_row in duplicates[:30]:
                first_row = seen_by_parent_slug[(duplicate_row.parent_id, normalize_slug(duplicate_row.slug))]
                parent_label = "root" if duplicate_row.parent_id is None else str(duplicate_row.parent_id)
                messages.append(
                    f"Line {duplicate_row.line_number}: duplicate slug {duplicate_row.slug!r} "
                    f"for parent {parent_label}; first seen on line {first_row.line_number}."
                )
            if len(duplicates) > 30:
                messages.append(f"... and {len(duplicates) - 30} more duplicate row(s).")
            messages.append("-------------------- duplicate error end ------------------")
        raise SystemExit("\n".join(messages))
    return rows


def validate_parents(cursor, parent_ids: set[int]) -> None:
    if not parent_ids:
        return

    cursor.execute(
        """
        SELECT id
        FROM categories
        WHERE id = ANY(%s)
          AND COALESCE(is_deleted, FALSE) = FALSE
        """,
        (list(parent_ids),),
    )
    found = {int(row[0]) for row in cursor.fetchall()}
    missing = sorted(parent_ids - found)
    if missing:
        sample = ", ".join(str(item) for item in missing[:20])
        suffix = "" if len(missing) <= 20 else f" and {len(missing) - 20} more"
        raise RuntimeError(f"Parent category id(s) not found: {sample}{suffix}")


def print_step(current: int, total: int, message: str) -> None:
    percent = current / total * 100
    print(f"[{current}/{total}] {percent:6.2f}% - {message}", flush=True)


def create_staging_table(cursor) -> None:
    cursor.execute(
        """
        CREATE TEMP TABLE manual_category_import (
            line_number INTEGER NOT NULL,
            parent_id INTEGER,
            name TEXT NOT NULL,
            slug TEXT NOT NULL
        ) ON COMMIT DROP
        """
    )


def copy_rows_to_staging(cursor, rows: list[CategoryRow]) -> None:
    with cursor.copy(
        "COPY manual_category_import (line_number, parent_id, name, slug) FROM STDIN"
    ) as copy:
        for row in rows:
            copy.write_row((row.line_number, row.parent_id, row.name, row.slug))


def bulk_update_categories(cursor) -> int:
    cursor.execute(
        """
        WITH updated AS (
            UPDATE categories category
            SET
                name = imported.name,
                depth = CASE
                    WHEN imported.parent_id IS NULL THEN 1
                    ELSE parent.depth + 1
                END,
                is_active = TRUE,
                is_deleted = FALSE,
                deleted_at = NULL,
                deleted_by = NULL,
                updated_at = NOW()
            FROM manual_category_import imported
            LEFT JOIN categories parent ON parent.id = imported.parent_id
            WHERE category.parent_id IS NOT DISTINCT FROM imported.parent_id
              AND category.slug = imported.slug
            RETURNING category.id
        )
        SELECT COUNT(*)::int FROM updated
        """
    )
    return int(cursor.fetchone()[0])


def bulk_insert_categories(cursor) -> int:
    cursor.execute(
        """
        WITH inserted AS (
            INSERT INTO categories (name, slug, parent_id, depth)
            SELECT
                imported.name,
                imported.slug,
                imported.parent_id,
                CASE
                    WHEN imported.parent_id IS NULL THEN 1
                    ELSE parent.depth + 1
                END
            FROM manual_category_import imported
            LEFT JOIN categories parent ON parent.id = imported.parent_id
            WHERE NOT EXISTS (
                SELECT 1
                FROM categories existing
                WHERE existing.parent_id IS NOT DISTINCT FROM imported.parent_id
                  AND existing.slug = imported.slug
            )
              AND (imported.parent_id IS NULL OR parent.id IS NOT NULL)
            RETURNING id
        )
        SELECT COUNT(*)::int FROM inserted
        """
    )
    return int(cursor.fetchone()[0])


def repair_closure_for_import(cursor) -> None:
    cursor.execute(
        """
        INSERT INTO category_closure (ancestor_id, descendant_id, depth)
        SELECT category.id, category.id, 0
        FROM categories category
        INNER JOIN manual_category_import imported
            ON imported.parent_id IS NOT DISTINCT FROM category.parent_id
           AND imported.slug = category.slug
        ON CONFLICT (ancestor_id, descendant_id) DO UPDATE
        SET depth = EXCLUDED.depth
        """
    )
    cursor.execute(
        """
        INSERT INTO category_closure (ancestor_id, descendant_id, depth)
        SELECT
            parent_closure.ancestor_id,
            category.id,
            parent_closure.depth + 1
        FROM categories category
        INNER JOIN manual_category_import imported
            ON imported.parent_id IS NOT DISTINCT FROM category.parent_id
           AND imported.slug = category.slug
        INNER JOIN category_closure parent_closure
            ON parent_closure.descendant_id = imported.parent_id
        WHERE imported.parent_id IS NOT NULL
        ON CONFLICT (ancestor_id, descendant_id) DO UPDATE
        SET depth = EXCLUDED.depth
        """
    )


def import_rows(database_url: str, rows: list[CategoryRow], dry_run: bool, _batch_size: int) -> None:
    pg = ensure_psycopg()
    total = len(rows)

    with pg.connect(database_url) as connection:
        with connection.cursor() as cursor:
            print_step(1, 6, "Checking parent categories")
            validate_parents(cursor, {row.parent_id for row in rows if row.parent_id is not None})

            if dry_run:
                print(f"Dry run OK: {len(rows)} rows validated. No database changes made.")
                connection.rollback()
                return

            print_step(2, 6, f"Creating staging table for {total} rows")
            create_staging_table(cursor)

            print_step(3, 6, "Copying CSV rows into staging")
            copy_rows_to_staging(cursor, rows)

            print_step(4, 6, "Bulk updating existing categories")
            updated = bulk_update_categories(cursor)

            print_step(5, 6, "Bulk inserting new categories and repairing tree closure")
            inserted = bulk_insert_categories(cursor)
            repair_closure_for_import(cursor)

            print_step(6, 6, "Committing changes")
            connection.commit()

    print(f"Import complete: {inserted} inserted, {updated} updated, {len(rows)} total.")


def ensure_psycopg():
    global psycopg
    if psycopg is not None:
        return psycopg

    if not REQUIREMENTS_FILE.exists():
        raise SystemExit(
            f"Missing {REQUIREMENTS_FILE}. Cannot install required packages automatically."
        )

    print("Missing Python package 'psycopg'. Installing manual tool requirements...")
    command = [
        sys.executable,
        "-m",
        "pip",
        "install",
        "-r",
        str(REQUIREMENTS_FILE),
    ]
    completed = subprocess.run(command, cwd=str(PROJECT_ROOT), check=False)
    if completed.returncode != 0:
        raise SystemExit(
            "Dependency install failed. Run manually: "
            "python -m pip install -r manual-tools/requirements.txt"
        )

    try:
        import psycopg as installed_psycopg
    except ImportError as exc:
        raise SystemExit(
            "Dependency install finished, but psycopg still cannot be imported. "
            "Restart PowerShell and try again."
        ) from exc

    psycopg = installed_psycopg
    return psycopg


def prompt_choice(prompt: str, choices: set[str]) -> str:
    while True:
        try:
            value = input(prompt).strip()
        except EOFError:
            raise SystemExit(0) from None
        if value in choices:
            return value
        print(f"Enter one of: {', '.join(sorted(choices))}")


def choose_input_file() -> Path:
    INPUT_DIR.mkdir(parents=True, exist_ok=True)
    csv_files = sorted(INPUT_DIR.glob("*.csv"), key=lambda path: path.name.lower())

    print(f"\nInput folder: {INPUT_DIR}")
    if csv_files:
        print("CSV files:")
        for index, path in enumerate(csv_files, start=1):
            print(f"  {index}. {path.name}")
        print("  P. Enter custom path")
        print("  Q. Quit")

        choices = {str(index) for index in range(1, len(csv_files) + 1)} | {"p", "P", "q", "Q"}
        choice = prompt_choice("Select file: ", choices)
        if choice.lower() == "q":
            raise SystemExit(0)
        if choice.lower() != "p":
            return csv_files[int(choice) - 1].resolve()
    else:
        print("No CSV files found there yet.")

    custom_path = input("Enter CSV file path or filename from Downloads: ").strip().strip('"')
    if not custom_path:
        raise SystemExit("No CSV file selected.")
    return resolve_csv_path(custom_path)


def run_category_feed(csv_file: str | None, db_url: str | None, dry_run: bool | None, batch_size: int) -> None:
    csv_path = resolve_csv_path(csv_file) if csv_file else choose_input_file()
    rows = read_rows(csv_path)
    database_url = resolve_database_url(db_url)

    if dry_run is None:
        print("\nMode:")
        print("  1. Dry run only")
        print("  2. Insert now")
        mode = prompt_choice("Select mode: ", {"1", "2"})
        dry_run = mode == "1"

    print(f"\nTool: Feed categories")
    print(f"CSV: {csv_path}")
    print(f"Rows: {len(rows)}")
    print(f"Mode: {'Dry run' if dry_run else 'Insert now'}")
    import_rows(database_url, rows, dry_run, batch_size)


def interactive_main(db_url: str | None, batch_size: int) -> None:
    INPUT_DIR.mkdir(parents=True, exist_ok=True)
    print("Manual Tools")
    print("============")
    print("1. Feed categories")
    print("Q. Quit")

    choice = prompt_choice("Select tool: ", {"1", "q", "Q"})
    if choice.lower() == "q":
        return
    if choice == "1":
        run_category_feed(None, db_url, None, batch_size)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Manual command line tools."
    )
    parser.add_argument("csv_file", nargs="?", help="CSV file path or filename in manual-tools/input or Downloads")
    parser.add_argument("--tool", choices=["categories"], help="Run a tool directly without the menu")
    parser.add_argument("--db-url", help="Postgres connection URL. Defaults to DATABASE_URL/.env.local")
    parser.add_argument("--dry-run", action="store_true", help="Validate CSV and parents without inserting")
    parser.add_argument("--insert", action="store_true", help="Insert rows without interactive confirmation")
    parser.add_argument("--batch-size", type=int, default=500, help="Legacy option; import now uses bulk staging")
    args = parser.parse_args()

    if args.batch_size <= 0:
        raise SystemExit("--batch-size must be positive")
    if args.dry_run and args.insert:
        raise SystemExit("Use only one of --dry-run or --insert")

    if args.csv_file or args.tool:
        dry_run = True if args.dry_run else False if args.insert else None
        if args.tool and args.tool != "categories":
            raise SystemExit(f"Unknown tool: {args.tool}")
        run_category_feed(args.csv_file, args.db_url, dry_run, args.batch_size)
        return

    interactive_main(args.db_url, args.batch_size)


if __name__ == "__main__":
    main()
