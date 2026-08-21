"""Resize brand artwork into favicon, apple-touch, and PWA icons."""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
LOGO_SOURCE = ROOT / "static" / "logo-source.png"
FAVICON_SOURCE = ROOT / "static" / "favicon-source.png"
ASSETS = ROOT / "src" / "lib" / "assets"
STATIC = ROOT / "static"
CREAM = (247, 242, 239, 255)
INK = (28, 36, 32, 255)
LIGHT_HAT = (243, 240, 232, 255)


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


def crop_to_artwork(src: Image.Image, pad_ratio: float = 0.12) -> Image.Image:
	alpha = src.getchannel("A")
	bbox = alpha.point(lambda a: 255 if a > 20 else 0).getbbox()
	if not bbox:
		return src
	left, top, right, bottom = bbox
	width = right - left
	height = bottom - top
	side = max(width, height)
	pad = round(side * pad_ratio)
	side += pad * 2
	cx = (left + right) / 2
	cy = (top + bottom) / 2
	x0 = round(cx - side / 2)
	y0 = round(cy - side / 2)
	canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
	canvas.paste(src, (-x0, -y0), src)
	return canvas


def recolor_hat(src: Image.Image, hat_rgba: tuple[int, int, int, int]) -> Image.Image:
	pixels = src.load()
	out = src.copy()
	dest = out.load()
	width, height = src.size
	hr, hg, hb, ha = hat_rgba
	for y in range(height):
		for x in range(width):
			r, g, b, a = pixels[x, y]
			if a < 20:
				continue
			if r > 80 and r > g * 2 and r > b * 2:
				continue
			dest[x, y] = (hr, hg, hb, min(a, ha))
	return out


def favicon(src: Image.Image, size: int, hat_rgba: tuple[int, int, int, int]) -> Image.Image:
	mark = recolor_hat(crop_to_artwork(src), hat_rgba)
	canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
	fitted = mark.resize((size, size), Image.Resampling.LANCZOS)
	canvas.alpha_composite(fitted)
	return canvas


logo = Image.open(LOGO_SOURCE).convert("RGBA")

# Header uses a smaller copy so the home-page payload stays light.
write_png(
	logo.resize((256, 256), Image.Resampling.LANCZOS).convert("RGB"),
	ASSETS / "logo.png",
)

# Home-screen icons keep the circular wordmark.
for name, size in [
	("apple-touch-icon.png", 180),
	("pwa-192x192.png", 192),
	("pwa-512x512.png", 512),
]:
	write_png(contain(logo, size, 1.0), STATIC / name)

write_png(contain(logo, 512, 0.8), STATIC / "pwa-512x512-maskable.png")
write_png(contain(logo, 192, 0.8), STATIC / "pwa-192x192-maskable.png")

# Tab icons use the simplified hat + heart mark.
mark = Image.open(FAVICON_SOURCE).convert("RGBA")
write_png(favicon(mark, 32, INK), STATIC / "favicon-32x32.png")
write_png(favicon(mark, 32, LIGHT_HAT), STATIC / "favicon-32x32-dark.png")
write_png(favicon(mark, 48, INK), STATIC / "favicon-48x48.png")
write_png(favicon(mark, 48, LIGHT_HAT), STATIC / "favicon-48x48-dark.png")
