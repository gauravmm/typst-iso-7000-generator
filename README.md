# Typst ISO 7000 Icon Generator

Generator for the [typst-iso-7000](https://github.com/gauravmm/typst-iso-7000) Typst package. This tool scrapes ISO 7000 symbol SVGs from Wikimedia Commons, cleans and optimizes them, and outputs them into the library for use as a Typst package.

The generator is **deterministic** -- given the same cached source data, it will always produce identical output. The repository ships with all the files necessary to generate and update the library, including cached Wikimedia metadata and raw SVGs in `sources/`.

The [typst-iso-7000](https://github.com/gauravmm/typst-iso-7000) library is included as a **git submodule** in `library/`.

## Setup

This project uses [uv](https://docs.astral.sh/uv/) as its package manager.

```bash
# Clone the repository with the library submodule
git clone --recurse-submodules https://github.com/gauravmm/typst-iso-7000-generator.git
cd typst-iso-7000-generator

# Install dependencies
uv sync
```

## Usage

```bash
# Run the generator
uv run build.py

# Force re-processing of all SVGs (even if output already exists)
uv run build.py --force-process

# Enable debug logging
uv run build.py --debug
```

The build script will:

1. Fetch symbol metadata from Wikimedia Commons (cached in `sources/wikimedia.json.gz`)
2. Download raw SVGs (cached in `sources/raw.tgz`)
3. Clean and optimize each SVG (strip non-SVG namespaces, remove Inkscape artifacts, normalize sizing, optimize with scour)
4. Write processed SVGs to `library/src/icons/`
5. Write symbol metadata to `sources/icons.json`
