#!/bin/bash
set -euo pipefail

# Step 1: Build — scrape and process SVGs
uv run build.py

# Step 2: Optimize with SVGO (in-place)
npx svgo --config svgo.config.mjs -f sources/processed/ -o sources/processed

# Step 3: Pack SVGs into Typst dictionary
uv run pack.py

# Step 4: Build demo PDF
typst compile demo.typ
