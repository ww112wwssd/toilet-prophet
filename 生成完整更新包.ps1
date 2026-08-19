$ErrorActionPreference = 'Stop'

$source = (Get-Location).Path
$stamp = Get-Date -Format 'yyyyMMdd-HHmm'
$stage = Join-Path $source '.release-staging'
$desktop = [Environment]::GetFolderPath('Desktop')
$zip = Join-Path $desktop ("厕所先知-完整更新包-$stamp.zip")

if (Test-Path -LiteralPath $stage) {
  Remove-Item -LiteralPath $stage -Recurse -Force
}
New-Item -ItemType Directory -Path $stage | Out-Null

Get-ChildItem -LiteralPath $source -Force |
  Where-Object {
    $_.Name -notin @('.git', 'node_modules', 'dist', '.wrangler', '.vercel', '.release-staging') -and
    $_.Extension -notin @('.zip', '.log')
  } |
  ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination $stage -Recurse -Force
  }

Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $zip -Force
Remove-Item -LiteralPath $stage -Recurse -Force

Write-Host "已生成更新包：$zip" -ForegroundColor Green
Read-Host '按回车关闭'
