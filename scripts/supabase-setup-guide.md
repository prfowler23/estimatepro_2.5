# Supabase Database Setup Guide

## Quick Setup

1. **Create a Supabase Project** (if you haven't already)
   - Go to [https://supabase.com](https://supabase.com)
   - Create a new project
   - Wait for the project to initialize

2. **Run the Database Setup Script**
   - Navigate to your Supabase project dashboard
   - Go to the SQL Editor (left sidebar)
   - Copy the entire contents of `scripts/setup-database.sql`
   - Paste into the SQL editor
   - Click "Run" to execute

3. **Get Your API Keys**
   - In Supabase dashboard, go to Settings → API
   - Copy the following:
     - Project URL (looks like: https://xxxxx.supabase.co)
     - anon public key (starts with: eyJ...)

4. **Create `.env.local` file**

   ```bash
   # In your project root, create .env.local
   NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   ```

5. **Restart Your Development Server**
   ```bash
   npm run dev
   ```

## What This Creates

### Tables

1. **quotes** - Stores all quote information
   - Auto-generated quote numbers (EST-YYYY-0001 format)
   - Customer and building information
   - Status tracking (draft, sent, approved, rejected)
   - Automatic timestamp updates

2. **quote_services** - Stores services for each quote
   - Links to quotes table
   - Stores service details and pricing
   - Flexible JSON storage for calculations

### Security Features

- Row Level Security (RLS) enabled
- Currently uses permissive policies (allows all operations)
- Ready for authentication integration

### Performance Features

- Indexes on commonly queried fields
- Optimized for analytics queries
- Summary view for quick stats

## Testing the Setup

1. **Check Tables Were Created**
   - In Supabase dashboard, go to Table Editor
   - You should see `quotes` and `quote_services` tables

2. **Test the Dashboard**
   - Navigate to `/analytics` in your app
   - Should now load without errors
   - Initially will show "No Quote Data Available"

3. **Create Test Data** (optional)
   ```sql
   -- Run this in SQL editor to add sample data
   INSERT INTO quotes (
     customer_name, customer_email, customer_phone,
     building_name, building_address, status, total_price
   ) VALUES
   ('Test Customer', 'test@example.com', '555-0123',
    'Test Building', '123 Test St', 'approved', 50000);
   ```

## Next Steps

### For Development

- Current RLS policies allow all operations
- Perfect for development and testing
- No authentication required yet

### For Production

1. **Implement Authentication**
   - Set up Supabase Auth
   - Update RLS policies to use `auth.uid()`

2. **Tighten RLS Policies**

   ```sql
   -- Example: Users can only see their own quotes
   CREATE POLICY "Users can see own quotes" ON quotes
   FOR SELECT USING (auth.uid() = user_id);
   ```

3. **Add Backup Strategy**
   - Enable Point-in-Time Recovery
   - Set up regular backups

4. **Monitor Performance**
   - Use Supabase dashboard monitoring
   - Set up alerts for errors

## Troubleshooting

### "Cannot connect to database" error

- Check your .env.local file exists
- Verify the URL and key are correct
- Ensure no extra spaces or quotes in env values

### Tables not showing in dashboard

- Make sure the SQL script ran successfully
- Check for any error messages in SQL editor
- Verify RLS policies aren't blocking access

### Analytics page still blank

- Clear your browser cache
- Restart the development server
- Check browser console for errors

## Security Notes

⚠️ **Important**: The current setup uses permissive RLS policies suitable for development. Before going to production:

1. Implement proper authentication
2. Update all RLS policies to check user ownership
3. Add rate limiting to API routes
4. Enable additional Supabase security features

Need help? Check the [Supabase docs](https://supabase.com/docs) or the error logs in your Supabase dashboard.
