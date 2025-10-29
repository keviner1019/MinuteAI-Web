# Database Setup for Profile Feature

## Step 1: Create Avatars Storage Bucket

Go to your Supabase Dashboard → Storage, then run this SQL or create manually:

```sql
-- Create avatars storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;
```

## Step 2: Set Up Storage Policies

Run this in Supabase SQL Editor:

```sql
-- Allow authenticated users to upload their own avatar
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own avatars
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own avatars
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access to all avatars
CREATE POLICY "Public can view avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');
```

## Step 3: Verify User Profiles Table

The `user_profiles` table should already exist from your schema.sql. Verify it has these columns:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'user_profiles';
```

Expected columns:

- `id` (uuid, primary key)
- `display_name` (text)
- `avatar_url` (text)
- `created_at` (timestamp with time zone)
- `updated_at` (timestamp with time zone)

## Step 4: Test the Setup

1. Sign up/login to your app
2. Navigate to `/profile`
3. Upload a profile picture
4. Click "Save Changes"
5. Check Supabase Storage → avatars bucket for your image
6. Check user_profiles table for avatar_url and display_name

## Troubleshooting

### Issue: "Failed to upload image"

- Check if avatars bucket exists
- Verify storage policies are set correctly
- Check browser console for specific errors

### Issue: "Failed to save profile"

- Verify user_profiles table exists
- Check RLS policies on user_profiles table
- Ensure user is authenticated

### Issue: Avatar not showing in meetings

- Verify avatar_url in user_profiles table
- Check if image URL is publicly accessible
- Clear browser cache

## Quick Verification Script

Run this in Supabase SQL Editor to verify everything:

```sql
-- Check bucket exists
SELECT * FROM storage.buckets WHERE id = 'avatars';

-- Check policies exist
SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';

-- Check user_profiles table structure
\d user_profiles;

-- Check if you have a profile
SELECT * FROM user_profiles WHERE id = auth.uid();
```

## Manual Bucket Creation (Alternative)

If SQL doesn't work, create bucket manually:

1. Go to Supabase Dashboard
2. Navigate to Storage
3. Click "New Bucket"
4. Name: `avatars`
5. Public: ✅ Yes
6. Click "Create"

Then apply policies using the SQL above.

---

That's it! Your profile feature database is ready to use. 🎉
