#!/bin/bash
set -euo pipefail

# Step 1: Build — scrape and process SVGs
uv run build.py

# Step 2: Normalize all processed SVGs to a 100x100 viewBox
node normalize-svg.js -W 100 -H 100 sources/processed/*.svg

# Step 3: Optimize with SVGO (in-place)
npx svgo --config svgo.config.mjs -f sources/processed/ -o sources/processed
