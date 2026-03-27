from fastapi import APIRouter, Query
from typing import Optional

from utils.parser import load_strikes, compute_stats, strikes_by_day

router = APIRouter(prefix="/strikes", tags=["strikes"])


@router.get("")
def get_strikes(
    confirmed_only: Optional[bool] = Query(None, description="Filter to confirmed strikes"),
    date: Optional[str] = Query(None, description="Filter by ISO date (YYYY-MM-DD)"),
    tehran_only: Optional[bool] = Query(None, description="Filter to Tehran strikes"),
):
    """
    Return all strikes, optionally filtered.

    Query params:
        confirmed_only: true → accurate==yes only
        date: e.g. 2026-03-11 → that day's strikes only
    """
    strikes = load_strikes()

    if tehran_only:
        strikes = [s for s in strikes if s.get("in_tehran")]

    if confirmed_only is True:
        strikes = [s for s in strikes if s["accurate"]]
    elif confirmed_only is False:
        strikes = [s for s in strikes if not s["accurate"]]

    if date:
        strikes = [s for s in strikes if s["strike_date"] == date]

    return {"data": strikes, "count": len(strikes)}


@router.get("/stats")
def get_stats(
    tehran_only: Optional[bool] = Query(None, description="Filter to Tehran strikes"),
):
    """Return aggregate statistics for the key-figure cards."""
    strikes = load_strikes()
    if tehran_only:
        strikes = [s for s in strikes if s.get("in_tehran")]
    return compute_stats(strikes)


@router.get("/timeline")
def get_timeline(
    tehran_only: Optional[bool] = Query(None, description="Filter to Tehran strikes"),
):
    """Return strikes grouped by day for the timeline chart."""
    strikes = load_strikes()
    if tehran_only:
        strikes = [s for s in strikes if s.get("in_tehran")]
    return {"data": strikes_by_day(strikes)}
