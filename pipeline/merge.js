import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';
import StreamChain from 'stream-chain';
import StreamJson from 'stream-json';
import StreamArray from 'stream-json/streamers/StreamArray.js';
import Pick from 'stream-json/filters/Pick.js';

const { chain } = StreamChain;
const { parser } = StreamJson;
const { streamArray } = StreamArray;
const { pick } = Pick;

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUT_DIR = path.join(__dirname, 'input');
const OUTPUT_FILE = path.join(__dirname, 'merged-output.json');

function parseFilename(filePath) {
  const filename = path.basename(filePath, path.extname(filePath));
  // Pattern: "Guild - Channel [ID]" or "Guild - Category - Channel [ID]"
  // Example: "Fantastyczna Karczma - ╭──HOBBYSTYCZNY BAR──╮ - fantastyczny-burdel🍯 [1130865669429264456] (2025...)"

  // Extract ID first: [123456...]
  const idMatch = filename.match(/\[(\d+)\]/);
  if (!idMatch) return null;

  const id = idMatch[1];

  // Everything before the ID section
  const preId = filename.substring(0, idMatch.index).trim();

  // Split by ' - '
  const parts = preId.split(' - ');

  let guildName = 'Unknown Guild';
  let channelName = 'Unknown Channel';

  if (parts.length >= 2) {
    guildName = parts[0].trim();
    channelName = parts[parts.length - 1].trim(); // Take the last part as channel
  } else if (parts.length === 1) {
    channelName = parts[0].trim();
  }

  return {
    guild: { id: '000000000', name: guildName }, // ID is unknown from filename usually
    channel: { id, name: channelName }
  };
}

// Helper to read metadata (Guild/Channel) from file start
async function readMetadata(filePath) {
  try {
    const buffer = Buffer.alloc(4096);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 4096, 0);
    fs.closeSync(fd);

    const content = buffer.toString('utf8');

    const guildMatch = content.match(/"guild"\s*:\s*{\s*"id"\s*:\s*"([^"]+)",\s*"name"\s*:\s*"([^"]+)"/);
    const channelMatch = content.match(/"channel"\s*:\s*{\s*"id"\s*:\s*"([^"]+)",\s*"name"\s*:\s*"([^"]+)"/);

    if (guildMatch && channelMatch) {
      return {
        guild: { id: guildMatch[1], name: guildMatch[2] },
        channel: { id: channelMatch[1], name: channelMatch[2] }
      };
    }
  } catch (e) {
    // Ignore read errors, fallback to filename
  }

  // Fallback to filename parsing
  const filenameMeta = parseFilename(filePath);
  if (filenameMeta) return filenameMeta;

  return { guild: null, channel: null };
}

async function mergeFiles() {
  console.log('Starting merge process...');

  // Use fs.readdir + filter instead of glob for robustness with special chars
  const allFiles = fs.readdirSync(INPUT_DIR);
  const files = allFiles
    .filter(f => f.endsWith('.json'))
    .map(f => path.join(INPUT_DIR, f));

  console.log(`Found ${files.length} files to merge.`);

  if (files.length === 0) {
    console.log('No files found.');
    return;
  }

  // Get Guild Info from first file or its filename
  let firstMeta = await readMetadata(files[0]);
  if (!firstMeta.guild) {
    console.warn('Could not read guild metadata from first file content. Using filename...');
    // If filename gave us guild name but generic ID, we accept it for now.
  }

  // If absolutely no guild info, provide defaults
  if (!firstMeta.guild) {
    firstMeta = {
      guild: { id: '000000000', name: 'Unknown Guild' },
      channel: null
    };
  }

  const outputStream = fs.createWriteStream(OUTPUT_FILE);

  // Write Header
  const header = {
    meta: {
      generatedAt: new Date().toISOString(),
      tool: 'karczma-wrapped-merger'
    },
    guild: firstMeta.guild,
    messages: [] // We will write the opening bracket manually
  };

  // Write JSON structure up to the messages array start
  outputStream.write(`{\n  "meta": ${JSON.stringify(header.meta)},\n  "guild": ${JSON.stringify(header.guild)},\n  "messages": [\n`);

  let totalMessages = 0;
  let isFirstMessage = true;

  for (const file of files) {
    console.log(`Merging ${path.basename(file)}...`);
    const meta = await readMetadata(file);
    const channelInfo = meta.channel || { id: 'unknown', name: 'unknown' };

    await new Promise((resolve, reject) => {
      const pipeline = chain([
        fs.createReadStream(file),
        parser(),
        pick({ filter: 'messages' }), // This might fail if JSON is just an array
        streamArray(),
      ]);

      // Handle array-only JSON files
      // If pick('messages') finds nothing, stream-json won't emit data.
      // We need a fallback if the file is just an array.
      // But 'parser' + 'streamArray' handles arrays at root too.
      // 'pick' is the filter.
      // If we remove 'pick' and just use 'streamArray', it will stream array items found anywhere.
      // If the file is { messages: [...] }, streamArray will stream items of 'messages'.
      // If the file is [...], streamArray will stream items of root.
      // BUT streamArray usually expects to be attached to a specific path if using with/without pick?
      // Actually streamArray() works by looking for the first array it encounters.

      // Let's make robust: try standard approach. If it fails or emits nothing?
      // Actually, if we use `pick({ filter: 'messages' })` on an array root file, it emits nothing.
      // We should detect format.
      // Or just use streamArray() without pick? 
      // If we use streamArray() on { messages: [...] }, does it work?
      // streamArray documentation: "The stream-json/streamers/StreamArray consumes a stream of tokens... and emits objects... It assumes that the input stream represents an array."
      // If input is Object { messages: [] }, streamArray will NOT find the array automatically unless we use pick/filter to select it?
      // Wait, streamArray scans for an array. 
      // "If the input is an object, it will look for an array value." -> No, usually it expects the stream to BE the array or we guide it.

      // Safer approach: Check file start character.
      // If starts with '[', it's an array. Use parser() -> streamArray().
      // If starts with '{', it's an object. Use parser() -> pick('messages') -> streamArray().

      // Read first non-whitespace char
      // For now, let's assume the previous pick logic is fine for the standard export format the user described.
      // The user asked to handle filenames, which implies metadata issues, not necessarily JSON structure issues.
      // But let's stick to the current pipeline logic which works for standard exports.

      // Wait, if I'm merging files, I shouldn't change the pipeline logic drastically unless asked.
      // The filename request was specific.

      pipeline.on('data', ({ value: msg }) => {
        // Inject Channel Info
        msg.channel = {
          id: channelInfo.id,
          name: channelInfo.name
        };

        // Comma handling
        if (!isFirstMessage) {
          outputStream.write(',\n');
        } else {
          isFirstMessage = false;
        }

        // Write message
        const canContinue = outputStream.write(JSON.stringify(msg));
        if (!canContinue) {
          // Backpressure ignored for local file write simplicity
        }

        totalMessages++;
      });

      pipeline.on('end', () => resolve());
      pipeline.on('error', (err) => reject(err));
    });
  }

  // Write Footer
  outputStream.write('\n  ]\n}');
  outputStream.end();

  console.log(`\nMerge complete!`);
  console.log(`Total messages: ${totalMessages}`);
  console.log(`Output: ${OUTPUT_FILE}`);
}

mergeFiles().catch(console.error);
