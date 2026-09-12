"""HTTP surface for Module D (file provenance: C2PA + EXIF).

Unlike every other module in this suite, this one doesn't statistically
infer anything about the uploaded content — it verifies a cryptographically
signed claim (C2PA) if one is attached, and surfaces raw, unsigned EXIF
metadata for context. "Cryptographically verified" vs. "statistically
inferred" is the distinction the UI keeps visible; see docs/architecture.md.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from ..provenance.c2pa import verify as verify_c2pa
from ..provenance.exif import extract_exif

router = APIRouter(prefix="/provenance", tags=["provenance"])

MAX_FILE_SIZE = 20 * 1024 * 1024  # 20MB — generous for a demo, not a real upload service
SUPPORTED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}

# Starlette's multipart parser has its own hard per-part size cap (1MB by
# default as of Starlette 1.x) that fires — as a generic, unhelpful 400 —
# before FastAPI's `UploadFile = File(...)` injection or any of our own
# code ever runs, making MAX_FILE_SIZE above unreachable for anything over
# 1MB. Parsing the form manually with a raised cap here lets our own check
# below be the one that actually enforces MAX_FILE_SIZE, with a clean 413.
_FORM_PART_SIZE_CAP = 200 * 1024 * 1024


class C2paResponse(BaseModel):
    status: str
    title: str | None
    claimGenerator: str | None
    signatureIssuer: str | None
    signedAt: str | None
    failures: list[str]


class ProvenanceResponse(BaseModel):
    c2pa: C2paResponse
    exif: dict[str, str]


@router.post("/file", response_model=ProvenanceResponse)
async def check_provenance(request: Request) -> ProvenanceResponse:
    form = await request.form(max_part_size=_FORM_PART_SIZE_CAP)
    file = form.get("file")
    if file is None or isinstance(file, str):
        raise HTTPException(status_code=400, detail="No file uploaded under the 'file' field.")

    if file.content_type not in SUPPORTED_MIME_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type: {file.content_type}. "
            f"Supported: {', '.join(sorted(SUPPORTED_MIME_TYPES))}.",
        )

    data = await file.read()
    if len(data) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large (max 20MB).")

    result = verify_c2pa(data, file.content_type)
    return ProvenanceResponse(
        c2pa=C2paResponse(
            status=result.status,
            title=result.title,
            claimGenerator=result.claim_generator,
            signatureIssuer=result.signature_issuer,
            signedAt=result.signed_at,
            failures=result.failures,
        ),
        exif=extract_exif(data),
    )
