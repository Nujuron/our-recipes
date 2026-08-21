"""Resize the circular logo into favicon, apple-touch, and PWA icons."""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "static" / "logo-source.png"
ASSETS = ROOT / "src" / "lib" / "assets"
STATIC = ROOT / "static"
CREAM = (247, 242, 239, 255)


def contain(src: Image.Image, size: int, scale: float) -> Image.Image:
	canvas = Image.new("RGBA", (size, size), CREAM)
	inner = max(1, round(size * scale))
	fitted = src.resize((inner, inner), Image.Resampling.LANCZOS)
	offset = (size - inner) // 2
	canvas.alpha_composite(fitted, (offset, offset))
	return canvas.convert("RGB")


def write_png(image: Image.Image, path: Path) -> None:
	path.parent.mkdir(parents=True, exist_ok=True)
	image.save(path, format="PNG", optimize=True)
	print(f"wrote {path.relative_to(ROOT)}")


src = Image.open(SOURCE).convert("RGBA")

# Header uses a smaller copy so the home-page payload stays light.
write_png(
	src.resize((256, 256), Image.Resampling.LANCZOS).convert("RGB"),
	ASSETS / "logo.png",
)

# "any" icons keep the existing ~10% cream margin.
for name, size in [
	("favicon-32x32.png", 32),
	("apple-touch-icon.png", 180),
	("pwa-192x192.png", 192),
	("pwa-512x512.png", 512),
]:
	write_png(contain(src, size, 1.0), STATIC / name)

# Maskable icons need the artwork inside the inner 80% safe zone.
write_png(contain(src, 512, 0.8), STATIC / "pwa-512x512-maskable.png")
write_png(contain(src, 192, 0.8), STATIC / "pwa-192x192-maskable.png")
