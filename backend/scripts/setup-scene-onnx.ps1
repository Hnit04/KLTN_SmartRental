[CmdletBinding()]
param(
    [string]$ModelId = "JuanMa360/room-classification",
    [string]$OutputDir = "",
    [string]$VenvDir = "",
    [switch]$SkipPackageInstall,
    [switch]$ForceReexport
)

$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message)
    Write-Host ("`n==> " + $Message) -ForegroundColor Cyan
}

function Find-PythonCommand {
    $candidates = @("python", "python3")
    foreach ($candidate in $candidates) {
        $cmd = Get-Command $candidate -ErrorAction SilentlyContinue
        if ($cmd) {
            return $cmd.Source
        }
    }
    return $null
}

function Invoke-Checked {
    param(
        [string]$FilePath,
        [string[]]$Arguments
    )
    & $FilePath @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Command failed: $FilePath $($Arguments -join ' ')"
    }
}

$scriptDir = Split-Path -Parent $PSCommandPath
$backendRoot = (Resolve-Path (Join-Path $scriptDir "..")).Path

if ([string]::IsNullOrWhiteSpace($OutputDir)) {
    $OutputDir = Join-Path $backendRoot "models\scene-classifier"
}
if ([string]::IsNullOrWhiteSpace($VenvDir)) {
    $VenvDir = Join-Path $backendRoot ".venv-onnx"
}

$pythonCmd = Find-PythonCommand
if (-not $pythonCmd) {
    throw "Python not found. Install Python first (example: winget install -e --id Python.Python.3.11)."
}

Write-Step "Backend root: $backendRoot"
Write-Step "Model ID: $ModelId"
Write-Step "Output dir: $OutputDir"
Write-Step "Venv dir: $VenvDir"

$venvPython = Join-Path $VenvDir "Scripts\python.exe"
$venvOptimum = Join-Path $VenvDir "Scripts\optimum-cli.exe"

if (-not (Test-Path $venvPython)) {
    Write-Step "Creating virtual environment"
    Invoke-Checked -FilePath $pythonCmd -Arguments @("-m", "venv", $VenvDir)
}

if (-not $SkipPackageInstall) {
    Write-Step "Installing export dependencies"
    Invoke-Checked -FilePath $venvPython -Arguments @("-m", "pip", "install", "--upgrade", "pip")
    Invoke-Checked -FilePath $venvPython -Arguments @("-m", "pip", "install", "optimum[onnx]", "onnxruntime", "transformers")
}

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

$modelOnnxPath = Join-Path $OutputDir "model.onnx"
if ($ForceReexport -and (Test-Path $modelOnnxPath)) {
    Write-Step "Removing existing model.onnx (ForceReexport)"
    Remove-Item -Force $modelOnnxPath
}

Write-Step "Exporting model to ONNX"
if (Test-Path $venvOptimum) {
    Invoke-Checked -FilePath $venvOptimum -Arguments @("export", "onnx", "--model", $ModelId, "--task", "image-classification", $OutputDir)
} else {
    Invoke-Checked -FilePath $venvPython -Arguments @("-m", "optimum.commands.optimum_cli", "export", "onnx", "--model", $ModelId, "--task", "image-classification", $OutputDir)
}

$onnxFiles = Get-ChildItem -Path $OutputDir -Filter "*.onnx" -File -ErrorAction SilentlyContinue
if (-not $onnxFiles -or $onnxFiles.Count -eq 0) {
    throw "No ONNX file found in $OutputDir after export."
}

if (-not (Test-Path $modelOnnxPath)) {
    if ($onnxFiles.Count -eq 1) {
        Copy-Item -Force $onnxFiles[0].FullName $modelOnnxPath
        Write-Step "Copied $($onnxFiles[0].Name) -> model.onnx"
    } else {
        throw "Multiple ONNX files found, but model.onnx is missing. Resolve manually in $OutputDir."
    }
}

$configPath = Join-Path $OutputDir "config.json"
if (-not (Test-Path $configPath)) {
    Write-Step "config.json missing in output, downloading from Hugging Face"
    $configUrl = "https://huggingface.co/$ModelId/raw/main/config.json"
    Invoke-WebRequest -Uri $configUrl -OutFile $configPath
}

Write-Step "Generating labels.txt from config.id2label"
$configJson = Get-Content -Raw $configPath | ConvertFrom-Json
if (-not $configJson.id2label) {
    throw "config.json does not contain id2label."
}

$labelKeys = $configJson.id2label.PSObject.Properties.Name | Sort-Object { [int]$_ }
$labels = foreach ($key in $labelKeys) { $configJson.id2label.$key }
$labelsPath = Join-Path $OutputDir "labels.txt"
$labels | Set-Content -Path $labelsPath -Encoding UTF8

if (-not (Test-Path $labelsPath)) {
    throw "labels.txt was not created."
}

$labelCount = (Get-Content -Path $labelsPath | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }).Count
Write-Step "Setup completed"
Write-Host ("model.onnx : " + $modelOnnxPath) -ForegroundColor Green
Write-Host ("labels.txt : " + $labelsPath) -ForegroundColor Green
Write-Host ("labels count: " + $labelCount) -ForegroundColor Green

Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1) Keep ai.runtime.moderation.scene-classifier.enabled=false until you test 5-10 real images."
Write-Host "2) After sanity test, set enabled=true in ai-runtime-config.yml."
Write-Host "3) Restart backend and observe moderation rule reasons for scene classifier."
