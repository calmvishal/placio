from typing import List, Callable, Dict, Any
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from bson import ObjectId
from app.core.security import decode_access_token
from app.db.mongodb import get_database

security_bearer = HTTPBearer(auto_error=False)

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_bearer),
    db = Depends(get_database)
) -> Dict[str, Any]:
    """
    Extract Bearer JWT token from Authorization header, validate signature,
    and return the active authenticated user document.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token missing or invalid format. Please log in.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or token is invalid. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id_str = payload.get("user_id")
    if not user_id_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed token claims.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service unavailable.",
        )

    try:
        user = await db["users"].find_one({"_id": ObjectId(user_id_str)})
    except Exception:
        user = None

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account associated with this token no longer exists.",
        )

    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated. Contact the placement office.",
        )

    # Return safe user dictionary without password hash
    safe_user = dict(user)
    safe_user["id"] = str(user["_id"])
    safe_user.pop("hashed_password", None)
    return safe_user

def require_role(allowed_roles: List[str]) -> Callable:
    """
    Dependency factory that enforces Role-Based Access Control (RBAC).
    Rejects any request from users whose role is not in allowed_roles with HTTP 403.
    """
    async def role_checker(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
        user_role = current_user.get("role")
        if user_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: Requires one of roles {allowed_roles}, but you are '{user_role}'.",
            )
        return current_user
    return role_checker
