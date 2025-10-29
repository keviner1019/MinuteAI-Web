# 🚀 Quick Deployment Steps

## Option 1: Vercel Dashboard (Easiest)

1. **Prepare your project**
   ```powershell
   .\deploy-prepare.ps1
   ```

2. **Push to GitHub**
   ```powershell
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

3. **Deploy on Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New..." → "Project"
   - Import your GitHub repo
   - Add environment variables (copy from `env.template`)
   - Click "Deploy"

4. **Update Supabase**
   - Add Vercel URL to Supabase Site URL
   - Add to Redirect URLs: `https://your-app.vercel.app/**`

## Option 2: Vercel CLI (Fastest)

```powershell
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

## Environment Variables to Add

Copy these from your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ASSEMBLYAI_API_KEY=
GOOGLE_GEMINI_API_KEY=
NEXT_PUBLIC_PUSHER_KEY=
PUSHER_SECRET=
NEXT_PUBLIC_PUSHER_CLUSTER=
PUSHER_APP_ID=
```

## After Deployment

✅ Test your live site
✅ Update Supabase URLs
✅ Test all features
✅ Monitor analytics

See `VERCEL_DEPLOYMENT_GUIDE.md` for detailed instructions.
