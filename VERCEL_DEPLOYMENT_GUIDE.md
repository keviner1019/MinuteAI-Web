# 🚀 MinuteAI - Vercel Deployment Guide

## 📋 Overview

This guide will walk you through deploying your MinuteAI web application to Vercel. Vercel is the optimal platform for Next.js applications, offering seamless deployment, automatic HTTPS, edge functions, and excellent performance.

**Deployment URL**: `https://your-project-name.vercel.app`

---

## ✅ Pre-Deployment Checklist

Before deploying, ensure you have:

- [x] GitHub account
- [x] Vercel account (free tier is sufficient)
- [x] All environment variables ready (Supabase, AssemblyAI, Google Gemini, Pusher)
- [x] Git repository initialized
- [x] Code committed to GitHub
- [x] Project builds successfully locally (`npm run build`)

---

## 🛠️ Step 1: Prepare Your Project

### 1.1 Test Local Build

Before deploying, ensure your project builds successfully:

```powershell
# Clean previous builds
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue

# Install dependencies
npm install

# Build the project
npm run build

# Test production build locally
npm start
```

If the build succeeds, you're ready to deploy! ✅

### 1.2 Verify Environment Variables

Make sure you have all required environment variables documented in `env.template`:

**Required Variables:**
- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`
- ✅ `ASSEMBLYAI_API_KEY`
- ✅ `GOOGLE_GEMINI_API_KEY`
- ✅ `NEXT_PUBLIC_PUSHER_KEY`
- ✅ `PUSHER_SECRET`
- ✅ `NEXT_PUBLIC_PUSHER_CLUSTER`
- ✅ `PUSHER_APP_ID`

**Optional Variables:**
- `NEXT_PUBLIC_STUN_SERVER`
- `NEXT_PUBLIC_TURN_SERVER`
- `TURN_USERNAME`
- `TURN_CREDENTIAL`

---

## 🔧 Step 2: Initialize Git Repository (If Not Done)

### 2.1 Check Git Status

```powershell
# Check if git is initialized
git status
```

### 2.2 Initialize Git (if needed)

```powershell
# Initialize git repository
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: MinuteAI web application"
```

### 2.3 Create GitHub Repository

1. Go to [GitHub](https://github.com) and log in
2. Click "+" → "New repository"
3. Name it `minuteai-web`
4. Choose "Private" or "Public"
5. **DO NOT** initialize with README (you already have files)
6. Click "Create repository"

### 2.4 Push to GitHub

```powershell
# Add remote origin (replace with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/minuteai-web.git

# Set main branch
git branch -M main

# Push to GitHub
git push -u origin main
```

---

## 🚀 Step 3: Deploy to Vercel

### Method 1: Deploy via Vercel Dashboard (Recommended)

#### 3.1 Create Vercel Account

1. Go to [Vercel](https://vercel.com)
2. Click "Sign Up"
3. Choose "Continue with GitHub"
4. Authorize Vercel to access your GitHub account

#### 3.2 Import Your Project

1. Click "Add New..." → "Project"
2. Find your `minuteai-web` repository
3. Click "Import"

#### 3.3 Configure Project Settings

**Framework Preset:** Next.js (auto-detected)

**Root Directory:** `./` (default)

**Build Command:** `npm run build` (default)

**Output Directory:** `.next` (default)

**Install Command:** `npm install` (default)

**Node Version:** 18.x (recommended)

#### 3.4 Add Environment Variables

Click "Environment Variables" and add each variable:

| Name | Value | Environment |
|------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase URL | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | Your service role key | Production, Preview, Development |
| `ASSEMBLYAI_API_KEY` | Your AssemblyAI key | Production, Preview, Development |
| `GOOGLE_GEMINI_API_KEY` | Your Gemini key | Production, Preview, Development |
| `NEXT_PUBLIC_PUSHER_KEY` | Your Pusher key | Production, Preview, Development |
| `PUSHER_SECRET` | Your Pusher secret | Production, Preview, Development |
| `NEXT_PUBLIC_PUSHER_CLUSTER` | Your cluster (e.g., `us2`) | Production, Preview, Development |
| `PUSHER_APP_ID` | Your Pusher app ID | Production, Preview, Development |

**Pro Tip:** You can paste all variables at once using the "Paste" feature in Vercel:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
ASSEMBLYAI_API_KEY=your_assemblyai_key
GOOGLE_GEMINI_API_KEY=your_gemini_key
NEXT_PUBLIC_PUSHER_KEY=your_pusher_key
PUSHER_SECRET=your_pusher_secret
NEXT_PUBLIC_PUSHER_CLUSTER=us2
PUSHER_APP_ID=your_pusher_app_id
NEXT_PUBLIC_STUN_SERVER=stun:stun.l.google.com:19302
```

