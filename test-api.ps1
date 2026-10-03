# Automated Attendance System API Health & Smoke Test
$baseUrl = "http://localhost:8000/api"
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " Testing Attendance System API at $baseUrl" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Test Base API Status
try {
    $res = Invoke-RestMethod -Uri "$baseUrl" -Method Get -TimeoutSec 5
    Write-Host "[PASS] 1. API Status check: $($res.status) ($($res.service))" -ForegroundColor Green
} catch {
    Write-Host "[FAIL] 1. API Status check failed: $_" -ForegroundColor Red
    exit 1
}

# 2. Test Admin Login
$token = ""
try {
    $loginBody = @{
        email = "admin@attendance.com"
        password = "password123"
    } | ConvertTo-Json

    $loginRes = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    $token = $loginRes.token
    Write-Host "[PASS] 2. Admin Login successful! Logged in as: $($loginRes.user.name) (Role: $($loginRes.user.role))" -ForegroundColor Green
} catch {
    Write-Host "[FAIL] 2. Admin Login failed: $_" -ForegroundColor Red
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $token"
    "Accept" = "application/json"
}

# 3. Test Profile (/auth/me)
try {
    $me = Invoke-RestMethod -Uri "$baseUrl/auth/me" -Method Get -Headers $headers
    Write-Host "[PASS] 3. Token Authentication validated (/auth/me): $($me.email)" -ForegroundColor Green
} catch {
    Write-Host "[FAIL] 3. Profile check failed: $_" -ForegroundColor Red
}

# 4. Test Admin Users List (/admin/users)
try {
    $users = Invoke-RestMethod -Uri "$baseUrl/admin/users" -Method Get -Headers $headers
    $count = ($users.data).Count
    if ($null -eq $count) { $count = $users.Count }
    Write-Host "[PASS] 4. Admin Users list fetched: $count users returned" -ForegroundColor Green
} catch {
    Write-Host "[FAIL] 4. Admin Users list failed: $_" -ForegroundColor Red
}

# 5. Test Admin Classes List (/admin/classes)
try {
    $classes = Invoke-RestMethod -Uri "$baseUrl/admin/classes" -Method Get -Headers $headers
    $count = ($classes.data).Count
    if ($null -eq $count) { $count = $classes.Count }
    Write-Host "[PASS] 5. Admin Classes list fetched: $count classes returned" -ForegroundColor Green
} catch {
    Write-Host "[FAIL] 5. Admin Classes list failed: $_" -ForegroundColor Red
}

# 6. Test Admin Reports Overview (/admin/reports/overview)
try {
    $overview = Invoke-RestMethod -Uri "$baseUrl/admin/reports/overview" -Method Get -Headers $headers
    Write-Host "[PASS] 6. Admin Reports Overview fetched successfully!" -ForegroundColor Green
} catch {
    Write-Host "[FAIL] 6. Admin Reports Overview failed: $_" -ForegroundColor Red
}

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " All primary API tests completed!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
