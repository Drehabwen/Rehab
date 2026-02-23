param(
    [string]$Directory = "."
)

Get-ChildItem -Path $Directory -Recurse -File | 
    Where-Object { $_.FullName -notmatch "node_modules|\.git|dist|\.next" } | 
    Where-Object { $_.Length -gt 1048576 } |
    Select-Object @{Name="Size(MB)";Expression={"{0:N2}" -f ($_.Length / 1MB)}}, FullName | 
    Sort-Object {[double]$_."Size(MB)"} -Descending |
    Select-Object -First 50 |
    Format-Table -AutoSize