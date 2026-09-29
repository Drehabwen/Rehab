from pathlib import Path
from PIL import Image

assets = Path(__file__).resolve().parent / "assets"
source = assets / "qingyue-logo-v1.png"
target = assets / "qingyue-logo-v1.ico"

image = Image.open(source).convert("RGBA")
image.save(target, format="ICO", sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
print(target)
