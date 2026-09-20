// lib/supabase.ts crea el cliente al importarse (`createClient(...)`) y
// explota si faltan estas env vars — hace falta un valor dummy incluso en
// los tests que no llaman a supabase directamente, porque igual importan
// (transitivamente) algo que sí lo hace.
process.env.NEXT_PUBLIC_SUPABASE_URL ||= 'https://example.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||= 'test-anon-key';
