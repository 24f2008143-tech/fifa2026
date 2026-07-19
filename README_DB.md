## Supabase Setup Instructions

1.  Connect to your Supabase project (https://dckubpyvchkrbjnlqugm.supabase.co).
2.  Go to the **SQL Editor**.
3.  Copy and paste the contents of `src/db/schema.sql` into a new query and run it to create the tables and enable Realtime for specific tables.
4.  Copy and paste the contents of `src/db/seed.sql` into a new query and run it to add initial mock data.
5.  Go to **Project Settings -> API** in Supabase and copy the `anon` `public` key.
6.  Add this key to `.env` as `VITE_SUPABASE_ANON_KEY=your_key_here`.
7.  Ensure the edge functions (dispatch, copilot, etc.) are deployed to Supabase or handled via server-side routes in the application.

