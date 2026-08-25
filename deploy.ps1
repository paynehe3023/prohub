[CmdletBinding()]
param(
  [switch]$NoCache,
  [switch]$StopDev
)

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

function Invoke-DockerCompose {
  param([Parameter(Mandatory = $true)][string[]]$Arguments)

  & docker compose @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Docker Compose 执行失败：docker compose $($Arguments -join ' ')"
  }
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw '未找到 Docker CLI，请先启动 Docker Desktop。'
}

if ($StopDev -and (Test-Path (Join-Path $PSScriptRoot 'docker-compose.dev.yml'))) {
  Write-Host '正在停止 Docker 开发模式容器...' -ForegroundColor Yellow
  Invoke-DockerCompose @('-f', 'docker-compose.dev.yml', 'down')
}

Write-Host '正在检查生产 Compose 配置...' -ForegroundColor Cyan
Invoke-DockerCompose @('config', '--quiet')

Write-Host '正在构建生产镜像...' -ForegroundColor Cyan
if ($NoCache) {
  Invoke-DockerCompose @('build', '--no-cache', 'prohub')
} else {
  Invoke-DockerCompose @('build', 'prohub')
}

Write-Host '正在重建并启动生产容器...' -ForegroundColor Cyan
Invoke-DockerCompose @('up', '-d', '--force-recreate', 'prohub')

$response = $null
for ($attempt = 1; $attempt -le 30; $attempt += 1) {
  try {
    $response = Invoke-WebRequest -UseBasicParsing 'http://localhost:3000/' -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
      break
    }
  } catch {
    Start-Sleep -Seconds 2
  }
}

if ($null -eq $response -or $response.StatusCode -ne 200) {
  throw '生产服务启动后未能通过 http://localhost:3000/ 健康检查。'
}

$assetPath = [regex]::Match($response.Content, 'src="([^"]+\.js)"').Groups[1].Value
if ($assetPath) {
  $bundle = Invoke-WebRequest -UseBasicParsing ("http://localhost:3000" + $assetPath) -TimeoutSec 10
  if (-not $bundle.Content.Contains('CIDR')) {
    Write-Warning '首页资源中未发现 CIDR 文案，请确认构建上下文和源码目录正确。'
  }
}

Write-Host ''
Write-Host '生产部署完成：' -ForegroundColor Green
Write-Host '  首页：        http://localhost:3000/'
Write-Host '  CIDR 工具：   http://localhost:3000/tools/cidr-calculator'
Write-Host ''
Write-Host '正式部署提醒：docker-compose.dev.yml 仅用于开发热更新。' -ForegroundColor Yellow
Write-Host '如开发容器正在运行，请先执行：docker compose -f docker-compose.dev.yml down' -ForegroundColor Yellow
Write-Host '也可以重新运行本脚本并附加 -StopDev 参数。' -ForegroundColor Yellow