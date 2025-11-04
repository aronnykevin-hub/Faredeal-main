# ================================
# 🚀 FAREDEAL Admin Auth - START
# ================================

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "🚀 FAREDEAL Admin Authentication" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
$currentDir = Get-Location
if ($currentDir.Path -notlike "*FD*") {
    Write-Host "⚠️  Warning: You might not be in the correct directory" -ForegroundColor Yellow
    Write-Host "   Current: $currentDir" -ForegroundColor Gray
    Write-Host ""
}

# Step 1: Check Node.js
Write-Host "[1/5] Checking Node.js..." -ForegroundColor Cyan
try {
    $nodeVersion = node --version
    Write-Host "   ✅ Node.js $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Node.js not found! Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Step 2: Navigate to frontend
Write-Host "[2/5] Navigating to frontend..." -ForegroundColor Cyan
$frontendPath = "C:\Users\Aban\Desktop\FD\frontend"
if (Test-Path $frontendPath) {
    Set-Location $frontendPath
    Write-Host "   ✅ In frontend directory" -ForegroundColor Green
} else {
    Write-Host "   ❌ Frontend directory not found!" -ForegroundColor Red
    exit 1
}

# Step 3: Check dependencies
Write-Host "[3/5] Checking dependencies..." -ForegroundColor Cyan
if (Test-Path "node_modules") {
    Write-Host "   ✅ Dependencies installed" -ForegroundColor Green
} else {
    Write-Host "   📦 Installing dependencies..." -ForegroundColor Yellow
    npm install
}

# Step 4: Check environment file
Write-Host "[4/5] Checking environment configuration..." -ForegroundColor Cyan
if (Test-Path ".env") {
    Write-Host "   ✅ .env file found" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  .env file not found!" -ForegroundColor Yellow
    Write-Host "   Creating .env file..." -ForegroundColor Yellow
    @"
VITE_SUPABASE_URL=https://zwmupgbixextqlexknnu.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3bXVwZ2JpeGV4dHFsZXhrbm51Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDU2NzYsImV4cCI6MjA3NTQyMTY3Nn0.jGpa7cFmq3K5pij2htzyzhGZJSKwH8EXV1sqHb1dgu4
VITE_API_URL=http://localhost:3001/api
VITE_ENVIRONMENT=development
"@ | Out-File -FilePath ".env" -Encoding UTF8
    Write-Host "   ✅ .env file created" -ForegroundColor Green
}

# Step 5: Start the server
Write-Host "[5/5] Starting development server..." -ForegroundColor Cyan
Write-Host ""
Write-Host "================================" -ForegroundColor Green
Write-Host "✅ SERVER STARTING!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""
Write-Host "📍 URLs to test:" -ForegroundColor Cyan
Write-Host "   🔐 Admin Login: http://localhost:5173/admin-login" -ForegroundColor White
Write-Host "   🏠 Admin Portal: http://localhost:5173/#admin" -ForegroundColor White
Write-Host "   📊 Test Page: file:///C:/Users/Aban/Desktop/FD/test-admin-auth.html" -ForegroundColor White
Write-Host ""
Write-Host "🔑 Login Credentials:" -ForegroundColor Cyan
Write-Host "   Email: heradmin@faredeal.ug" -ForegroundColor Yellow
Write-Host "   Password: Administrator" -ForegroundColor Yellow
Write-Host ""
Write-Host "💡 Press Ctrl+C to stop the server" -ForegroundColor Gray
Write-Host ""
Write-Host "================================" -ForegroundColor Green
Write-Host ""

# Start the dev server
npm run dev
