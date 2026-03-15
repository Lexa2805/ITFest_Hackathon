-- Enable Supabase Realtime on the messages table so that
-- postgres_changes INSERT events are broadcast to subscribers.
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
