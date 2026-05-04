import { createClient } from "@supabase/supabase-js"
import { appConfig } from "@/lib/app-config"

const supabaseUrl = appConfig.supabase.url || process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabasePublishableKey = appConfig.supabase.publishableKey || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error("Missing Supabase public configuration. Set deployment config or NEXT_PUBLIC_SUPABASE_*.");
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey)
