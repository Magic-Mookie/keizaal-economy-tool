import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://orupchxbprpwulovxovn.supabase.co'
const SUPABASE_ANON_KEY = 'YOUR_LEGACY_ANON_KEY_HERE'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
