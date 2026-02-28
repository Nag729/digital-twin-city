import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '..', 'src', 'assets', 'log-illustrations');
fs.mkdirSync(outDir, { recursive: true });

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const STYLE_BASE = `Paper Mario / Yoshi's Island style, paper craft cutout look, flat pastel colors, white outline, cute and charming, warm color palette. Screenshot-like illustration of a logistics app screen. Simple UI mockup with Japanese text, rounded corners, soft shadows. The illustration should look like a miniature app screenshot rendered in paper craft style.`;

const illustrations = [
  // Warehouse worker (a1) - ケンジ
  {
    file: 'inventory-check.png',
    prompt: `${STYLE_BASE} A cute paper craft mockup of a warehouse inventory management screen. Shows a list of items with quantities (38件), checkboxes, and a green "確認" button. Warm beige background with orange accents.`,
  },
  {
    file: 'location-login.png',
    prompt: `${STYLE_BASE} A cute paper craft mockup of a login screen for a warehouse location management system. Shows username/password fields, a mint green login button, and a small warehouse icon. Clean and simple.`,
  },
  {
    file: 'barcode-scan.png',
    prompt: `${STYLE_BASE} A cute paper craft illustration of scanning shelves in a warehouse. Shows a handheld scanner device pointing at boxes on shelves, with scan lines and a small success checkmark. Blue and orange accents.`,
  },
  {
    file: 'inventory-mismatch.png',
    prompt: `${STYLE_BASE} A cute paper craft mockup of an inventory screen showing a discrepancy. Two numbers side by side with a red warning triangle between them. Numbers don't match. Red and orange warning colors.`,
  },
  {
    file: 'bug-report-inventory.png',
    prompt: `${STYLE_BASE} A cute paper craft mockup of a bug report form. Shows a text field with Japanese text about inventory not updating, a red "BUG" badge, and a submit button. Warning yellow and red accents.`,
  },

  // Sort operator (a4) - サクラ
  {
    file: 'sort-list.png',
    prompt: `${STYLE_BASE} A cute paper craft mockup of a sorting task list screen showing 156 items. Colorful area codes as badges, a progress bar, and package icons. Pink and lavender accents.`,
  },
  {
    file: 'conveyor-scan.png',
    prompt: `${STYLE_BASE} A cute paper craft illustration of a conveyor belt with packages being scanned automatically. Packages have different colored labels, scanning beams shown as dotted lines. Pink accents.`,
  },
  {
    file: 'sort-order-issue.png',
    prompt: `${STYLE_BASE} A cute paper craft mockup of a sorting list with items in confusing order. Arrows showing the order is wrong, with a puzzled face emoji. A UX feedback bubble appears. Lavender accents.`,
  },

  // Delivery driver (a6) - エミリ
  {
    file: 'delivery-list.png',
    prompt: `${STYLE_BASE} A cute paper craft mockup of a delivery list screen showing 12 deliveries. Each row has an address, time slot, and status icon. Mint green checkmarks and progress indicators.`,
  },
  {
    file: 'route-optimization.png',
    prompt: `${STYLE_BASE} A cute paper craft illustration of a map with an optimized delivery route drawn as a colorful dotted line connecting multiple points. Buildings as tiny paper craft houses. Green route line.`,
  },
  {
    file: 'delivery-confirmation.png',
    prompt: `${STYLE_BASE} A cute paper craft mockup of a delivery confirmation screen. Shows "配送完了" with a big green checkmark, recipient name, and timestamp. Happy face icon. Mint green accents.`,
  },
  {
    file: 'redelivery-bug.png',
    prompt: `${STYLE_BASE} A cute paper craft mockup of a redelivery time selection screen showing a bug. Calendar UI where tomorrow's time slots are grayed out/missing, with a red error indicator. Red accents.`,
  },

  // Delivery driver (a7) - ジェームス
  {
    file: 'api-loading.png',
    prompt: `${STYLE_BASE} A cute paper craft mockup of a loading screen. A circular progress spinner that has been spinning for too long (showing 5+ seconds). Timer display and a frustrated face emoji. Orange accents.`,
  },

  // Delivery driver (a8) - ソフィア
  {
    file: 'weather-check.png',
    prompt: `${STYLE_BASE} A cute paper craft illustration of a weather forecast widget showing rain in the afternoon. Cloud and rain icons, temperature display, and an umbrella icon. Blue and gray accents.`,
  },
  {
    file: 'alert-missing.png',
    prompt: `${STYLE_BASE} A cute paper craft mockup of a delivery status screen where the delay alert is missing. Shows a delivery that's overdue but no warning notification appears. Gray/muted colors with a red question mark.`,
  },

  // Recipient (a10) - アイシャ
  {
    file: 'tracking-status.png',
    prompt: `${STYLE_BASE} A cute paper craft mockup of a package tracking screen. Shows a progress bar with steps: 発送 → 配送中 → 到着. The "配送中" step is highlighted. Sky blue and coral accents.`,
  },
  {
    file: 'confusing-notification.png',
    prompt: `${STYLE_BASE} A cute paper craft mockup of a push notification that's too technical. Shows a notification bubble with complex technical jargon in Japanese, and a confused face emoji below it. Orange warning accents.`,
  },
];

async function generateIllustration(item) {
  const outPath = path.join(outDir, item.file);
  if (fs.existsSync(outPath)) {
    console.log(`[skip] ${item.file} already exists`);
    return;
  }
  console.log(`[gen] ${item.file} ...`);
  try {
    const result = await client.images.generate({
      model: 'gpt-image-1',
      prompt: item.prompt,
      n: 1,
      size: '1024x1024',
      quality: 'medium',
    });

    const imageData = result.data[0].b64_json;
    const buffer = Buffer.from(imageData, 'base64');
    fs.writeFileSync(outPath, buffer);
    console.log(`[ok]  ${item.file} (${(buffer.length / 1024).toFixed(1)} KB)`);
  } catch (err) {
    console.error(`[err] ${item.file}: ${err.message}`);
  }
}

// Generate 3 at a time to avoid rate limits
async function main() {
  console.log(`Generating ${illustrations.length} log illustrations...`);
  const batchSize = 3;
  for (let i = 0; i < illustrations.length; i += batchSize) {
    const batch = illustrations.slice(i, i + batchSize);
    await Promise.all(batch.map(generateIllustration));
  }
  console.log('\nDone! Generated illustrations in:', outDir);
}

main();
