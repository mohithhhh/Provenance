"""Unit tests for Module D's EXIF surfacing. EXIF is unsigned, freely
editable metadata — shown as raw context, not a provenance claim (that's
C2PA's job, see test_c2pa.py)."""

from __future__ import annotations

import io

from PIL import Image

from app.provenance.exif import extract_exif


def _jpeg_with_exif(tags: dict[int, str]) -> bytes:
    img = Image.new("RGB", (4, 4), color=(10, 20, 30))
    exif = img.getexif()
    for tag_id, value in tags.items():
        exif[tag_id] = value
    buf = io.BytesIO()
    img.save(buf, format="JPEG", exif=exif)
    return buf.getvalue()


def test_extracts_known_tags_by_name() -> None:
    data = _jpeg_with_exif({271: "TestMake", 272: "TestModel"})  # Make, Model
    tags = extract_exif(data)
    assert tags["Make"] == "TestMake"
    assert tags["Model"] == "TestModel"


def test_image_without_exif_returns_empty_dict() -> None:
    buf = io.BytesIO()
    Image.new("RGB", (4, 4), color=(0, 0, 0)).save(buf, format="PNG")
    assert extract_exif(buf.getvalue()) == {}


def test_non_image_bytes_return_empty_dict_without_crashing() -> None:
    assert extract_exif(b"not an image at all") == {}
