#Requires -RunAsAdministrator
[CmdletBinding()]
param([ValidateRange(1024,65535)][int]$Port=3019)
$ErrorActionPreference='Stop'
$taskRoot=Split-Path -Parent $PSScriptRoot
$taskData=Join-Path $taskRoot '.data'
$taskResult=Join-Path $taskData 'lan-firewall-result.json'
New-Item -ItemType Directory -Path $taskData -Force | Out-Null
try {
    $listeners=@(Get-NetTCPConnection -State Listen -LocalPort $Port)
    $listener=$listeners | Where-Object { $_.LocalAddress -eq '0.0.0.0' } | Select-Object -First 1
    if(-not $listener){throw 'Start the app with HOST=0.0.0.0 before enabling LAN access.'}
    $nodeExecutable=(Get-Process -Id $listener.OwningProcess).Path
    if(-not $nodeExecutable -or (Split-Path -Leaf $nodeExecutable) -ne 'node.exe' -or -not (Test-Path -LiteralPath $nodeExecutable)){throw 'The listening process is not a valid Node.js executable.'}
    $privateNetworks=@(Get-NetConnectionProfile | Where-Object { $_.NetworkCategory -eq 'Private' })
    if(-not $privateNetworks.Count){throw 'No private network is active. Use a trusted home network and set its Windows network profile to Private yourself.'}
    $ruleName='AIConceptLab-3DLab006-LAN-'+$Port
    $rule=Get-NetFirewallRule -Name $ruleName -ErrorAction SilentlyContinue
    if($rule){Remove-NetFirewallRule -Name $ruleName}
    New-NetFirewallRule -Name $ruleName -DisplayName "AI Concept Lab 3D Lab 006 - private LAN TCP $Port" -Description 'Allow the running Node app from the local subnet on private networks only.' -Direction Inbound -Action Allow -Enabled True -Profile Private -Protocol TCP -LocalPort $Port -RemoteAddress LocalSubnet -Program $nodeExecutable -EdgeTraversalPolicy Block | Out-Null
    $applied=Get-NetFirewallRule -Name $ruleName
    $portFilter=$applied | Get-NetFirewallPortFilter
    $addressFilter=$applied | Get-NetFirewallAddressFilter
    if($applied.Action -ne 'Allow' -or $applied.Profile -ne 'Private' -or $portFilter.LocalPort -ne "$Port" -or $addressFilter.RemoteAddress -notcontains 'LocalSubnet'){throw 'The firewall rule did not match the requested LAN scope.'}
    @{status='ready';port=$Port;profile='Private';remoteAddress='LocalSubnet';rule=$ruleName;checkedAt=[DateTime]::UtcNow.ToString('o')} | ConvertTo-Json | Set-Content -LiteralPath $taskResult -Encoding utf8
    Write-Output 'Private LAN access enabled. Retry the link on your phone using the same home network.'
}catch{
    @{status='failed';error=$_.Exception.Message;checkedAt=[DateTime]::UtcNow.ToString('o')} | ConvertTo-Json | Set-Content -LiteralPath $taskResult -Encoding utf8
    throw
}
