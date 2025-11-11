# DeepL Translation Setup Guide

## Overview

Your app now uses **DeepL API** for high-quality AI translations. This guide will help you set up the API key and understand the caching system.

---

## 🔑 Step 1: Get Your DeepL API Key

### Option 1: DeepL Free Plan (Recommended for Testing)

1. Go to https://www.deepl.com/pro-api
2. Click "Sign up for free"
3. Fill in your information
4. Verify your email
5. Go to your account settings: https://www.deepl.com/account/summary
6. Copy your **Authentication Key** (ends with `:fx`)

**Free Plan Limits:**

- ✅ 500,000 characters/month FREE
- ✅ Perfect for testing and small projects
- ✅ Same translation quality as Pro

### Option 2: DeepL Pro Plan (For Production)

1. Go to https://www.deepl.com/pro-api
2. Choose a paid plan
3. Get your **Authentication Key** (no `:fx` suffix)

**Pro Plan Benefits:**

- Unlimited characters (pay per use)
- $5/million characters (~$0.000005 per character)
- Higher rate limits
- Priority support

---

## 🛠️ Step 2: Add API Key to Your Project

### Local Development (.env.local)

1. Open your project in VS Code
2. Create/edit `.env.local` file in the root directory
3. Add your DeepL API key:

```env
DEEPL_API_KEY=your-api-key-here:fx
```

**Example**:

```env
DEEPL_API_KEY=335b89f0-e19d-47f9-bb07-bc63400be040:fx
```

### Production (Vercel)

1. Go to your Vercel dashboard
2. Select your project (MinuteAI-Web)
3. Go to **Settings** → **Environment Variables**
4. Add new variable:
   - **Key**: `DEEPL_API_KEY`
   - **Value**: Your DeepL API key (e.g., `335b89f0-e19d-47f9-bb07-bc63400be040:fx`)
   - **Environment**: Production, Preview, Development (select all)
5. Click "Save"
6. **Redeploy** your app for changes to take effect

---

## 💾 Step 3: Run Database Migration

The caching system requires a new database table to store translations.

### Run Migration in Supabase

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **SQL Editor**
4. Copy and paste the entire content from:
   ```
   supabase/migrations/20251110_add_translations_cache.sql
   ```
5. Click **Run** to execute the migration

### What This Creates:

- `translations_cache` table to store translated segments
- Indexes for fast lookups
- Row Level Security (RLS) policies for user data protection

---

## 🚀 Step 4: Test Translation

### Local Testing

1. Start your dev server: `npm run dev`
2. Open a note with transcript
3. Click **"🌍 Translate"** button
4. Select a language (try Spanish)
5. ✅ Should see translation appear within seconds
6. Try translating to another language
7. Try switching back to same language → Should load instantly from cache!

### Production Testing

1. Deploy to Vercel: `vercel --prod`
2. Open your production app
3. Test translation feature
4. Check if caching works (second translation to same language should be instant)

---

## 📊 How Caching Works

### First Translation (API Call)

```
User clicks "Translate to Spanish"
  ↓
Check cache in database
  ↓
NOT FOUND → Call DeepL API
  ↓
Translate all segments (~10 API calls)
  ↓
Save to cache
  ↓
Display translated text
```

**Cost**: ~10 API calls (~$0.0001)

### Second Translation (Cached)

```
User clicks "Translate to Spanish" again
  ↓
Check cache in database
  ↓
FOUND → Load from cache
  ↓
Display translated text
```

**Cost**: $0 (no API calls!)

---

## 💰 Cost Analysis

### Without Caching

- 1 transcript = 50 segments
- Each segment needs translation
- **50 API calls per translation**
- 10 users translate same note 10 times = **5,000 API calls**
- Cost: ~$0.025

### With Caching

- First user: 50 API calls (saves to cache)
- Next 99 users: **0 API calls** (load from cache)
- **50 API calls total**
- Cost: ~$0.0025

**Savings: 99% reduction in API costs!** 🎉

---

