import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://orupchbprpwulovxovn.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ydXBjaHhicHJwd3Vsb3Z4b3ZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MTU3MzcsImV4cCI6MjA5NTM5MTczN30.0TCVm3FvGj9g5lUEoFdRs6HZw0OT5G-CcrsTDFSQlyI'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  global: {
    headers: {
      'X-Client-Info': 'keizaal-economy-tool'
    }
  }
})
