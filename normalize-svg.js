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

async function processSvg(inputPath, targetWidth, targetHeight, outputPath) {
  const raw = await readFile(inputPath, "utf-8");

  // Parse existing viewBox
  const vb = parseViewBox(raw);
  if (!vb || vb.width === 0 || vb.height === 0) {
    console.error(`Skipping ${inputPath}: no valid viewBox found`);
    return;
  }

  // Compute scale factors
  const scaleX = targetWidth / vb.width;
  const scaleY = targetHeight / vb.height;

  // Scale the SVG content. scale-that-svg scales path d data and viewBox
  // width/height, but leaves the viewBox origin untouched. We need to scale
  // the origin ourselves to keep paths aligned with the viewBox window.
  const scaled = await scale(raw, { scale: scaleX, scaleY });

  // Set final viewBox: scale the origin to match the scaled path coordinates,
  // preserving the relationship between viewBox window and content.
  const scaledMinX = vb.minX * scaleX;
  const scaledMinY = vb.minY * scaleY;
  const result = setViewBox(scaled, scaledMinX, scaledMinY, targetWidth, targetHeight);

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
