"""HTTP surface for Module G (Attack Lab).

Applies one attack to text server-side; the frontend then runs the
existing detection endpoints (/detect, /classify, /ledger) on both the
original and attacked text itself and shows the before/after side by
side — this endpoint's only job is the perturbation.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ..attacks.attacks import AttackType, apply_attack
from ..attacks.paraphrase import ParaphraserUnavailable

router = APIRouter(prefix="/attacks", tags=["attacks"])


class AttackRequest(BaseModel):
    text: str = Field(min_length=1, max_length=20_000)
    attack: AttackType
    strength: float = Field(ge=0.0, le=1.0)
    seed: int = 0


class AttackResponse(BaseModel):
    attackedText: str


@router.post("/apply", response_model=AttackResponse)
def apply_attack_route(payload: AttackRequest) -> AttackResponse:
    try:
        attacked = apply_attack(payload.text, payload.attack, payload.strength, payload.seed)
    except ParaphraserUnavailable as err:
        raise HTTPException(status_code=503, detail=str(err)) from err
    return AttackResponse(attackedText=attacked)
