# typst-iso-7000-generator

Generator for the `adequate-iso-7000` Typst package. Scrapes ISO 7000 graphical symbols from Wikimedia Commons, processes the SVGs, and packages them into a Typst library.

## Build

Requires Python 3.14+ (via uv) and Node.js.

```bash
uv sync              # Install Python dependencies
npm install           # Install Node dependencies
bash run.sh           # Full pipeline: build → normalize → optimize
```

The pipeline (`run.sh`) runs three steps:

1. `uv run build.py` — scrape Wikimedia metadata, download raw SVGs, clean up with lxml
2. `node normalize-svg.js` — convert shapes to paths, scale to 100x100 viewBox
3. `npx svgo` — optimize SVGs in-place (config in `svgo.config.mjs`)

## Project structure

- `build.py` — main build script: fetches metadata, downloads SVGs, runs `cleanup_svg()`
- `svg.py` — SVG cleanup: strips namespaces, Inkscape artifacts, gray strokes, normalizes viewBox
- `utils.py` — `Symbol` dataclass, `get_svg_name()`, logging setup
- `normalize-svg.js` — Node CLI: converts shapes to `<path>`, scales to target viewBox dimensions
- `svgo.config.mjs` — SVGO optimization config (multipass, shortHex colors, floatPrecision: 1)
- `run.sh` — orchestrates the full pipeline
- `sources/` — cached data (wikimedia.json.gz, raw/, processed/, icons.json)
- `library/` — git submodule for the output Typst package (`adequate-iso-7000`)

## Key details

- Build is deterministic given cached source data in `sources/`
- Raw SVGs are cached in `sources/raw.tgz`; Wikimedia metadata in `sources/wikimedia.json.gz`
- Processed SVGs go to `sources/processed/` (~2,197 files)
- The `library/` submodule expects icons at `library/src/icons/`
- Symbol references are numeric codes like `0001`, `0070`, `0235A` (4-digit, optional letter suffix)
