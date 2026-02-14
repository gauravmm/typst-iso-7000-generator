#!/usr/bin/env node

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { program } from "commander";
import { pathThatSvg } from "path-that-svg";
import { scale } from "scale-that-svg";

/**
 * Parse the viewBox attribute from an SVG string.
 * Returns { minX, minY, width, height } or null if not found.
 */
function parseViewBox(svg) {
  const match = svg.match(/viewBox=["']([^"']+)["']/);
  if (!match) return null;
  const parts = match[1].trim().split(/[\s,]+/).map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) return null;
  return { minX: parts[0], minY: parts[1], width: parts[2], height: parts[3] };
}

/**
 * Replace the viewBox attribute in an SVG string.
 */
function setViewBox(svg, minX, minY, width, height) {
  return svg.replace(
    /viewBox=["'][^"']+["']/,
    `viewBox="${minX} ${minY} ${width} ${height}"`
  );
}

/**
 * Apply a translate(tx, ty) to SVG path data by offsetting absolute coordinates.
 *
 * SVG path commands:
 *   Uppercase = absolute coords, lowercase = relative (no offset needed for relative).
 *   Each command type has a known parameter pattern specifying which params are x/y coords.
 */
function translatePathData(d, tx, ty) {
  // Tokenize: split into commands and numbers
  const tokens = d.match(/[a-zA-Z]|[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/g);
  if (!tokens) return d;

  const result = [];
  let cmd = "";
  let paramIndex = 0;

  // Parameter patterns: for each absolute command, which indices are x (0) vs y (1)
  // Pattern repeats for commands that accept multiple coordinate pairs
  const patterns = {
    M: [0, 1], // (x,y)+
    L: [0, 1],
    T: [0, 1],
    S: [0, 1, 0, 1], // (x1,y1, x,y)+
    Q: [0, 1, 0, 1],
    C: [0, 1, 0, 1, 0, 1], // (x1,y1, x2,y2, x,y)+
    H: [0], // x+
    V: [1], // y+
    A: [-1, -1, -1, -1, -1, 0, 1], // (rx,ry, angle, large-arc, sweep, x,y)+
    Z: [],
  };

  for (const token of tokens) {
    if (/^[a-zA-Z]$/.test(token)) {
      cmd = token;
      paramIndex = 0;
      result.push(token);
    } else {
      const num = parseFloat(token);
      const upperCmd = cmd.toUpperCase();
      const isAbsolute = cmd === upperCmd && upperCmd !== "Z";
      const pattern = patterns[upperCmd] || [];

      if (isAbsolute && pattern.length > 0) {
        const patIdx = paramIndex % pattern.length;
        const axis = pattern[patIdx]; // 0=x, 1=y, -1=no offset
        if (axis === 0) {
          result.push(String(num + tx));
        } else if (axis === 1) {
          result.push(String(num + ty));
        } else {
          result.push(token);
        }
      } else {
        result.push(token);
      }
      paramIndex++;
    }
  }

  return result.join(" ").replace(/ ([a-zA-Z]) /g, "$1").replace(/([a-zA-Z]) /g, "$1");
}

/**
 * Find all translate transforms in the SVG and apply them directly to path data.
 * Removes the transform attributes after applying.
 */
function applyTranslateTransforms(svg) {
  // Repeatedly find and apply the innermost translate transform
  let result = svg;
  let changed = true;
  while (changed) {
    changed = false;
    result = result.replace(
      /(<(?:path|g)\b[^>]*?)transform=["']translate\(\s*([^,\s]+)[\s,]+([^)]+)\s*\)["']([^>]*?)(\/>|>([\s\S]*?)<\/(?:path|g)>)/,
      (match, before, txStr, tyStr, after, closingOrBody, body) => {
        const tx = parseFloat(txStr);
        const ty = parseFloat(tyStr);
        if (isNaN(tx) || isNaN(ty)) return match;
        changed = true;

        // For self-closing <path/> with d attribute
        const fullTag = before + after;
        if (closingOrBody === "/>") {
          // Apply translate to d attribute in this element
          const translated = fullTag.replace(
            /\bd=["']([^"']+)["']/,
            (_, d) => `d="${translatePathData(d, tx, ty)}"`
          );
          return translated + "/>";
        }

        // For <g>...</g> — apply translate to all d="" inside
        const translatedBody = body.replace(
          /\bd=["']([^"']+)["']/g,
          (_, d) => `d="${translatePathData(d, tx, ty)}"`
        );
        // Also apply to any transform="translate()" on child elements by adjusting their translates
        const tagName = before.match(/<(\w+)/)[1];
        return before + after + ">" + translatedBody + `</${tagName}>`;
      }
    );
  }

  return result;
}

async function processSvg(inputPath, targetWidth, targetHeight, outputPath) {
  const raw = await readFile(inputPath, "utf-8");

  // Convert shapes to paths
  const pathed = await pathThatSvg(raw);

  // Apply any translate transforms directly to path data
  const transformed = applyTranslateTransforms(pathed);

  // Parse existing viewBox
  const vb = parseViewBox(transformed);
  if (!vb || vb.width === 0 || vb.height === 0) {
    console.error(`Skipping ${inputPath}: no valid viewBox found`);
    return;
  }

  // Compute scale factors
  const scaleX = targetWidth / vb.width;
  const scaleY = targetHeight / vb.height;

  // Scale the SVG content
  const scaled = await scale(transformed, { scale: scaleX, scaleY });

  // Update viewBox to target dimensions
  const result = setViewBox(scaled, 0, 0, targetWidth, targetHeight);

  await writeFile(outputPath, result, "utf-8");
  console.log(`Processed: ${inputPath} -> ${outputPath}`);
}

program
  .name("normalize-svg")
  .description("Normalize SVG files to a given viewBox dimension")
  .requiredOption("-W, --width <number>", "Target viewBox width", parseFloat)
  .requiredOption("-H, --height <number>", "Target viewBox height", parseFloat)
  .option("-o, --output <dir>", "Output directory (default: overwrite originals)")
  .argument("<files...>", "SVG files to process")
  .action(async (files, opts) => {
    const { width, height, output } = opts;

    if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
      console.error("Error: width and height must be positive numbers");
      process.exit(1);
    }

    if (output) {
      await mkdir(resolve(output), { recursive: true });
    }

    const errors = [];
    for (const file of files) {
      const outputPath = output
        ? join(resolve(output), basename(file))
        : resolve(file);
      try {
        await processSvg(resolve(file), width, height, outputPath);
      } catch (err) {
        console.error(`Error processing ${file}: ${err.message}`);
        errors.push(file);
      }
    }

    if (errors.length > 0) {
      console.error(`\nFailed to process ${errors.length} file(s).`);
      process.exit(1);
    }
  });

program.parse();
