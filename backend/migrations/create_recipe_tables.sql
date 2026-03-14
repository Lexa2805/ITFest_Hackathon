-- Enable pgvector extension
create extension if not exists vector;

-- Table 1: Recipe Embeddings
create table if not exists recipe_embeddings (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    source_url text,
    embedding vector(1536),
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

-- Index for pgvector
create index if not exists recipe_embeddings_embedding_idx on recipe_embeddings using hnsw (embedding vector_cosine_ops);

-- Table 2: Weekly Plans
create table if not exists weekly_plans (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users not null,
    week_start_date date not null,
    plan jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

-- Table 3: Shopping Lists
create table if not exists shopping_lists (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users not null,
    recipe_ids uuid[] not null default '{}',
    items jsonb not null default '[]'::jsonb,
    created_at timestamptz not null default now(),
    completed_at timestamptz
);

-- Function for similarity search
create or replace function match_recipes(
    query_embedding vector(1536),
    match_threshold float,
    match_count int
)
returns table (
    id uuid,
    name text,
    source_url text,
    metadata jsonb,
    similarity float
)
language sql stable
as $$
    select
        id,
        name,
        source_url,
        metadata,
        1 - (embedding <=> query_embedding) as similarity
    from recipe_embeddings
    where 1 - (embedding <=> query_embedding) > match_threshold
    order by embedding <=> query_embedding
    limit match_count;
$$;
