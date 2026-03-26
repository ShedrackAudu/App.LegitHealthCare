$file = "frontend\src\pages\ConsultationPage.tsx"
$content = Get-Content $file -Raw

# Add asterisk to ComboField label
# Pattern: {label}</Label> followed by newline + div relative group
$oldCombo = '{label}</Label>'
$newCombo = '{label} <span className="text-red-500">*</span></Label>'

# Replace only in ComboField context (line 146 area)
$content = $content.Replace(
    $oldCombo + "`r`n      <div className=`"relative group`">",
    $newCombo + "`r`n      <div className=`"relative group`">"
)
$content = $content.Replace(
    $oldCombo + "`n      <div className=`"relative group`">",
    $newCombo + "`n      <div className=`"relative group`">"
)

# Add asterisk to RadioField label
# Pattern: {label}</Label> followed by newline + <Controller
$oldRadio = '{label}</Label>'
$newRadio = '{label} <span className="text-red-500">*</span></Label>'

$content = $content.Replace(
    $oldRadio + "`r`n    <Controller`r`n      name={name}`r`n      control={control}",
    $newRadio + "`r`n    <Controller`r`n      name={name}`r`n      control={control}"
)
$content = $content.Replace(
    $oldRadio + "`n    <Controller`n      name={name}`n      control={control}",
    $newRadio + "`n    <Controller`n      name={name}`n      control={control}"
)

Set-Content $file $content -NoNewline
Write-Host "Done"