#### 3.5 Deploy!

1. Click "Deploy"
2. Wait 2-3 minutes for the build to complete
3. 🎉 Your app is live!

### Method 2: Deploy via Vercel CLI

```powershell
# Install Vercel CLI globally
npm install -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod

# Follow the prompts:
# - Set up and deploy? Yes
# - Which scope? Your account
# - Link to existing project? No
# - Project name? minuteai-web
# - Directory? ./
# - Override settings? No
```

---

## 🔒 Step 4: Configure Supabase for Production

### 4.1 Update Supabase URL Whitelist

Your Vercel URL needs to be added to Supabase's allowed URLs:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Authentication** → **URL Configuration**
4. Add your Vercel URL to **Site URL**:
   ```
   https://your-project-name.vercel.app
   ```
5. Add to **Redirect URLs**:
   ```
   https://your-project-name.vercel.app/**
   ```

### 4.2 Update CORS Settings

If you have CORS policies, add your Vercel domain:

```sql
-- In Supabase SQL Editor
-- This allows your Vercel app to access storage
UPDATE storage.buckets 
SET public = true 
WHERE id = 'audio-files';

UPDATE storage.buckets 
SET public = true 
WHERE id = 'avatars';
```

---

## 🌐 Step 5: Configure Custom Domain (Optional)

### 5.1 Add Custom Domain

1. Go to your Vercel project dashboard
2. Click "Settings" → "Domains"
3. Enter your custom domain (e.g., `minuteai.com`)
4. Click "Add"

### 5.2 Update DNS Records

Add these DNS records to your domain provider:

**For root domain (minuteai.com):**
```
Type: A
Name: @
Value: 76.76.21.21
```

**For www subdomain:**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

### 5.3 Update Supabase

Add your custom domain to Supabase URL configuration:
```
https://minuteai.com
https://www.minuteai.com
```

---

## 📊 Step 6: Monitor Your Deployment

### 6.1 Check Deployment Status

- **Dashboard**: https://vercel.com/dashboard
- **Analytics**: View real-time analytics
- **Logs**: Check function logs for errors
- **Performance**: Monitor Web Vitals

### 6.2 View Live Site

Your site will be available at:
```
https://your-project-name.vercel.app
```

Or your custom domain:
```
https://minuteai.com
```

---

## 🔄 Step 7: Continuous Deployment

Vercel automatically deploys when you push to GitHub:

### 7.1 Production Deployments

```powershell
# Make changes to your code
git add .
git commit -m "Add new feature"
git push origin main

# Vercel automatically deploys! 🚀
```

### 7.2 Preview Deployments

```powershell
# Create a new branch
git checkout -b feature/new-feature

# Make changes and push
git add .
git commit -m "Work in progress"
git push origin feature/new-feature

# Vercel creates a preview deployment automatically
# Get preview URL from GitHub PR or Vercel dashboard
```

### 7.3 Rollback Deployments

1. Go to Vercel dashboard
2. Click "Deployments"
3. Find previous successful deployment
4. Click "..." → "Promote to Production"

