import { createClient } from "@supabase/supabase-js"
import { appConfig } from "@/lib/app-config"

const supabaseUrl = appConfig.supabase.url
const supabasePublishableKey = appConfig.supabase.publishableKey

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error("Missing Supabase public configuration. Set supabase.url and supabase.publishableKey in deployment config.");
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey)
