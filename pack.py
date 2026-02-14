#!python3
"""Pack processed SVGs into a Typst dictionary file (library/src/icons.typ)."""

import argparse
from pathlib import Path

PROCESSED_SVG = Path("sources/processed")
OUTPUT = Path("library/src/icons.typ")


def pack(svg_dir: Path, output: Path):
    svgs = sorted(svg_dir.glob("*.svg"))
    if not svgs:
        raise FileNotFoundError(f"No SVG files found in {svg_dir}")

    lines = ["#let _data = ("]
    for svg_path in svgs:
        name = svg_path.stem
        content = svg_path.read_text().strip()

        # Strip leading "<svg " and trailing "</svg>"
        assert content.startswith("<svg "), f"{svg_path.name}: unexpected start: {content[:20]}"
        assert content.endswith("</svg>"), f"{svg_path.name}: unexpected end: {content[-20:]}"
        fragment = content[5:-6]

        # Escape backslashes and double quotes for Typst string literal
        fragment = fragment.replace("\\", "\\\\").replace('"', '\\"')

        lines.append(f'  "{name}": "{fragment}",')

    lines.append(")")
    lines.append("")

    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text("\n".join(lines))
    print(f"Wrote {len(svgs)} icons to {output}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Pack SVGs into icons.typ")
    parser.add_argument(
        "--svg-dir",
        type=Path,
        default=PROCESSED_SVG,
        help="Directory containing processed SVGs",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=OUTPUT,
        help="Output Typst file",
    )
    args = parser.parse_args()
    pack(args.svg_dir, args.output)
