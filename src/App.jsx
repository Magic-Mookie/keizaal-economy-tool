## 5. src/supabase.js
```js
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://orupchhbprpwulovxovn.supabase.co'
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY_HERE' // paste your regenerated key

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
```

---
