// Agiza Office connection settings.
// Paste these from Supabase > Project Settings > API Keys (the "publishable" key).
// Both are safe to publish: the publishable key only works together with the
// Row Level Security rules in supabase/setup.sql, which lock every row to Agiza.
// While either is empty, the office runs as a demo with sample data.
window.AGIZA_OFFICE = {
  supabaseUrl: 'https://piksliczqbyoivngkzii.supabase.co',
  supabaseAnonKey: 'sb_publishable_X5DYnYZjWyhUSGBATxd7kQ_rKSvoYZB'
};
