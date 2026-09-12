"""EXIF metadata surfacing for Module D.

Unlike the C2PA manifest (`c2pa.py`), EXIF is unsigned, trivially editable
metadata — shown as raw context for a human to weigh, never as a
provenance claim in its own right.
"""

from __future__ import annotations

import io

from PIL import ExifTags, Image


def extract_exif(data: bytes) -> dict[str, str]:
    """Returns every readable EXIF tag as {name: str(value)}. Bytes that
    aren't a valid image, or that Pillow can't extract EXIF from (PNG,
    or a JPEG with no EXIF block at all), come back as an empty dict
    rather than raising — malformed or EXIF-less uploads are an expected
    case here, not an error."""
    try:
        exif = Image.open(io.BytesIO(data)).getexif()
    except Exception:
        return {}
    return {ExifTags.TAGS.get(tag_id, str(tag_id)): str(value) for tag_id, value in exif.items()}
