import { createClient } from '@supabase/supabase-js'

// ✅ Configuration correcte Supabase (URL + clé anonyme)
const supabaseUrl = 'https://aoidadxujanyxpxctbyvb.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvaWRhZHh1amFueHB4Y3RieXZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzMDYyNzYsImV4cCI6MjA3NDg4MjI3Nn0.Iaf6J_KzUzRNddUE6Mq6xTJW0xKc7eR6FU3OtW2CwHw'

export const supabase = createClient(supabaseUrl, supabaseKey)
