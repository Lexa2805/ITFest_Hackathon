/**
 * Lightweight Supabase client for Realtime subscriptions only.
 * No reads or writes go through this client — only event subscriptions.
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabaseRealtime = createClient(supabaseUrl, supabaseAnonKey);
