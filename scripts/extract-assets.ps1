Add-Type -AssemblyName System.Drawing
$referenceRoot = Join-Path $PSScriptRoot '..\references\figma\Desktop\Início.png'
$assetRoot = Join-Path $PSScriptRoot '..\public\assets'
$sourceImage = [System.Drawing.Bitmap]::new([System.IO.Path]::GetFullPath($referenceRoot))
try {
  foreach ($crop in @(@('emerald',1740,202,900,900),@('sage',1547,1443,500,500),@('neon',2129,1443,500,500),@('gold',960,3138,500,500))) {
    $assetImage = $sourceImage.Clone([System.Drawing.Rectangle]::new($crop[1],$crop[2],$crop[3],$crop[4]),$sourceImage.PixelFormat)
    try { $assetImage.Save((Join-Path $assetRoot ($crop[0]+'.jpg')),[System.Drawing.Imaging.ImageFormat]::Jpeg) } finally { $assetImage.Dispose() }
  }
} finally { $sourceImage.Dispose() }
