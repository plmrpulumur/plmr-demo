#requires -Version 5.1
param([switch]$Deploy,[switch]$EdgeOnly)
$ErrorActionPreference = 'Stop'
$Root = $PSScriptRoot
$CliVersion = '2.122.0'
$script:ProjectRef = 'yackwdxdyajejtdxvncu'
$script:PublishableKey = 'sb_publishable_IXfqhBIsQSlMqlAlgi9Bbg_HMn4fg_k'
function Step([string]$Message) {
    Write-Host "`n============================================================" -ForegroundColor DarkCyan
    Write-Host " $Message" -ForegroundColor Cyan
    Write-Host '============================================================' -ForegroundColor DarkCyan
}

function Reveal-Secure([Security.SecureString]$secret) {
    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
    try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}

function Invoke-PlmrSupabaseCli {
    [CmdletBinding()]
    param([Parameter(Mandatory=$true)][string[]]$Arguments)
    $previousPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        & $script:CliPath @Arguments
        $code = $LASTEXITCODE
    } finally { $ErrorActionPreference = $previousPreference }
    if ($code -ne 0) { throw "Supabase CLI komutu basarisiz: $($Arguments[0..([Math]::Min(1,$Arguments.Count-1))] -join ' '). Islem durduruldu." }
}

function Test-Package {
    $manifest = Get-Content -LiteralPath (Join-Path $Root 'KAYNAK_SHA256.json') -Raw | ConvertFrom-Json
    foreach ($entry in $manifest.PSObject.Properties) {
        $path = Join-Path $Root $entry.Name
        if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw "Paket eksik: $($entry.Name)" }
        if ((Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash -ine $entry.Value) { throw "Paket butunlugu bozuk: $($entry.Name)" }
    }
}

function Get-PlatformState {
    $json = (Invoke-PlmrSupabaseCli -Arguments @('functions','list','--project-ref',$script:ProjectRef,'--output','json')) -join "`n"
    $data = $json | ConvertFrom-Json
    # An array's member enumeration yields one null per record for an absent
    # property. That array is not $null: do not treat it as a wrapper object.
    if ($data -isnot [array] -and $null -ne $data -and $null -ne $data.PSObject.Properties['functions']) {
        $data = $data.functions
    }
    $item = @($data | Where-Object { $_.slug -eq 'plmr-platform' -or $_.name -eq 'plmr-platform' })
    if ($item.Count -ne 1 -or $item[0].status -ne 'ACTIVE') { throw 'Canli plmr-platform bulunamadi veya aktif degil.' }
    if ($item[0].verify_jwt -ne $false) { throw 'Beklenen mevcut JWT ayari farkli; otomatik olarak degistirilmedi.' }
    return $item[0]
}

