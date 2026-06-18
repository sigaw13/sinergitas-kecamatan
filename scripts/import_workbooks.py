#!/usr/bin/env python3
"""Import data master dan baseline skor dari workbook SIESELON.

Pemakaian:
  python3 scripts/import_workbooks.py imports/input/*.xlsx
  python3 scripts/import_workbooks.py --database database/sinergitas.db file.xlsx

Importer tidak menandai instrumen sebagai final dan tidak membuat bukti dukung
palsu. Nilai workbook disimpan sebagai baseline audit untuk dibandingkan dengan
hasil perhitungan web.
"""

from __future__ import annotations

import argparse
import re
import sqlite3
import sys
import zipfile
from pathlib import Path
import xml.etree.ElementTree as ET

MAIN_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
PKG_REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships"
NS = {"m": MAIN_NS, "r": REL_NS, "p": PKG_REL_NS}


def normalize_name(value: str) -> str:
    return re.sub(r"[^A-Z0-9]", "", str(value or "").upper())


def column_name(reference: str) -> str:
    match = re.match(r"([A-Z]+)", reference or "")
    return match.group(1) if match else ""


class XlsxReader:
    def __init__(self, filename: Path):
        self.filename = filename
        self.archive = zipfile.ZipFile(filename)
        self.shared_strings = self._shared_strings()
        self.sheet_paths = self._sheet_paths()

    def close(self) -> None:
        self.archive.close()

    def _shared_strings(self) -> list[str]:
        try:
            root = ET.fromstring(self.archive.read("xl/sharedStrings.xml"))
        except KeyError:
            return []
        return [
            "".join(node.text or "" for node in item.iter(f"{{{MAIN_NS}}}t"))
            for item in root.findall("m:si", NS)
        ]

    def _sheet_paths(self) -> dict[str, str]:
        workbook = ET.fromstring(self.archive.read("xl/workbook.xml"))
        relationships = ET.fromstring(self.archive.read("xl/_rels/workbook.xml.rels"))
        targets = {
            item.attrib["Id"]: item.attrib["Target"]
            for item in relationships.findall(f"{{{PKG_REL_NS}}}Relationship")
        }
        result: dict[str, str] = {}
        for sheet in workbook.findall(".//m:sheet", NS):
            relationship_id = sheet.attrib[f"{{{REL_NS}}}id"]
            target = targets[relationship_id].lstrip("/")
            if not target.startswith("xl/"):
                target = f"xl/{target}"
            result[sheet.attrib["name"].strip()] = target
        return result

    def cells(self, sheet_name: str) -> dict[str, object]:
        matching = next(
            (name for name in self.sheet_paths if name.strip().lower() == sheet_name.strip().lower()),
            None,
        )
        if not matching:
            return {}
        root = ET.fromstring(self.archive.read(self.sheet_paths[matching]))
        values: dict[str, object] = {}
        for cell in root.findall(".//m:sheetData/m:row/m:c", NS):
            reference = cell.attrib.get("r", "")
            value_node = cell.find("m:v", NS)
            value: object = "" if value_node is None else value_node.text or ""
            if cell.attrib.get("t") == "s" and str(value).isdigit():
                value = self.shared_strings[int(str(value))]
            elif cell.attrib.get("t") == "inlineStr":
                value = "".join(node.text or "" for node in cell.iter(f"{{{MAIN_NS}}}t"))
            elif value not in ("", None):
                try:
                    value = float(str(value))
                except ValueError:
                    pass
            values[reference] = value
        return values


