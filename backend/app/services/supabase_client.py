"""
Supabase async client singleton for server-side operations.
Uses the SERVICE_ROLE_KEY which bypasses RLS – backend only!
"""

import os
from dotenv import load_dotenv
from supabase import create_async_client, create_client, AsyncClient, Client

load_dotenv()

SUPABASE_URL: str = os.environ["SUPABASE_URL"]
SUPABASE_KEY: str = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

_client: AsyncClient | None = None
_sync_client: Client | None = None


async def get_supabase() -> AsyncClient:
    """Return the async Supabase client, creating it on first call."""
    global _client
    if _client is None:
        _client = await create_async_client(SUPABASE_URL, SUPABASE_KEY)
    return _client


def get_supabase_client() -> Client:
    """Return the synchronous Supabase client for legacy call sites."""
    global _sync_client
    if _sync_client is None:
        _sync_client = create_client(SUPABASE_URL, SUPABASE_KEY)
    return _sync_client