function Load-Or-Create-CLI {
    $arch='amd64'
    if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64' -or $env:PROCESSOR_ARCHITEW6432 -eq 'ARM64') { $arch='arm64' }
    $cache=Join-Path $env:LOCALAPPDATA "PLMR\SupabaseCLI\$CliVersion\$arch"
    [IO.Directory]::CreateDirectory($cache) | Out-Null
    $script:CliPath=Join-Path $cache 'supabase.exe'
    if (Test-Path -LiteralPath $script:CliPath) { return }
    [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12
    $tmp=Join-Path $cache ('download-'+[guid]::NewGuid().ToString('N'))
    [IO.Directory]::CreateDirectory($tmp) | Out-Null
    try {
        $asset="supabase_${CliVersion}_windows_${arch}.zip"
        $base="https://github.com/supabase/cli/releases/download/v$CliVersion"
        Write-Host "Resmi Supabase CLI $CliVersion indiriliyor; Node.js gerekli degil."
        Invoke-WebRequest -UseBasicParsing -Uri "$base/$asset" -OutFile (Join-Path $tmp $asset)
        Invoke-WebRequest -UseBasicParsing -Uri "$base/checksums.txt" -OutFile (Join-Path $tmp 'checksums.txt')
        $line=@(Get-Content (Join-Path $tmp 'checksums.txt') | Where-Object { $_ -match ('\s+\*?'+[regex]::Escape($asset)+'$') })
        if ($line.Count -ne 1) { throw 'Supabase CLI SHA256 kaydi bulunamadi.' }
        $expected=($line[0] -split '\s+')[0]
        $actual=(Get-FileHash -LiteralPath (Join-Path $tmp $asset) -Algorithm SHA256).Hash
        if ($actual -ine $expected) { throw 'CLI arsiv SHA256 kontrolu basarisiz.' }
        Expand-Archive -LiteralPath (Join-Path $tmp $asset) -DestinationPath (Join-Path $tmp 'bin')
        $exe=@(Get-ChildItem -LiteralPath (Join-Path $tmp 'bin') -Recurse -Filter 'supabase.exe')
        if ($exe.Count -ne 1) { throw 'CLI paketi gecersiz.' }
        Copy-Item -LiteralPath $exe[0].FullName -Destination $script:CliPath
    } finally { Remove-Item -LiteralPath $tmp -Recurse -Force -ErrorAction SilentlyContinue }
}

function Api-Post([string]$Function,[hashtable]$Body,[hashtable]$AdditionalHeaders=@{}) {
    $h=@{ apikey=$script:PublishableKey; 'Content-Type'='application/json' }
    foreach($k in $AdditionalHeaders.Keys) { $h[$k]=$AdditionalHeaders[$k] }
    $uri="https://$($script:ProjectRef).supabase.co/functions/v1/$Function"
    return Invoke-RestMethod -Method POST -Uri $uri -Headers $h -Body ($Body|ConvertTo-Json -Compress -Depth 8) -TimeoutSec 60
}

function Deploy-PLMR {
    Step 'Mevcut Supabase projesine yukleme'
    Test-Package
    Load-Or-Create-CLI
    Invoke-PlmrSupabaseCli -Arguments @('--version')
    Push-Location $Root
    $previousDbPassword = $env:SUPABASE_DB_PASSWORD
    try {
        Invoke-PlmrSupabaseCli -Arguments @('login')
        $dbSecret = Read-Host 'Mevcut projenin veritabani parolasi (PIN degil)' -AsSecureString
        $env:SUPABASE_DB_PASSWORD = Reveal-Secure $dbSecret
        if ([string]::IsNullOrWhiteSpace($env:SUPABASE_DB_PASSWORD)) { throw 'Veritabani parolasi gerekli.' }
        Invoke-PlmrSupabaseCli -Arguments @('link','--project-ref',$script:ProjectRef)
        Invoke-PlmrSupabaseCli -Arguments @('db','query','--linked','--file',(Join-Path $Root 'Testler/preflight.sql'))
        $before = Get-PlatformState
        if (-not $EdgeOnly) {
            Invoke-PlmrSupabaseCli -Arguments @('db','push','--dry-run','--linked','--skip-vault')
            Invoke-PlmrSupabaseCli -Arguments @('db','push','--yes','--linked','--skip-vault')
        }
        Invoke-PlmrSupabaseCli -Arguments @('db','query','--linked','--file',(Join-Path $Root 'Testler/verify-v36.sql'))
        Invoke-PlmrSupabaseCli -Arguments @('db','query','--linked','--file',(Join-Path $Root 'Testler/verify-v40.sql'))
        Invoke-PlmrSupabaseCli -Arguments @('db','query','--linked','--file',(Join-Path $Root 'Testler/verify-v41.sql'))
        Invoke-PlmrSupabaseCli -Arguments @('db','query','--linked','--file',(Join-Path $Root 'Testler/verify-v43.sql'))
        Invoke-PlmrSupabaseCli -Arguments @('db','query','--linked','--file',(Join-Path $Root 'Testler/verify-v44.sql'))
        Invoke-PlmrSupabaseCli -Arguments @('db','query','--linked','--file',(Join-Path $Root 'Testler/verify-v45.sql'))
        Invoke-PlmrSupabaseCli -Arguments @('db','query','--linked','--file',(Join-Path $Root 'Testler/verify-v46.sql'))
        Invoke-PlmrSupabaseCli -Arguments @('functions','deploy','plmr-platform','--project-ref',$script:ProjectRef,'--no-verify-jwt','--use-api')
        $after = Get-PlatformState
        if ([int]$after.version -le [int]$before.version) { throw 'Edge Function surumu artmadi; yukleme dogrulanamadi.' }
        if (-not $EdgeOnly) { Invoke-PlmrSupabaseCli -Arguments @('db','push','--dry-run','--linked','--skip-vault') }
        [ordered]@{ status='DEPLOYMENT_VERIFIED'; package='V45'; project=$script:ProjectRef; utc=[DateTime]::UtcNow.ToString('o'); function='plmr-platform'; previousVersion=$before.version; deployedVersion=$after.version; storageVerified=$true; performanceRpcsVerified=$true; authenticatedFileTest='NOT_RUN' } |
            ConvertTo-Json | Set-Content -LiteralPath (Join-Path $Root 'SON_YUKLEME_SONUCU.json') -Encoding UTF8
        Write-Host 'BASARILI: Supabase altyapisi ve plmr-platform dagitimi dogrulandi.' -ForegroundColor Green
        Write-Host 'Uygulamadan bir test projesi PDF dosyasi yukleyerek kullanici kabul testini tamamlayin.'
    } finally {
        if ($null -eq $previousDbPassword) { Remove-Item Env:SUPABASE_DB_PASSWORD -ErrorAction SilentlyContinue }
        else { $env:SUPABASE_DB_PASSWORD = $previousDbPassword }
        $dbSecret = $null
        $previousDbPassword = $null
        Pop-Location
    }
}

function Verify-PLMR {
    Step 'Canli kullanici girisi ve bulut baglanti kontrolu'
    Write-Host 'Bu kontrol yeni bir oturum acar; onceki uygulama oturumu kapanabilir.'
    $sessionToken = $null
    try {
        $securePin = Read-Host 'Aytug kullanicisinin PIN degeri' -AsSecureString
        $pin = Reveal-Secure $securePin
        if ($pin -notmatch '^\d{4}$') { throw 'PIN dort rakam olmali.' }
        $login = Api-Post 'admin-users' @{action='login';username='aytug';pin=$pin}
        $pin = $null
        $sessionToken = $login.session.access_token
        if (-not $sessionToken) { throw 'Giris dogrulanamadi.' }
        $snapshot = Api-Post 'plmr-platform' @{action='snapshot';projectSummaries=$true;deferProjectFiles=$true} @{Authorization="Bearer $sessionToken"}
        if (-not $snapshot.userId -or $snapshot.rows -isnot [array]) { throw 'Bulut snapshot dogrulanamadi.' }
        $directory = @($snapshot.rows | Where-Object { $_.key -eq 'plmr.users.v13' })
        if ($directory.Count -ne 1) { throw 'Kullanici dizini okunamadi.' }
        $users = @($directory[0].value | ConvertFrom-Json)
        $actor = @($users | Where-Object { $_.userId -eq $snapshot.userId -and $_.username -eq 'aytug' -and $_.roleId -eq 'SYSTEM_ADMIN' })
        if ($actor.Count -ne 1) { throw 'Beklenen yonetici kimligi dogrulanamadi.' }
        Write-Host 'DOGRULANDI: Aytug hesabi ve canli bulut snapshot calisiyor.' -ForegroundColor Green
    } finally {
        $pin = $null
        $securePin = $null
        if ($sessionToken) {
            Invoke-RestMethod -Method POST -Uri "https://$($script:ProjectRef).supabase.co/auth/v1/logout?scope=local" -Headers @{apikey=$script:PublishableKey;Authorization="Bearer $sessionToken"} -TimeoutSec 60 | Out-Null
        }
        $sessionToken = $null
        $login = $null
    }
}

if ($MyInvocation.InvocationName -ne '.') {
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        if ($Deploy) { Deploy-PLMR } else { Verify-PLMR }
        exit 0
    } catch {
        [ordered]@{ status='FAILED'; package='V45'; project=$script:ProjectRef; utc=[DateTime]::UtcNow.ToString('o'); message='Yukleme veya dogrulama basarisiz. Ekrandaki hatayi kontrol edin; kismi kurulum olabilir.' } |
            ConvertTo-Json | Set-Content -LiteralPath (Join-Path $Root 'SON_YUKLEME_SONUCU.json') -Encoding UTF8
        Write-Host ("ISLEM TAMAMLANAMADI: " + $_.Exception.Message) -ForegroundColor Red
        exit 1
    }
}
