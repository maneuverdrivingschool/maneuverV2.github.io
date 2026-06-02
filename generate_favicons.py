#!/usr/bin/env python3
"""
generate_favicons.py
────────────────────
Generates all required favicon PNG files from favicon.svg
using CairoSVG (pip install cairosvg) or falls back to Pillow.

Run from the project root:
    pip install cairosvg pillow
    python generate_favicons.py

Output: assets/favicon/ directory with all required sizes.
"""

import os
import sys

OUTPUT_DIR = os.path.join("assets", "favicon")
os.makedirs(OUTPUT_DIR, exist_ok=True)

SVG_SOURCE = os.path.join("assets", "favicon", "favicon.svg")
# If SVG not yet in assets, copy from project root
if not os.path.exists(SVG_SOURCE):
    import shutil
    root_svg = "favicon.svg"
    if os.path.exists(root_svg):
        shutil.copy(root_svg, SVG_SOURCE)
        print(f"Copied {root_svg} → {SVG_SOURCE}")

SIZES = {
    "favicon-96x96.png":    96,
    "apple-touch-icon.png": 180,
    "icon-192x192.png":     192,
    "icon-512x512.png":     512,
}

def generate_with_cairosvg():
    import cairosvg
    for filename, size in SIZES.items():
        out = os.path.join(OUTPUT_DIR, filename)
        cairosvg.svg2png(
            url=SVG_SOURCE,
            write_to=out,
            output_width=size,
            output_height=size
        )
        print(f"  ✓ {out} ({size}x{size}px)")
    print("\nAll PNGs generated via CairoSVG.")

def generate_placeholder_pngs():
    """
    Fallback: creates correct-size navy+gold placeholder PNGs
    using only Pillow (no SVG renderer needed).
    Replace with real ones from favicon.svg using an online converter
    like realfavicongenerator.net
    """
    from PIL import Image, ImageDraw, ImageFont

    NAVY = (10, 22, 40)
    GOLD = (201, 148, 58)

    for filename, size in SIZES.items():
        img  = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)

        # Background circle
        draw.ellipse([0, 0, size, size], fill=NAVY)

        # Steering wheel rings & spokes (scaled)
        s = size
        cx = cy = s // 2
        outer_r = int(s * 0.34)
        inner_r = int(s * 0.09)
        lw = max(2, int(s * 0.07))

        # Outer ring
        draw.ellipse(
            [cx-outer_r, cy-outer_r, cx+outer_r, cy+outer_r],
            outline=GOLD, width=lw
        )
        # Hub
        draw.ellipse(
            [cx-inner_r, cy-inner_r, cx+inner_r, cy+inner_r],
            fill=GOLD
        )
        # Top spoke
        draw.line([(cx, cy-inner_r), (cx, cy-outer_r)], fill=GOLD, width=lw-1)
        # Bottom-left spoke
        import math
        a1 = math.radians(210)
        a2 = math.radians(330)
        draw.line([
            (cx + int(inner_r * math.cos(a1)), cy + int(inner_r * math.sin(a1))),
            (cx + int(outer_r * math.cos(a1)), cy + int(outer_r * math.sin(a1)))
        ], fill=GOLD, width=lw-1)
        draw.line([
            (cx + int(inner_r * math.cos(a2)), cy + int(inner_r * math.sin(a2))),
            (cx + int(outer_r * math.cos(a2)), cy + int(outer_r * math.sin(a2)))
        ], fill=GOLD, width=lw-1)

        out = os.path.join(OUTPUT_DIR, filename)
        img.save(out, "PNG")
        print(f"  ✓ {out} ({size}x{size}px) [Pillow placeholder]")

    print("\nPlaceholder PNGs generated via Pillow.")
    print("TIP: For pixel-perfect favicons, upload favicon.svg to")
    print("     https://realfavicongenerator.net/ and replace these files.")

# ── Try CairoSVG first, fall back to Pillow ─────────────────
try:
    import cairosvg
    print("Using CairoSVG for high-quality PNG rendering...\n")
    generate_with_cairosvg()
except ImportError:
    print("CairoSVG not found — using Pillow placeholder generator.")
    print("Install CairoSVG for perfect SVG→PNG: pip install cairosvg\n")
    try:
        from PIL import Image, ImageDraw
        generate_placeholder_pngs()
    except ImportError:
        print("ERROR: Neither CairoSVG nor Pillow found.")
        print("Install with: pip install cairosvg   OR   pip install pillow")
        sys.exit(1)

# Generate favicon.ico (16x16 + 32x32 multi-size) from the 96px PNG
print("\nGenerating favicon.ico...")
try:
    from PIL import Image
    png96 = os.path.join(OUTPUT_DIR, "favicon-96x96.png")
    if os.path.exists(png96):
        img = Image.open(png96)
        ico_path = os.path.join(OUTPUT_DIR, "favicon.ico")
        img.save(ico_path, format="ICO", sizes=[(16,16), (32,32), (48,48)])
        print(f"  ✓ {ico_path} (16x16, 32x32, 48x48)")
    else:
        print("  ⚠ 96x96 PNG not found — skipping .ico generation")
except Exception as e:
    print(f"  ⚠ favicon.ico generation failed: {e}")

print("\n✅ Favicon generation complete!")
print(f"Files saved to: {OUTPUT_DIR}/")
print("\nFile checklist:")
for f in ["favicon.ico", "favicon.svg", "favicon-96x96.png",
          "apple-touch-icon.png", "icon-192x192.png", "icon-512x512.png"]:
    path = os.path.join(OUTPUT_DIR, f)
    status = "✓" if os.path.exists(path) else "✗ MISSING"
    print(f"  {status} {path}")