## 🔍 Monitoring API Usage

### Check DeepL Usage

1. Go to https://www.deepl.com/account/usage
2. See your current usage:
   - Characters used this month
   - Remaining characters
   - API calls count

### Check Cache Performance

In your Supabase Dashboard:

```sql
-- How many translations are cached?
SELECT
  target_language,
  COUNT(*) as cache_count,
  MAX(updated_at) as last_used
FROM translations_cache
GROUP BY target_language
ORDER BY cache_count DESC;
```

---

## 🎯 Supported Languages

DeepL supports the following target languages:

| Language   | Code | DeepL Code |
| ---------- | ---- | ---------- |
| English    | `en` | `EN`       |
| Chinese    | `zh` | `ZH`       |
| Spanish    | `es` | `ES`       |
| French     | `fr` | `FR`       |
| German     | `de` | `DE`       |
| Japanese   | `ja` | `JA`       |
| Korean     | `ko` | `KO`       |
| Portuguese | `pt` | `PT-PT`    |
| Russian    | `ru` | `RU`       |
| Italian    | `it` | `IT`       |
| Dutch      | `nl` | `NL`       |
| Polish     | `pl` | `PL`       |
| Turkish    | `tr` | `TR`       |
| Swedish    | `sv` | `SV`       |

**Note**: Arabic, Hindi, Thai, Vietnamese, Indonesian, and Malay are NOT supported by DeepL. These will show an error message if selected.

---

## 🐛 Troubleshooting

### Error: "Translation service not configured"

- **Cause**: `DEEPL_API_KEY` not set in environment variables
- **Fix**: Add the API key to `.env.local` (local) or Vercel settings (production)

### Error: "Translation failed: Invalid authentication"

- **Cause**: Wrong API key or expired key
- **Fix**: Double-check your API key from DeepL dashboard

### Error: "No translation returned from API"

- **Cause**: Language not supported by DeepL
- **Fix**: Use only supported languages (remove unsupported ones from dropdown)

### Translation is slow (>10 seconds)

- **Cause**: Translating many segments at once
- **Fix**: Normal behavior for first translation. Subsequent translations will be instant due to caching.

### Cache not working (always calls API)

- **Cause**: Database migration not run
- **Fix**: Run the `20251110_add_translations_cache.sql` migration in Supabase

---

## 📈 Optimization Tips

### 1. Preload Popular Languages

If you have many users translating to Spanish, you can pre-translate one note to Spanish, and all users will benefit from the cache.

### 2. Clear Old Caches

Optional: Set up a cron job to delete old cached translations:

```sql
-- Delete caches older than 30 days
DELETE FROM translations_cache
WHERE updated_at < NOW() - INTERVAL '30 days';
```

### 3. Monitor API Costs

Set up alerts in DeepL dashboard to notify you when you're approaching your limit.

---

## ✅ Final Checklist

Before deploying to production:

- [ ] DeepL API key obtained
- [ ] API key added to `.env.local` for local dev
- [ ] API key added to Vercel environment variables
- [ ] Database migration run in Supabase
- [ ] Tested translation locally (works)
- [ ] Tested caching locally (instant second translation)
- [ ] Deployed to Vercel production
- [ ] Tested translation in production
- [ ] Verified API usage in DeepL dashboard

---

## 🎉 Summary

**What You Get:**

- ✅ High-quality AI translation (DeepL is better than Google Translate)
- ✅ 99% cost reduction with smart caching
- ✅ Instant translations after first use
- ✅ 500,000 free characters/month
- ✅ Support for 14+ languages

**Your Current Setup:**

- **API Key**: `335b89f0-e19d-47f9-bb07-bc63400be040:fx` (Free Plan)
- **Free Characters**: 500,000/month (~100 full transcripts)
- **Cache Table**: `translations_cache` (needs migration)

**Next Steps:**

1. Add API key to Vercel environment variables
2. Run database migration
3. Deploy and test!

---

**Questions?** Check the DeepL API docs: https://www.deepl.com/docs-api
