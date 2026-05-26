import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://orupchhbprpwulovxovn.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_VveLKqEXrNGfA5kQGqzXCA_enIWHKLT'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
