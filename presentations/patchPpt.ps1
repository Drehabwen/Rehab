param(
  [Parameter(Mandatory = $true)][string]$PptPath,
  [Parameter(Mandatory = $true)][string]$SlideId,
  [Parameter(Mandatory = $true)][string]$MainImage,
  [Parameter(Mandatory = $true)][string]$BlurImage
)

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.IO.Compression.FileSystem

function Get-PowerPointApp {
  try {
    return [Runtime.InteropServices.Marshal]::GetActiveObject("PowerPoint.Application")
  } catch {
    throw "PowerPoint is not running. Open the PPT in PowerPoint first."
  }
}

function Patch-ByCom {
  param(
    [Parameter(Mandatory = $true)][string]$FullPptPath,
    [Parameter(Mandatory = $true)][string]$SlideId,
    [Parameter(Mandatory = $true)][string]$FullMain,
    [Parameter(Mandatory = $true)][string]$FullBlur
  )

  $ppt = Get-PowerPointApp

  function Find-TargetSlide {
    param(
      [Parameter(Mandatory = $true)]$Presentation,
      [Parameter(Mandatory = $true)][string]$SlideId
    )
    $needle = "#$SlideId"
    foreach ($s in $Presentation.Slides) {
      foreach ($sh in $s.Shapes) {
        if ($sh.HasTextFrame -and $sh.TextFrame.HasText) {
          $t = $sh.TextFrame.TextRange.Text
          if ($t -like "*$needle*") { return $s }
        }
      }
    }
    $idx = 0
    try { $idx = [int]$SlideId } catch { $idx = 0 }
    if ($idx -ge 1 -and $idx -le $Presentation.Slides.Count) {
      return $Presentation.Slides.Item($idx)
    }
    return $null
  }

  function Get-PictureShapes {
    param([Parameter(Mandatory = $true)]$Slide)
    $pics = @()
    foreach ($sh in $Slide.Shapes) {
      if ($sh.Type -eq 13 -or $sh.Type -eq 11) {
        if ($sh.Width -gt 0 -and $sh.Height -gt 0) { $pics += $sh }
      }
    }
    return $pics
  }

  $presentation = $null
  foreach ($p in $ppt.Presentations) {
    if ($p.FullName -eq $FullPptPath) { $presentation = $p; break }
  }

  if ($null -eq $presentation) {
    try {
      $active = $ppt.ActivePresentation
      if ($null -ne (Find-TargetSlide -Presentation $active -SlideId $SlideId)) {
        $presentation = $active
      }
    } catch {
    }
  }

  if ($null -eq $presentation) {
    foreach ($p in $ppt.Presentations) {
      if ($null -ne (Find-TargetSlide -Presentation $p -SlideId $SlideId)) {
        $presentation = $p
        break
      }
    }
  }

  if ($null -eq $presentation) {
    throw "No opened PPT matched (by path or slide id). Open the PPT in PowerPoint."
  }

  $slide = Find-TargetSlide -Presentation $presentation -SlideId $SlideId
  if ($null -eq $slide) {
    throw "Target slide not found in opened PPT: $SlideId"
  }

  $mainName = "AUTO_FIG_MAIN_$SlideId"
  $blurName = "AUTO_FIG_BLUR_$SlideId"
  $mainShape = $null
  $blurShape = $null

  foreach ($sh in $slide.Shapes) {
    if ($sh.Name -eq $mainName) { $mainShape = $sh }
    if ($sh.Name -eq $blurName) { $blurShape = $sh }
  }

  if ($null -eq $mainShape -or $null -eq $blurShape) {
    $pics = Get-PictureShapes -Slide $slide
    $sorted = $pics | Sort-Object @{ Expression = { $_.Width * $_.Height }; Descending = $true }
    if ($sorted.Count -lt 2) {
      throw "Not enough picture shapes found on target slide."
    }
    $blurShape = $sorted[0]
    $mainShape = $sorted[1]
  }

  $null = $blurShape.PictureFormat.Replace($FullBlur)
  $null = $mainShape.PictureFormat.Replace($FullMain)
  $presentation.Save()
  return $presentation.FullName
}

