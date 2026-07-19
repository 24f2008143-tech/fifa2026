import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dckubpyvchkrbjnlqugm.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseKey) {
  console.warn('Missing VITE_SUPABASE_ANON_KEY in environment variables. Realtime database updates will be disabled.')
}

export const supabase = supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : {
      channel: () => ({
        on: () => ({
          subscribe: () => ({})
        })
      }),
      removeChannel: () => {}
    } as any

