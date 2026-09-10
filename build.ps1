$ErrorActionPreference = 'Stop'

$projectDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$fragmentPath = Join-Path $projectDirectory 'calendar.html'
$indexPath = Join-Path $projectDirectory 'index.html'
$fragment = Get-Content -LiteralPath $fragmentPath -Raw -Encoding UTF8

$document = @"
<!doctype html>
<html lang="zh-TW">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="家庭作業、學校活動、接送資訊與待辦事項月曆">
  <title>家庭作業與活動月曆</title>
  <style>html,body{margin:0;background:#f7f6f1}body{padding:16px}main{max-width:1440px;margin:0 auto}@media(max-width:600px){body{padding:0}}</style>
</head>
<body>
<main>
$fragment
</main>
</body>
</html>
"@

Set-Content -LiteralPath $indexPath -Value $document -Encoding UTF8
Write-Output $indexPath