---

## ⚙️ Step 8: Advanced Configuration

### 8.1 Environment-Specific Variables

Create different variables for preview vs production:

**Vercel Dashboard:**
- Production only: Check "Production"
- Preview only: Check "Preview"
- Development only: Check "Development"

### 8.2 Custom Build Settings

Create `vercel.json` for advanced configuration (already included):

```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["iad1"],
  "functions": {
    "app/api/**/*.ts": {
      "memory": 1024,
      "maxDuration": 30
    }
  }
}
```

### 8.3 Edge Functions (Optional)

For faster global performance, convert API routes to Edge Functions:

```typescript
// app/api/example/route.ts
export const runtime = 'edge';

export async function GET(request: Request) {
  // Your code here
}
```

---

## 🛡️ Step 9: Security Best Practices

### 9.1 Environment Variables Security

✅ **DO:**
- Use `NEXT_PUBLIC_` prefix only for client-side variables
- Keep API keys secret (no `NEXT_PUBLIC_` prefix)
- Use different API keys for development and production
- Rotate keys regularly

❌ **DON'T:**
- Commit `.env` files to Git (already in `.gitignore`)
- Share secret keys publicly
- Use development keys in production

### 9.2 Enable Security Headers

Add to `next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

### 9.3 Rate Limiting

Consider adding rate limiting to API routes:

```typescript
// lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),
});
```

---

## 📈 Step 10: Performance Optimization

### 10.1 Enable Analytics

1. Go to Vercel dashboard
2. Click "Analytics"
3. Enable Web Analytics (free)
4. View real-time performance metrics

### 10.2 Optimize Images

Ensure you're using Next.js Image component:

```typescript
import Image from 'next/image';

<Image
  src="/logo.png"
  alt="MinuteAI"
  width={200}
  height={50}
  priority
/>
```

### 10.3 Enable Caching

API routes with caching headers:

```typescript
export async function GET() {
  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
    },
  });
}
```

---

## 🐛 Troubleshooting

### Build Errors

**Error: Module not found**
```powershell
# Clear cache and reinstall
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
```

**Error: Type errors**
```powershell
# Run type check locally
npm run build
# Fix TypeScript errors before deploying
```

**Error: Environment variable undefined**
- Check variable names (case-sensitive)
- Ensure variables are added to Vercel dashboard
- Redeploy after adding variables

### Runtime Errors

**Error: API route timeout**
- Check Vercel function logs
- Increase timeout in `vercel.json`
- Optimize slow API calls

**Error: CORS issues**
- Add Vercel domain to Supabase allowed URLs
- Check CORS headers in API routes

**Error: 404 on deployed site**
- Check file paths are correct
- Ensure routes are exported correctly
- Verify `app` directory structure

### Database Connection Issues

**Error: Supabase connection failed**
- Verify Supabase URL and keys
- Check Supabase project is not paused
- Ensure RLS policies allow access

---

## 📱 Step 11: Post-Deployment Testing

### 11.1 Test Critical Paths

- [ ] User signup/login works
- [ ] Audio upload works
- [ ] Transcription processing works
- [ ] Meeting creation/joining works
- [ ] Profile updates work
- [ ] Real-time features work (Pusher)
- [ ] All API routes respond correctly

### 11.2 Performance Testing

- [ ] Lighthouse score > 90
- [ ] Page load time < 3 seconds
- [ ] API response time < 1 second
- [ ] Mobile responsiveness works

### 11.3 Browser Testing

- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile browsers (iOS Safari, Chrome Android)

---

## 🔔 Step 12: Set Up Monitoring

### 12.1 Error Tracking (Sentry)

```powershell
npm install @sentry/nextjs
npx @sentry/wizard -i nextjs
```

### 12.2 Uptime Monitoring

Use services like:
- [UptimeRobot](https://uptimerobot.com) (free)
- [Pingdom](https://pingdom.com)
- Vercel built-in monitoring

### 12.3 Vercel Notifications

1. Go to Vercel dashboard
2. Click "Settings" → "Notifications"
3. Enable:
   - Deployment started
   - Deployment ready
   - Deployment failed

---

## 📊 Deployment Checklist

### Pre-Deployment
- [x] Code committed to GitHub
- [x] Local build succeeds
- [x] All environment variables documented
- [x] Dependencies up to date
- [x] TypeScript errors resolved

### Deployment
- [ ] Vercel account created
- [ ] GitHub repository connected
- [ ] Environment variables added
- [ ] Project deployed successfully
- [ ] Deployment URL accessible

### Post-Deployment
- [ ] Supabase URLs updated
- [ ] Custom domain configured (optional)
- [ ] SSL certificate active
- [ ] Analytics enabled
- [ ] Error tracking configured
- [ ] All features tested
- [ ] Performance optimized

---

## 🚀 Quick Deployment Commands

```powershell
# 1. Clean and build locally
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm run build