function Resolve-PptEntryPath {
  param(
    [Parameter(Mandatory = $true)][string]$Base,
    [Parameter(Mandatory = $true)][string]$Target
  )

  $raw = ($Base.TrimEnd("/") + "/" + $Target.Replace("\", "/")).Split("/")
  $stack = New-Object System.Collections.Generic.List[string]
  foreach ($part in $raw) {
    if ($part -eq "" -or $part -eq ".") { continue }
    if ($part -eq "..") {
      if ($stack.Count -gt 0) { $stack.RemoveAt($stack.Count - 1) }
      continue
    }
    $stack.Add($part)
  }
  return ($stack -join "/")
}

function Open-ZipForUpdate {
  param([Parameter(Mandatory = $true)][string]$FullPptPath)

  try {
    $zip = [System.IO.Compression.ZipFile]::Open($FullPptPath, [System.IO.Compression.ZipArchiveMode]::Update)
    return @{ Zip = $zip; Path = $FullPptPath }
  } catch {
    $dir = [System.IO.Path]::GetDirectoryName($FullPptPath)
    $base = [System.IO.Path]::GetFileNameWithoutExtension($FullPptPath)
    $ext = [System.IO.Path]::GetExtension($FullPptPath)

    for ($i = 1; $i -le 10; $i += 1) {
      $newPath = [System.IO.Path]::Combine($dir, "$base`_patched_$i$ext")
      try {
        Copy-Item -LiteralPath $FullPptPath -Destination $newPath -Force
        $zip2 = [System.IO.Compression.ZipFile]::Open($newPath, [System.IO.Compression.ZipArchiveMode]::Update)
        return @{ Zip = $zip2; Path = $newPath }
      } catch {
        continue
      }
    }
    throw "Cannot open PPTX for update (maybe opened by PowerPoint). Close it or use the patched copy."
  }
}

$fullPptPath = [System.IO.Path]::GetFullPath($PptPath)
$fullMain = [System.IO.Path]::GetFullPath($MainImage)
$fullBlur = [System.IO.Path]::GetFullPath($BlurImage)

if (-not (Test-Path -LiteralPath $fullPptPath)) { throw "PPTX not found: $fullPptPath" }
if (-not (Test-Path -LiteralPath $fullMain)) { throw "Main image not found: $fullMain" }
if (-not (Test-Path -LiteralPath $fullBlur)) { throw "Blur image not found: $fullBlur" }

$mainName = "AUTO_FIG_MAIN_$SlideId"
$blurName = "AUTO_FIG_BLUR_$SlideId"

$zipOk = $false
$zipErr = ""
$outPath = $fullPptPath

try {
  $opened = Open-ZipForUpdate -FullPptPath $fullPptPath
  $zip = $opened.Zip
  $outPath = $opened.Path

  $slideEntry = $null
  foreach ($e in $zip.Entries) {
    if ($e.FullName -notlike "ppt/slides/slide*.xml") { continue }
    $sr = New-Object System.IO.StreamReader($e.Open(), [System.Text.Encoding]::UTF8, $true)
    $txt = $sr.ReadToEnd()
    $sr.Dispose()
    if ($txt.Contains($mainName) -and $txt.Contains($blurName)) {
      $slideEntry = $e
      break
    }
  }

  if ($null -eq $slideEntry) {
    throw "Slide xml not found by names ($mainName / $blurName). Run ppt:generate once."
  }

  $sr2 = New-Object System.IO.StreamReader($slideEntry.Open(), [System.Text.Encoding]::UTF8, $true)
  $slideXmlText = $sr2.ReadToEnd()
  $sr2.Dispose()
  [xml]$slideXml = $slideXmlText

  $ns = New-Object System.Xml.XmlNamespaceManager($slideXml.NameTable)
  $ns.AddNamespace("p", "http://schemas.openxmlformats.org/presentationml/2006/main")
  $ns.AddNamespace("a", "http://schemas.openxmlformats.org/drawingml/2006/main")
  $ns.AddNamespace("r", "http://schemas.openxmlformats.org/officeDocument/2006/relationships")

  $picMain = $slideXml.SelectSingleNode("//p:pic[p:nvPicPr/p:cNvPr[@name='$mainName']]", $ns)
  $picBlur = $slideXml.SelectSingleNode("//p:pic[p:nvPicPr/p:cNvPr[@name='$blurName']]", $ns)
  if ($null -eq $picMain -or $null -eq $picBlur) {
    throw "Named pictures not found in slide xml."
  }

  $blipMain = $picMain.SelectSingleNode(".//a:blip", $ns)
  $blipBlur = $picBlur.SelectSingleNode(".//a:blip", $ns)
  $rIdMain = $blipMain.GetAttribute("embed", "http://schemas.openxmlformats.org/officeDocument/2006/relationships")
  $rIdBlur = $blipBlur.GetAttribute("embed", "http://schemas.openxmlformats.org/officeDocument/2006/relationships")
  if ([string]::IsNullOrWhiteSpace($rIdMain) -or [string]::IsNullOrWhiteSpace($rIdBlur)) {
    throw "rId not found for named pictures."
  }

  $slideName = [System.IO.Path]::GetFileName($slideEntry.FullName)
  $relsName = "ppt/slides/_rels/$slideName.rels"
  $relsEntry = $zip.GetEntry($relsName)
  if ($null -eq $relsEntry) { throw "Slide rels not found: $relsName" }

  $sr3 = New-Object System.IO.StreamReader($relsEntry.Open(), [System.Text.Encoding]::UTF8, $true)
  $relsText = $sr3.ReadToEnd()
  $sr3.Dispose()
  [xml]$relsXml = $relsText

  $ns2 = New-Object System.Xml.XmlNamespaceManager($relsXml.NameTable)
  $ns2.AddNamespace("rel", "http://schemas.openxmlformats.org/package/2006/relationships")

  $relMain = $relsXml.SelectSingleNode("//rel:Relationship[@Id='$rIdMain']", $ns2)
  $relBlur = $relsXml.SelectSingleNode("//rel:Relationship[@Id='$rIdBlur']", $ns2)
  if ($null -eq $relMain -or $null -eq $relBlur) { throw "Relationships not found for rIds." }

  $targetMain = $relMain.GetAttribute("Target")
  $targetBlur = $relBlur.GetAttribute("Target")
  if ([string]::IsNullOrWhiteSpace($targetMain) -or [string]::IsNullOrWhiteSpace($targetBlur)) {
    throw "Relationship target missing."
  }

  $entryMain = Resolve-PptEntryPath -Base "ppt/slides" -Target $targetMain
  $entryBlur = Resolve-PptEntryPath -Base "ppt/slides" -Target $targetBlur

  $existingMain = $zip.GetEntry($entryMain)
  $existingBlur = $zip.GetEntry($entryBlur)
  if ($null -ne $existingMain) { $existingMain.Delete() }
  if ($null -ne $existingBlur) { $existingBlur.Delete() }

  $null = [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $fullMain, $entryMain, [System.IO.Compression.CompressionLevel]::Optimal)
  $null = [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $fullBlur, $entryBlur, [System.IO.Compression.CompressionLevel]::Optimal)

  $zipOk = $true
} catch {
  $zipErr = $_.Exception.Message
} finally {
  if ($null -ne $zip) { $zip.Dispose() }
}

if (-not $zipOk) {
  $outPath = Patch-ByCom -FullPptPath $fullPptPath -SlideId $SlideId -FullMain $fullMain -FullBlur $fullBlur
  Write-Host "PATCHED_COM $outPath"
} else {
  Write-Host "PATCHED_ZIP $outPath"
}
