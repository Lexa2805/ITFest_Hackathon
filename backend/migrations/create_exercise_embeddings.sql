-- Enable pgvector extension (idempotent)
create extension if not exists vector;

-- Table: Exercise Embeddings for Workout RAG
create table if not exists exercise_embeddings (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    source_id text unique not null,
    embedding vector(1536),
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

-- HNSW index for cosine similarity search
create index if not exists exercise_embeddings_embedding_idx
    on exercise_embeddings using hnsw (embedding vector_cosine_ops);

-- Index on source_id for upsert lookups
create index if not exists exercise_embeddings_source_id_idx
    on exercise_embeddings(source_id);

-- RPC function for cosine similarity search
create or replace function match_exercises_rag(
    query_embedding vector(1536),
    match_threshold float,
    match_count int
)
returns table (
    id uuid,
    name text,
    source_id text,
    metadata jsonb,
    similarity float
)
language sql stable
as $$
    select
        id,
        name,
        source_id,
        metadata,
        1 - (embedding <=> query_embedding) as similarity
    from exercise_embeddings
    where 1 - (embedding <=> query_embedding) > match_threshold
    order by embedding <=> query_embedding
    limit match_count;
$$;

-- ALTER daily_logs: add last_reset_timestamp for audit/debugging
alter table if exists daily_logs
    add column if not exists last_reset_timestamp timestamptz;

-- ALTER profiles: add timezone for date boundary calculations
alter table if exists profiles
    add column if not exists timezone text default 'UTC';
