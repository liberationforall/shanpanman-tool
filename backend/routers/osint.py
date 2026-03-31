from fastapi import APIRouter
from typing import Optional

from utils.parser import load_citizen_reports

router = APIRouter(prefix="/osint", tags=["osint"])

@router.get("/citizen-reports")
def get_citizen_reports():
    """
    Return all translated citizen reports.
    """
    reports = load_citizen_reports()
    return {"data": reports, "count": len(reports)}
