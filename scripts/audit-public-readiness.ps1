[CmdletBinding()]
param(
  # Avant la publication, la presence d'un depot distant est une anomalie et
  # fait echouer l'audit. Une fois le depot publie -- ou lors d'une execution
  # dans l'integration continue, ou GitHub configure toujours 'origin' -- ce
  # commutateur transforme l'assertion en simple constat informatif.
  [switch] $AllowRemotes
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$textExtensions = @(
  '.css', '.html', '.json', '.jsonl', '.lock', '.md', '.ps1', '.rs',
  '.toml', '.ts', '.tsx', '.txt', '.yaml', '.yml'
)

# Les trois premiers motifs capturent le nom de dossier utilisateur (groupe 1).
# Exception **contextuelle** (ACTION-0062 R2) : un nom fictif n'est toléré que
# dans le fichier exact où un jeu d'essai synthétique l'emploie pour prouver
# qu'un chemin absolu n'est jamais publié; ce n'est pas une donnée locale.
# Clé = chemin relatif au dépôt (séparateur `/`, comparaison exacte), valeur =
# noms fictifs exacts tolérés dans ce fichier seulement. Partout ailleurs, ces
# mêmes noms restent une trouvaille, comme tout autre nom de dossier utilisateur.
$syntheticUserNamesByFile = @{
  'src-tauri/src/map/sandbox.rs'           = @('quelquun')
  'src-tauri/src/scale_spike/profile.rs' = @('other')
}

$patterns = [ordered]@{
  'chemin Windows personnel' = '[A-Za-z]:' + '\\Users\\([^\\\r\n]+)\\'
  'chemin macOS personnel' = '/' + 'Users' + '/([^/\r\n]+)/'
  'chemin Linux personnel' = '/' + 'home' + '/([^/\r\n]+)/'
  'clé privée' = 'BEGIN ' + '[A-Z ]*PRIVATE KEY'
  'clé AWS' = 'AKIA' + '[0-9A-Z]{16}'
  'jeton GitHub' = 'gh' + '[pousr]_[A-Za-z0-9]{20,}'
  'clé OpenAI' = 'sk' + '-[A-Za-z0-9]{20,}'
  'clé Anthropic' = 'sk' + '-ant-[A-Za-z0-9_-]{20,}'
  'jeton Slack' = 'xox' + '[baprs]-[A-Za-z0-9-]{10,}'
}

Push-Location $projectRoot
try {
  $tracked = @(& git ls-files --cached --others --exclude-standard)
  if ($LASTEXITCODE -ne 0) {
    throw 'Impossible de lire la liste des fichiers versionnés.'
  }

  $findings = @()
  foreach ($relativePath in $tracked) {
    $extension = [IO.Path]::GetExtension($relativePath).ToLowerInvariant()
    if ($textExtensions -notcontains $extension) { continue }

    $fullPath = Join-Path $projectRoot $relativePath
    $content = [IO.File]::ReadAllText($fullPath)
    foreach ($entry in $patterns.GetEnumerator()) {
      foreach ($match in [regex]::Matches($content, $entry.Value)) {
        $isUserPath = $match.Groups.Count -gt 1
        if ($isUserPath -and $syntheticUserNamesByFile.ContainsKey($relativePath) -and
            ($syntheticUserNamesByFile[$relativePath] -ccontains $match.Groups[1].Value)) { continue }
        $findings += "${relativePath}: $($entry.Key)"
        break
      }
    }
  }

  if ($findings.Count -gt 0) {
    # Toutes les trouvailles sont listées avant d'échouer: `Write-Error` avec
    # `$ErrorActionPreference = 'Stop'` s'arrêterait sinon à la première et
    # masquerait les suivantes.
    $findings | Sort-Object -Unique | ForEach-Object { Write-Host "Audit public: $_" }
    throw 'Audit public: motifs sensibles détectés.'
  }

  $largeFiles = foreach ($relativePath in $tracked) {
    $fullPath = Join-Path $projectRoot $relativePath
    $size = (Get-Item -LiteralPath $fullPath).Length
    if ($size -gt 5MB) {
      [pscustomobject]@{ Path = $relativePath; Bytes = $size }
    }
  }
  if (@($largeFiles).Count -gt 0) {
    $largeFiles | Format-Table -AutoSize
    throw 'Audit public: fichier versionné supérieur à 5 Mio.'
  }

  $remotes = @(& git remote)
  if ($remotes.Count -gt 0 -and -not $AllowRemotes) {
    throw "Audit public: dépôt distant configuré ($($remotes -join ', '))."
  }

  $remoteState = if ($remotes.Count -eq 0) {
    'aucun remote'
  }
  else {
    "remotes tolérés via -AllowRemotes ($($remotes -join ', '))"
  }

  Write-Host ("Audit public réussi: {0} fichiers versionnés, aucun motif sensible, aucun fichier > 5 Mio, {1}." -f $tracked.Count, $remoteState)
}
finally {
  Pop-Location
}
