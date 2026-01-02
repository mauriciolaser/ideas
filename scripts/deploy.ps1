param(
  [string]$branch = 'main'
)

# Verifica que estés autenticado en GH CLI
gh auth status 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
  gh auth login
}

Write-Host "🔄 Lanzando workflow de despliegue para rama '$branch'..."
gh workflow run 'Deploy' --ref $branch
