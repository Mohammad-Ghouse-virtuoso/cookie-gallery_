#!/usr/bin/env node

/**
 * Image Optimization Script
 * Converts and compresses images to WebP format
 * Generates responsive sizes for better performance
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ASSETS_DIR = path.join(__dirname, '../src/assets');
const OUTPUT_DIR = path.join(__dirname, '../public/images/optimized');

// Image size configurations
const SIZES = {
  thumbnail: 150,
  small: 300,
  medium: 600,
  large: 1200
};

const QUALITY = {
  webp: 80,
  jpeg: 85
};

async function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function optimizeImage(inputPath, outputBaseName) {
  const stats = fs.statSync(inputPath);
  const originalSizeKB = (stats.size / 1024).toFixed(2);
  
  console.log(`\n📸 Processing: ${path.basename(inputPath)} (${originalSizeKB}KB)`);
  
  const results = [];
  
  // Generate multiple sizes
  for (const [sizeName, width] of Object.entries(SIZES)) {
    const outputPath = path.join(OUTPUT_DIR, `${outputBaseName}-${sizeName}.webp`);
    
    try {
      await sharp(inputPath)
        .resize(width, width, {
          fit: 'cover',
          position: 'center'
        })
        .webp({ quality: QUALITY.webp, effort: 6 })
        .toFile(outputPath);
      
      const newStats = fs.statSync(outputPath);
      const newSizeKB = (newStats.size / 1024).toFixed(2);
      const savings = ((1 - newStats.size / stats.size) * 100).toFixed(1);
      
      results.push({
        size: sizeName,
        originalKB: originalSizeKB,
        newKB: newSizeKB,
        savings: savings
      });
      
      console.log(`  ✓ ${sizeName.padEnd(10)} → ${newSizeKB.padStart(6)}KB (${savings}% smaller)`);
    } catch (error) {
      console.error(`  ✗ Failed to process ${sizeName}:`, error.message);
    }
  }
  
  return results;
}

async function findImages(dir) {
  const images = [];
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isFile() && /\.(jpg|jpeg|png)$/i.test(file)) {
      images.push(filePath);
    }
  }
  
  return images;
}

async function main() {
  console.log('🚀 Cookie Gallery Image Optimizer\n');
  console.log('================================\n');
  
  await ensureDir(OUTPUT_DIR);
  
  const images = await findImages(ASSETS_DIR);
  console.log(`Found ${images.length} images to optimize\n`);
  
  let totalOriginal = 0;
  let totalOptimized = 0;
  
  for (const imagePath of images) {
    const baseName = path.basename(imagePath, path.extname(imagePath))
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-');
    
    const results = await optimizeImage(imagePath, baseName);
    
    if (results.length > 0) {
      const originalSize = parseFloat(results[0].originalKB);
      const optimizedSize = results.reduce((sum, r) => sum + parseFloat(r.newKB), 0);
      
      totalOriginal += originalSize;
      totalOptimized += optimizedSize;
    }
  }
  
  console.log('\n================================');
  console.log('📊 Summary');
  console.log('================================');
  console.log(`Original total: ${totalOriginal.toFixed(2)}KB`);
  console.log(`Optimized total: ${totalOptimized.toFixed(2)}KB`);
  console.log(`Total savings: ${((1 - totalOptimized / totalOriginal) * 100).toFixed(1)}%`);
  console.log('\n✨ Optimization complete!');
}

main().catch(console.error);
