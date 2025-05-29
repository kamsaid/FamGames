# Supabase Database Setup

## Setup Instructions

1. Go to your Supabase project dashboard: https://qygifhupmiizivxtmsug.supabase.co
2. Navigate to the SQL Editor (left sidebar)
3. Copy and paste the contents of `schema.sql` into a new query
4. Run the query to create the tables and RLS policies

## Files

- `schema.sql` - Core database schema with tables and RLS policies
- `triggers.sql` - Database triggers (to be added)
- `policies.sql` - Additional RLS policies (to be added)

## Notes

- The `users` table is automatically managed by Supabase Auth
- All tables have Row Level Security (RLS) enabled for data protection
- Users can only access data for families they belong to 