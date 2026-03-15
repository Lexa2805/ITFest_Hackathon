-- ---------------------------------------------------------------------------
-- Update placeholder exercise demo URLs to real image URLs
-- ---------------------------------------------------------------------------

update public.exercises
set demonstration_url = case
    when lower(muscle_group) in ('chest', 'push') then 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=1200&q=80'
    when lower(muscle_group) in ('back', 'pull') then 'https://images.unsplash.com/photo-1598971639058-a86d8a8f6f95?auto=format&fit=crop&w=1200&q=80'
    when lower(muscle_group) in ('shoulders') then 'https://images.unsplash.com/photo-1584466977773-e625c37cdd50?auto=format&fit=crop&w=1200&q=80'
    when lower(muscle_group) in ('arms', 'biceps', 'triceps') then 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=1200&q=80'
    when lower(muscle_group) in ('legs', 'glutes', 'hamstrings', 'quadriceps', 'calves') then 'https://images.unsplash.com/photo-1593079831268-3381b0db4a77?auto=format&fit=crop&w=1200&q=80'
    when lower(muscle_group) in ('core') then 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1200&q=80'
    else 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?auto=format&fit=crop&w=1200&q=80'
end,
updated_at = now()
where demonstration_url is null
   or demonstration_url like 'https://example.com/demos/%';
