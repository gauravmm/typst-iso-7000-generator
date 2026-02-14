#!/bin/bash
set -euo pipefail

# Step 1: Build — scrape and process SVGs
uv run build.py

# Step 3: Optimize with SVGO (in-place)
npx svgo --config svgo.config.mjs -f sources/processed/ -o sources/processed

# Step 3: Optimize with SVGO (in-place)
# npx svgo --config svgo.config.mjs -f sources/processed/ -o sources/processed
