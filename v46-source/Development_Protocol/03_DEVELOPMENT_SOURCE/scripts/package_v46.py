"""Build the V46 four-folder ZIP from the validated release tree."""
import hashlib
import json
from pathlib import Path
import sys
import zipfile

root = Path(__file__).resolve().parents[3]
dev = root / "Development_Protocol"
output = Path(sys.argv[1]).resolve()
output.parent.mkdir(parents=True, exist_ok=True)
entries = {"READ_ME_FIRST.txt": root / "READ_ME_FIRST.txt"}
skip_dirs = {"node_modules", "__pycache__", ".git", "_site", ".plmr-upload", ".temp", ".cache"}
skip_dev = {"Kullanici_Referansi.png", "Kullanici_Referanslari", "Tarihsel_Kaynak", "PACKAGE_SHA256.json"}
skip_binary_tests = {".png", ".jpg", ".jpeg", ".pdf", ".xlsx", ".dae", ".dxf", ".zip"}

def add_folder(source, target, kind=None):
    for file in source.rglob("*"):
        rel = file.relative_to(source)
        if not file.is_file() or file.is_symlink() or any(part in skip_dirs for part in rel.parts):
            continue
        if file.name.startswith(".env") or file.name.endswith(".tsbuildinfo"):
            continue
        if kind == "source":
            if rel.parts[0] in skip_dev or rel.as_posix().startswith((
                    "03_DEVELOPMENT_SOURCE/dist/", "03_DEVELOPMENT_SOURCE/public/drawing-engine/")):
                continue
            if file.name.startswith("V") and file.name.endswith("_BACKEND_MANIFEST.json") and file.name != "V46_BACKEND_MANIFEST.json":
                continue
        if kind == "tests" and (file.suffix.lower() in skip_binary_tests or file.name in {
                "probe.js", "probe-ui.js", "probe-production.js", "media-probe.js", "zip-probe.js", "probe-workflows.js"}):
            continue
        entries[target + "/" + rel.as_posix()] = file

add_folder(root / "Uygulama/github", "01_APPLICATION")
add_folder(root / "Uygulama/supabase", "02_SUPABASE")
add_folder(root / "Test-Mantik", "03_TESTS_REPORTS/Test-Mantik", "tests")
add_folder(dev, "04_DOCS_HANDOFF/Development_Protocol", "source")
entries["03_TESTS_REPORTS/KABUL_V46.md"] = root / "Test-Mantik/v46/KABUL.md"
entries["04_DOCS_HANDOFF/DEVIR_V46.md"] = dev / "DEVIR_NOTU.md"
entries["04_DOCS_HANDOFF/kaynak-hazirla.py"] = root / "kaynak-hazirla.py"
v44 = root / "Gecmis_Surum_Notlari/V44"
if v44.is_dir():
    add_folder(v44, "04_DOCS_HANDOFF/Gecmis_Surum_Notlari/V44")
else:
    entries["04_DOCS_HANDOFF/Gecmis_Surum_Notlari/V44_KABUL.md"] = root / "Test-Mantik/v44/KABUL.md"

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

manifest = {name: sha(file) for name, file in sorted(entries.items())}
with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
    for name, file in sorted(entries.items()):
        archive.write(file, name)
    archive.writestr("04_DOCS_HANDOFF/PACKAGE_SHA256.json", json.dumps(manifest, indent=2) + "\n")
with zipfile.ZipFile(output) as archive:
    assert archive.testzip() is None
    assert {name.split("/")[0] for name in archive.namelist()} == {
        "READ_ME_FIRST.txt", "01_APPLICATION", "02_SUPABASE", "03_TESTS_REPORTS", "04_DOCS_HANDOFF"}
    for name, expected in manifest.items():
        assert hashlib.sha256(archive.read(name)).hexdigest() == expected, name
print(json.dumps({"file": str(output), "bytes": output.stat().st_size, "sha256": sha(output), "crc": "PASS"}))