def ensure_schema(connection: sqlite3.Connection) -> None:
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS workbook_baselines (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          kecamatan_id INTEGER NOT NULL UNIQUE,
          score_a REAL DEFAULT 0,
          score_b REAL DEFAULT 0,
          score_c REAL DEFAULT 0,
          score_d REAL DEFAULT 0,
          score_e REAL DEFAULT 0,
          score_f REAL DEFAULT 0,
          total_score REAL DEFAULT 0,
          source_file TEXT,
          imported_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (kecamatan_id) REFERENCES kecamatan(id) ON DELETE CASCADE
        )
        """
    )


def kecamatan_map(connection: sqlite3.Connection) -> dict[str, int]:
    return {
        normalize_name(name): identifier
        for identifier, name in connection.execute("SELECT id, nama FROM kecamatan WHERE role = 'kecamatan'")
    }


def upsert_contact(
    connection: sqlite3.Connection,
    mapping: dict[str, int],
    name: object,
    manager: object,
    email: object,
    phone: object,
) -> bool:
    identifier = mapping.get(normalize_name(str(name or "")))
    if not identifier:
        return False
    connection.execute(
        """
        UPDATE kecamatan
        SET nama_pengelola = COALESCE(NULLIF(?, ''), nama_pengelola),
            email = COALESCE(NULLIF(?, ''), email),
            no_hp = COALESCE(NULLIF(?, ''), no_hp)
        WHERE id = ?
        """,
        (str(manager or "").strip(), str(email or "").strip(), str(phone or "").strip(), identifier),
    )
    return True


def upsert_baseline(
    connection: sqlite3.Connection,
    identifier: int,
    scores: list[float],
    source_file: str,
) -> None:
    padded = (scores + [0.0] * 6)[:6]
    total = round(sum(padded), 2)
    connection.execute(
        """
        INSERT INTO workbook_baselines
          (kecamatan_id, score_a, score_b, score_c, score_d, score_e, score_f,
           total_score, source_file, imported_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(kecamatan_id) DO UPDATE SET
          score_a=excluded.score_a, score_b=excluded.score_b,
          score_c=excluded.score_c, score_d=excluded.score_d,
          score_e=excluded.score_e, score_f=excluded.score_f,
          total_score=excluded.total_score, source_file=excluded.source_file,
          imported_at=CURRENT_TIMESTAMP
        """,
        (identifier, *padded, total, source_file),
    )


def number(value: object) -> float:
    try:
        return round(float(value or 0), 2)
    except (TypeError, ValueError):
        return 0.0


def infer_kecamatan_from_filename(filename: str, mapping: dict[str, int]) -> int | None:
    normalized = normalize_name(filename)
    candidates = sorted(mapping.items(), key=lambda item: len(item[0]), reverse=True)
    return next((identifier for name, identifier in candidates if name and name in normalized), None)


def import_file(
    connection: sqlite3.Connection,
    mapping: dict[str, int],
    path: Path,
) -> tuple[int, int]:
    reader = XlsxReader(path)
    contacts = 0
    baselines = 0
    try:
        master = reader.cells("LINK KECAMATAN")
        if master:
            for row in range(6, 32):
                if upsert_contact(
                    connection,
                    mapping,
                    master.get(f"B{row}"),
                    master.get(f"C{row}"),
                    master.get(f"D{row}"),
                    master.get(f"E{row}"),
                ):
                    contacts += 1

            summary = reader.cells("Sheet6")
            for row in range(6, 32):
                identifier = mapping.get(normalize_name(str(summary.get(f"G{row}", ""))))
                if identifier:
                    connection.execute(
                        """
                        INSERT INTO workbook_baselines
                          (kecamatan_id, total_score, source_file, imported_at)
                        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
                        ON CONFLICT(kecamatan_id) DO UPDATE SET
                          total_score=excluded.total_score,
                          source_file=excluded.source_file,
                          imported_at=CURRENT_TIMESTAMP
                        """,
                        (identifier, number(summary.get(f"H{row}")), path.name),
                    )
                    baselines += 1

        recap = reader.cells("Rekap")
        if recap:
            identifier = infer_kecamatan_from_filename(path.name, mapping)
            if identifier:
                scores = [number(recap.get(f"{column}14")) for column in "ABCDEF"]
                upsert_baseline(connection, identifier, scores, path.name)
                baselines += 1
    finally:
        reader.close()
    return contacts, baselines


def main() -> int:
    parser = argparse.ArgumentParser(description="Import workbook SIESELON ke database SQLite.")
    parser.add_argument("files", nargs="*", type=Path)
    parser.add_argument("--database", type=Path, default=Path("database/sinergitas.db"))
    args = parser.parse_args()

    files = args.files or list(Path("imports/input").glob("*.xlsx"))
    files = sorted(
        files,
        key=lambda path: (
            0 if "DASHBOARD" in path.name.upper() else 1,
            path.name.upper(),
        ),
    )
    if not files:
        print("Tidak ada file .xlsx. Letakkan file pada imports/input atau berikan path sebagai argumen.")
        return 2
    if not args.database.exists():
        print(f"Database tidak ditemukan: {args.database}. Jalankan aplikasi sekali untuk membuat database.")
        return 2

    connection = sqlite3.connect(args.database)
    try:
        ensure_schema(connection)
        mapping = kecamatan_map(connection)
        total_contacts = 0
        total_baselines = 0
        for path in files:
            if not path.exists():
                print(f"⚠️ Dilewati, file tidak ditemukan: {path}")
                continue
            contacts, baselines = import_file(connection, mapping, path)
            total_contacts += contacts
            total_baselines += baselines
            print(f"✓ {path.name}: kontak={contacts}, baseline={baselines}")
        connection.commit()
        print(f"✅ Import selesai: {total_contacts} data kontak dan {total_baselines} baseline diproses.")
    finally:
        connection.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
