"""HTTP-level tests for POST /provenance/file. Uses the same real C2PA
fixtures as test_c2pa.py, over an actual multipart upload."""

from __future__ import annotations

import io
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.main import app

client = TestClient(app)

FIXTURES = Path(__file__).parent / "fixtures" / "c2pa"


def _plain_png_bytes() -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (4, 4), color=(50, 60, 70)).save(buf, format="PNG")
    return buf.getvalue()


def test_validly_signed_upload_reports_valid() -> None:
    data = (FIXTURES / "C.jpg").read_bytes()
    response = client.post("/provenance/file", files={"file": ("C.jpg", data, "image/jpeg")})
    assert response.status_code == 200
    body = response.json()
    assert body["c2pa"]["status"] == "valid"
    assert body["c2pa"]["signatureIssuer"] == "C2PA Test Signing Cert"
    assert "exif" in body


def test_plain_png_with_no_manifest_reports_no_manifest() -> None:
    response = client.post(
        "/provenance/file", files={"file": ("plain.png", _plain_png_bytes(), "image/png")}
    )
    assert response.status_code == 200
    assert response.json()["c2pa"]["status"] == "no-manifest"


def test_rejects_unsupported_content_type() -> None:
    response = client.post("/provenance/file", files={"file": ("doc.txt", b"hello", "text/plain")})
    assert response.status_code == 415


def test_rejects_oversized_file(monkeypatch: pytest.MonkeyPatch) -> None:
    # Monkeypatch the limit down rather than actually uploading 20MB+: it
    # exercises the exact same size-check code with a payload that stays
    # in memory, no multipart temp-file spooling required.
    monkeypatch.setattr("app.routers.provenance.MAX_FILE_SIZE", 10)
    response = client.post("/provenance/file", files={"file": ("big.png", b"x" * 11, "image/png")})
    assert response.status_code == 413
