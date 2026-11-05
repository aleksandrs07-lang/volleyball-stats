import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://qhxtgtljkgzqvsvzvevx.supabase.co'
const supabaseKey = 'sb_publishable_K_uchJ2nhGv2VJw38P4MBg_YdMITuDd'

export const supabase = createClient(supabaseUrl, supabaseKey)