# 2. Commit changes
git add .
git commit -m "Ready for deployment"

# 3. Push to GitHub (triggers Vercel deployment)
git push origin main

# 4. Or deploy via CLI
vercel --prod
```

---

## 📚 Useful Resources

### Documentation
- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Supabase with Vercel](https://supabase.com/docs/guides/platform/going-into-prod)

### Vercel Features
- [Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Custom Domains](https://vercel.com/docs/concepts/projects/domains)
- [Analytics](https://vercel.com/docs/analytics)
- [Edge Functions](https://vercel.com/docs/concepts/functions/edge-functions)

### Support
- [Vercel Community](https://github.com/vercel/vercel/discussions)
- [Next.js Discord](https://nextjs.org/discord)
- [Supabase Discord](https://discord.supabase.com)

---

## 🎯 Expected Deployment Results

After successful deployment:

✅ **Your app is live at**: `https://your-project-name.vercel.app`
✅ **Automatic HTTPS**: SSL certificate issued
✅ **Global CDN**: Content served from edge locations
✅ **Instant deployments**: Push to deploy in <3 minutes
✅ **Preview deployments**: Every PR gets a unique URL
✅ **Zero downtime**: Atomic deployments
✅ **Automatic scaling**: Handles traffic spikes
✅ **Built-in analytics**: Track performance

---

## 💡 Pro Tips

### Tip 1: Use Preview Deployments
Create feature branches and get instant preview URLs:
```powershell
git checkout -b feature/new-ui
# Make changes
git push origin feature/new-ui
# Get preview URL from Vercel
```

### Tip 2: Environment-Specific Configs
Use different Supabase projects for development and production:
- Development: `your-dev-project.supabase.co`
- Production: `your-prod-project.supabase.co`

### Tip 3: Monitor Costs
- Vercel free tier: 100GB bandwidth/month
- Hobby tier: $20/month for unlimited
- Monitor usage in dashboard

### Tip 4: Optimize Bundle Size
```powershell
# Analyze bundle size
npm install -g @next/bundle-analyzer
npm run build
```

### Tip 5: Use Incremental Static Regeneration (ISR)
```typescript
// For pages that can be cached
export const revalidate = 60; // Revalidate every 60 seconds
```

---

## 🎉 Congratulations!

Your MinuteAI application is now deployed to Vercel! 🚀

**Next Steps:**
1. Share your app URL with users
2. Monitor analytics and errors
3. Iterate based on feedback
4. Deploy mobile app (refer to EXPO_MOBILE_APP_PLAN.md)

**Need Help?**
- Vercel Support: https://vercel.com/support
- GitHub Issues: https://github.com/YOUR_USERNAME/minuteai-web/issues

---

**Document Version**: 1.0
**Last Updated**: October 29, 2025
**Status**: Ready for Deployment ✅

---

**End of Vercel Deployment Guide**
