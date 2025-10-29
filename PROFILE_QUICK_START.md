# 🎯 Profile Feature - Quick Start Guide

## What's New? 🚀

Your MinuteAI app now has a **professional profile system** with:

- ✅ Profile picture upload
- ✅ Display name customization
- ✅ **Speaking animations** in meetings (green pulsing ring when you talk!)
- ✅ Real-time avatar display for all participants

---

## 🔧 Setup (One-time)

### 1. Database Setup

Run this SQL in your **Supabase SQL Editor**:

```sql
-- Create avatars storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Allow users to upload their own avatar
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own avatars
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own avatars
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access
CREATE POLICY "Public can view avatars"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'avatars');
```

### 2. Verify Setup

Check Supabase Dashboard → Storage → You should see **"avatars"** bucket

---

## 📖 How to Use

### Setting Up Your Profile

1. **Login** to your MinuteAI account
2. Go to **Dashboard**
3. Click the **"Profile"** button (top right)
4. Click the **camera icon** to upload a profile picture
   - Accepts: JPG, PNG, GIF, WebP
   - Max size: 5MB
5. Enter your **Display Name**
6. Click **"Save Changes"**

### In Meetings

Your profile will automatically show:

- **Profile Picture**: Your uploaded avatar
- **Display Name**: The name you set
- **Speaking Animation**: When you talk, your avatar gets a **green pulsing ring** 🟢

---

## 🎨 Features Explained

### Speaking Detection

The app uses **Web Audio API** to detect when you're speaking:

- Audio level is analyzed in real-time
- When volume exceeds 10%, avatar animates
- Green pulsing ring appears
- Avatar slightly enlarges (105%)

### Avatar States

| State         | Visual                            |
| ------------- | --------------------------------- |
| **Silent**    | Normal avatar with gray ring      |
| **Speaking**  | Green pulsing ring + slight scale |
| **Muted**     | Muted icon shown below avatar     |
| **Connected** | Status indicator below avatar     |

---

## 🛠️ Technical Details

### File Structure

```
app/
  profile/page.tsx          # Profile settings page
components/
  ui/Avatar.tsx             # Avatar with animations
  meeting/AudioCall.tsx     # Meeting UI with avatars
hooks/
  useUserProfile.ts         # Profile data hook
supabase/
  migrations/
    add_avatars_storage.sql # Database setup
```

### How Speaking Detection Works

```
Audio Stream → Web Audio API → Frequency Analysis →
Average Level → Threshold Check (>10%) →
Trigger Animation → Avatar Pulse
```

### Storage Structure

```
avatars/
  {user-id}/
    {timestamp}.jpg
    {timestamp}.png
```

---

## ❓ Troubleshooting

### Issue: Can't upload image

**Solution**:

- Check image size (max 5MB)
- Check file type (only images)
- Verify Supabase storage bucket exists

### Issue: Avatar not showing in meeting

**Solution**:

- Go to Profile page
- Re-upload image
- Click "Save Changes"
- Refresh meeting page

### Issue: Speaking animation not working

**Solution**:

- Allow microphone permissions
- Check if audio is unmuted
- Try speaking louder (threshold is 10%)

### Issue: Profile button missing

**Solution**:

- Refresh dashboard
- Clear browser cache
- Make sure you're logged in

---

## 🎥 Demo Scenario

1. **Alice** sets up her profile:
   - Uploads a photo of herself
   - Sets name as "Alice Johnson"
2. **Alice** starts a meeting

3. **Bob** joins the meeting

4. **What they see**:
   - Alice's avatar shows her photo with "Alice Johnson"
   - Bob's avatar shows default icon with "Participant"
   - When Alice speaks → green pulsing ring appears
   - When Bob speaks → his avatar pulses too

---

## 🚀 Next Steps

After setting up profiles, you can:

- Start meetings and see your avatar
- Invite others (they'll see your profile)
- Test speaking detection
- Customize your display name anytime

---

## 📞 Need Help?

Check these files for more info:

- `IMPLEMENTATION_SUMMARY.md` - Full technical details
- `DATABASE_SETUP.md` - Database setup guide
- `PROFILE_FEATURE.md` - Feature documentation

---

## ✨ Pro Tips

1. **High-quality photos work best** - Use clear, well-lit images
2. **Square images recommended** - They look best in circular avatars
3. **Test your mic** - Speaking detection needs good audio input
4. **Update anytime** - You can change your profile whenever you want

---

**Enjoy your new personalized meeting experience! 🎉**
