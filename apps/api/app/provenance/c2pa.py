"""Module D: file provenance via C2PA manifest verification.

Wraps the official `c2pa-python` SDK (bindings to Adobe/CAI's `c2pa-rs`) to
verify Content Credentials embedded in an uploaded image. This is the one
module in this suite that does **cryptographic verification of an attached,
signed claim** rather than statistical inference about the content itself
— the UI must keep that distinction visible (see docs/architecture.md).

An image with no C2PA manifest is simply unlabeled: this module says
nothing about whether such an image is AI-generated or not, only that no
signed claim was found to check.
"""

from __future__ import annotations

import io
from dataclasses import dataclass
from typing import Literal

import c2pa

Status = Literal["valid", "invalid", "no-manifest", "unsupported"]


@dataclass(frozen=True)
class C2paResult:
    status: Status
    title: str | None
    claim_generator: str | None
    signature_issuer: str | None
    signed_at: str | None
    # Human-readable explanations from validation_results. Can be non-empty
    # even when status == "valid" — e.g. a manifest signed with a test
    # certificate not in the SDK's trust store reports "signing certificate
    # untrusted" here without affecting the overall (hash/timestamp
    # integrity) validation_state.
    failures: list[str]


def verify(data: bytes, mime_type: str) -> C2paResult:
    """Reads and validates any C2PA manifest embedded in `data`. Never
    raises: an asset with no manifest, or one the SDK can't parse at all,
    comes back as a result with status "no-manifest"/"unsupported" rather
    than an exception — a missing or unreadable manifest is an expected,
    common case for arbitrary user uploads, not an error."""
    try:
        reader = c2pa.Reader(mime_type, io.BytesIO(data))
    except c2pa.C2paError.ManifestNotFound:
        return C2paResult(
            status="no-manifest",
            title=None,
            claim_generator=None,
            signature_issuer=None,
            signed_at=None,
            failures=[],
        )
    except c2pa.C2paError:
        return C2paResult(
            status="unsupported",
            title=None,
            claim_generator=None,
            signature_issuer=None,
            signed_at=None,
            failures=[],
        )

    manifest = reader.get_active_manifest() or {}
    validation_results = reader.get_validation_results() or {}
    failures = [
        entry["explanation"]
        for section in validation_results.values()
        for entry in section.get("failure", [])
    ]
    signature_info = manifest.get("signature_info") or {}
    status: Status = "valid" if reader.get_validation_state() == "Valid" else "invalid"

    return C2paResult(
        status=status,
        title=manifest.get("title"),
        claim_generator=manifest.get("claim_generator"),
        signature_issuer=signature_info.get("issuer"),
        signed_at=signature_info.get("time"),
        failures=failures,
    )
