import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '..', 'src', 'assets', 'sprites');
fs.mkdirSync(outDir, { recursive: true });

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const STYLE_BASE = `Paper Mario / Yoshi's Island style, paper craft cutout, flat colors, white outline, cute and charming, pastel colors, transparent background, isometric view, game sprite, 64x64 pixel art style but smooth`;

const sprites = [
  {
    file: 'truck-moving.png',
    prompt: `${STYLE_BASE}. A cute small delivery truck driving, mint green color, round and chubby shape, tiny wheels, happy face on the front, motion lines`,
  },
  {
    file: 'truck-stopped.png',
    prompt: `${STYLE_BASE}. A cute small delivery truck parked, mint green color, round and chubby shape, tiny wheels, sleeping/resting`,
  },
  {
    file: 'worker-walking.png',
    prompt: `${STYLE_BASE}. A cute tiny warehouse worker character walking, orange hard hat, blue overalls, round body, simple limbs, cheerful`,
  },
  {
    file: 'worker-working.png',
    prompt: `${STYLE_BASE}. A cute tiny warehouse worker character holding a box, orange hard hat, blue overalls, round body, working hard`,
  },
  {
    file: 'sorter-walking.png',
    prompt: `${STYLE_BASE}. A cute tiny sorting staff character walking, pink apron, round body, carrying a clipboard, cheerful expression`,
  },
  {
    file: 'sorter-working.png',
    prompt: `${STYLE_BASE}. A cute tiny sorting staff character sorting packages, pink apron, round body, focused expression, packages around`,
  },
  {
    file: 'recipient-waiting.png',
    prompt: `${STYLE_BASE}. A cute tiny person waiting for delivery, sky blue shirt, waving hand, round body, excited expression`,
  },
  {
    file: 'recipient-receiving.png',
    prompt: `${STYLE_BASE}. A cute tiny person receiving a package happily, sky blue shirt, holding a box, round body, joyful expression`,
  },
  {
    file: 'building-warehouse.png',
    prompt: `${STYLE_BASE}. A cute large warehouse building, cream/beige walls, red/orange roof, wide rectangular shape, small windows, loading dock, isometric view, paper craft texture`,
  },
  {
    file: 'building-sort-center.png',
    prompt: `${STYLE_BASE}. A cute sorting center building, lavender/light purple walls, conveyor belt decoration, medium sized, isometric view, paper craft texture`,
  },
  {
    file: 'building-delivery-hub.png',
    prompt: `${STYLE_BASE}. A cute delivery hub building, mint green walls, garage doors, truck bays, medium sized, isometric view, paper craft texture`,
  },
  {
    file: 'building-receive-station.png',
    prompt: `${STYLE_BASE}. A cute small receive station building, coral pink walls, mailbox style, small and charming, isometric view, paper craft texture`,
  },
];

async function generateSprite(sprite) {
  const outPath = path.join(outDir, sprite.file);
  if (fs.existsSync(outPath)) {
    console.log(`[skip] ${sprite.file} already exists`);
    return;
  }
  console.log(`[gen] ${sprite.file} ...`);
  try {
    const result = await client.images.generate({
      model: 'gpt-image-1',
      prompt: sprite.prompt,
      n: 1,
      size: '1024x1024',
      background: 'transparent',
      quality: 'medium',
    });

    const imageData = result.data[0].b64_json;
    const buffer = Buffer.from(imageData, 'base64');
    fs.writeFileSync(outPath, buffer);
    console.log(`[ok]  ${sprite.file} (${(buffer.length / 1024).toFixed(1)} KB)`);
  } catch (err) {
    console.error(`[err] ${sprite.file}: ${err.message}`);
  }
}

// Generate 3 at a time to avoid rate limits
async function main() {
  const batchSize = 3;
  for (let i = 0; i < sprites.length; i += batchSize) {
    const batch = sprites.slice(i, i + batchSize);
    await Promise.all(batch.map(generateSprite));
  }
  console.log('\nDone! Generated sprites in:', outDir);
}

main();
