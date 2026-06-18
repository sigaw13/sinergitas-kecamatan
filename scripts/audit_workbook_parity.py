#!/usr/bin/env python3
"""Bandingkan baseline workbook dengan skor kerja dan hasil final aplikasi."""

from __future__ import annotations

import argparse
import sqlite3
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--database", type=Path, default=Path("database/sinergitas.db"))
    args = parser.parse_args()
    if not args.database.exists():
        print(f"Database tidak ditemukan: {args.database}")
        return 2

    connection = sqlite3.connect(args.database)
    connection.row_factory = sqlite3.Row
    try:
        rows = connection.execute(
            """
            SELECT k.nama, wb.total_score AS excel_score,
              COALESCE(a.total_score,0)+COALESCE(b.total_score,0)+COALESCE(c.total_score,0)+
              COALESCE(d.total_score,0)+COALESCE(e.total_score,0)+COALESCE(f.total_score,0) AS web_draft_score,
              er.total_score AS web_final_score, er.status AS final_status, wb.source_file
            FROM workbook_baselines wb
            JOIN kecamatan k ON k.id=wb.kecamatan_id
            LEFT JOIN aspect_a a ON a.kecamatan_id=k.id
            LEFT JOIN aspect_b b ON b.kecamatan_id=k.id
            LEFT JOIN aspect_c c ON c.kecamatan_id=k.id
            LEFT JOIN aspect_d d ON d.kecamatan_id=k.id
            LEFT JOIN aspect_e e ON e.kecamatan_id=k.id
            LEFT JOIN aspect_f f ON f.kecamatan_id=k.id
            LEFT JOIN evaluation_results er ON er.kecamatan_id=k.id
            ORDER BY k.nama
            """
        ).fetchall()
        print("KECAMATAN | EXCEL | WEB DRAFT | WEB FINAL | SELISIH DRAFT | SUMBER")
        print("-" * 110)
        mismatches = 0
        for row in rows:
            excel_score = float(row["excel_score"] or 0)
            draft_score = float(row["web_draft_score"] or 0)
            difference = round(draft_score - excel_score, 2)
            if abs(difference) > 0.001:
                mismatches += 1
            final = "-" if row["web_final_score"] is None else f"{float(row['web_final_score']):.2f}"
            print(
                f"{row['nama']} | {excel_score:.2f} | {draft_score:.2f} | {final} | "
                f"{difference:+.2f} | {row['source_file'] or '-'}"
            )
        print(f"\nRingkasan: {len(rows)} baseline, {mismatches} masih berbeda dari skor kerja web.")
    finally:
        connection.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
