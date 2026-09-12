"""Unit tests for Module D's C2PA manifest verification. Uses real C2PA
test fixtures (see tests/fixtures/c2pa/README.md) rather than hand-rolled
bytes — C2PA manifests are cryptographically signed JUMBF data, not
something worth faking by hand."""

from __future__ import annotations

import io
from pathlib import Path

from PIL import Image

from app.provenance.c2pa import verify

FIXTURES = Path(__file__).parent / "fixtures" / "c2pa"


def _plain_png() -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (4, 4), color=(120, 200, 50)).save(buf, format="PNG")
    return buf.getvalue()


def test_validly_signed_image_reports_valid() -> None:
    # Signed with C2PA's own test cert, not a real trusted root CA, so the
    # SDK still reports a "signing certificate untrusted" failure even on
    # this pristine fixture — that's expected and doesn't flip the overall
    # validation state, which is what "valid" here actually tracks (hash +
    # timestamp integrity, not real-world CA trust).
    data = (FIXTURES / "C.jpg").read_bytes()
    result = verify(data, "image/jpeg")
    assert result.status == "valid"


def test_valid_image_surfaces_signature_metadata() -> None:
    data = (FIXTURES / "C.jpg").read_bytes()
    result = verify(data, "image/jpeg")
    assert result.title == "C.jpg"
    assert result.signature_issuer == "C2PA Test Signing Cert"
    assert result.claim_generator is not None


def test_tampered_signed_image_reports_invalid() -> None:
    data = bytearray((FIXTURES / "C.jpg").read_bytes())
    data[len(data) - 500] ^= 0xFF  # corrupt image bytes after signing
    result = verify(bytes(data), "image/jpeg")
    assert result.status == "invalid"
    assert len(result.failures) > 0


def test_image_with_no_manifest_reports_no_manifest() -> None:
    result = verify(_plain_png(), "image/png")
    assert result.status == "no-manifest"
    assert result.title is None
    assert result.failures == []


def test_unparseable_bytes_report_unsupported() -> None:
    result = verify(b"not an image at all", "image/jpeg")
    assert result.status == "unsupported"
