$file = "c:/Users/771236/Desktop/Drop-Point/Drop_Front/assets/js/cliente.js"
$content = Get-Content $file -Raw
$content = $content -replace "=======`r?`n", ""
Set-Content $file -Value $content -NoNewline
Write-Host "Arquivo corrigido!"
