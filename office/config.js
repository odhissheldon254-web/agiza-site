// Agiza Office connection settings.
// Paste these from Supabase > Project Settings > API (or "Connect").
// Both are safe to publish: the "anon" key only works together with the
// Row Level Security rules in supabase/setup.sql, which lock every row to Agiza.
// While either is empty, the office runs as a demo with sample data.
window.AGIZA_OFFICE = {
  supabaseUrl: '',
  supabaseAnonKey: ''
};
