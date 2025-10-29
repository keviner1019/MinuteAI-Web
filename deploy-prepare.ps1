# MinuteAI - Vercel Deployment Script
# Run this script to prepare your project for deployment

Write-Host "🚀 MinuteAI - Vercel Deployment Preparation" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Clean previous builds
Write-Host "📦 Step 1: Cleaning previous builds..." -ForegroundColor Yellow
if (Test-Path .next) {
    Remove-Item -Recurse -Force .next
    Write-Host "✅ Cleaned .next directory" -ForegroundColor Green
}

# Step 2: Install dependencies
Write-Host ""
Write-Host "📥 Step 2: Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Dependencies installed successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

# Step 3: Run build
Write-Host ""
Write-Host "🔨 Step 3: Building project..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Build completed successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Build failed. Please fix errors before deploying." -ForegroundColor Red
    exit 1
}

# Step 4: Git status check
Write-Host ""
Write-Host "📋 Step 4: Checking Git status..." -ForegroundColor Yellow
git status --short

# Step 5: Environment variables check
Write-Host ""
Write-Host "🔑 Step 5: Checking environment variables..." -ForegroundColor Yellow
Write-Host "Required environment variables (from env.template):" -ForegroundColor Cyan
Write-Host "  - NEXT_PUBLIC_SUPABASE_URL" -ForegroundColor White
Write-Host "  - NEXT_PUBLIC_SUPABASE_ANON_KEY" -ForegroundColor White
Write-Host "  - SUPABASE_SERVICE_ROLE_KEY" -ForegroundColor White
Write-Host "  - ASSEMBLYAI_API_KEY" -ForegroundColor White
Write-Host "  - GOOGLE_GEMINI_API_KEY" -ForegroundColor White
Write-Host "  - NEXT_PUBLIC_PUSHER_KEY" -ForegroundColor White
Write-Host "  - PUSHER_SECRET" -ForegroundColor White
Write-Host "  - NEXT_PUBLIC_PUSHER_CLUSTER" -ForegroundColor White
Write-Host "  - PUSHER_APP_ID" -ForegroundColor White

Write-Host ""
Write-Host "✅ Pre-deployment checks completed!" -ForegroundColor Green
Write-Host ""

# Next steps
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "📝 NEXT STEPS:" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Commit your changes:" -ForegroundColor White
Write-Host "   git add ." -ForegroundColor Gray
Write-Host "   git commit -m 'Prepare for Vercel deployment'" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Push to GitHub:" -ForegroundColor White
Write-Host "   git push origin main" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Deploy to Vercel:" -ForegroundColor White
Write-Host "   Option A - Via Dashboard:" -ForegroundColor Cyan
Write-Host "     • Go to https://vercel.com" -ForegroundColor Gray
Write-Host "     • Click 'Add New...' → 'Project'" -ForegroundColor Gray
Write-Host "     • Import your GitHub repository" -ForegroundColor Gray
Write-Host "     • Add environment variables" -ForegroundColor Gray
Write-Host "     • Click 'Deploy'" -ForegroundColor Gray
Write-Host ""
Write-Host "   Option B - Via CLI:" -ForegroundColor Cyan
Write-Host "     npm install -g vercel" -ForegroundColor Gray
Write-Host "     vercel --prod" -ForegroundColor Gray
Write-Host ""
Write-Host "4. After deployment, update Supabase:" -ForegroundColor White
Write-Host "   • Add your Vercel URL to Supabase Site URL" -ForegroundColor Gray
Write-Host "   • Add to Redirect URLs: https://your-app.vercel.app/**" -ForegroundColor Gray
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "📖 For detailed instructions, see:" -ForegroundColor Yellow
Write-Host "   VERCEL_DEPLOYMENT_GUIDE.md" -ForegroundColor Cyan
Write-Host ""
Write-Host "Ready to deploy! Good luck!" -ForegroundColor Green
Write-Host ""
