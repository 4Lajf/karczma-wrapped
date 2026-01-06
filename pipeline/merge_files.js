import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import StreamChain from 'stream-chain';
import StreamJson from 'stream-json';
import StreamArray from 'stream-json/streamers/StreamArray.js';
import Pick from 'stream-json/filters/Pick.js';

const { chain } = StreamChain;
const { parser } = StreamJson;
const { streamArray } = StreamArray;
const { pick } = Pick;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TO_MERGE_DIR = path.join(__dirname, 'to_merge');
const INPUT_DIR = path.join(__dirname, 'input');

/**
 * Extracts the ID from a filename
 * Example: "Fantastyczna Karczma - ╭── ADMIN ROOM ──╮ - dysputy [909153462569271348] (after 2025-01-01)"
 * Returns: "909153462569271348"
 */
function extractIdFromFilename(filename) {
  const idMatch = filename.match(/\[(\d+)\]/);
  return idMatch ? idMatch[1] : null;
}

/**
 * Finds a file in the input directory that matches the given ID
 */
function findFileById(inputDir, targetId) {
  const files = fs.readdirSync(inputDir);
  
  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    
    const fileId = extractIdFromFilename(file);
    if (fileId === targetId) {
      return path.join(inputDir, file);
    }
  }
  
  return null;
}

/**
 * Reads metadata (guild, channel, etc.) from the beginning of a JSON file
 */
async function readMetadata(filePath) {
  try {
    const buffer = Buffer.alloc(4096);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 4096, 0);
    fs.closeSync(fd);

    const content = buffer.toString('utf8');

    const guildMatch = content.match(/"guild"\s*:\s*{\s*"id"\s*:\s*"([^"]+)",\s*"name"\s*:\s*"([^"]+)"/);
    const channelMatch = content.match(/"channel"\s*:\s*{\s*"id"\s*:\s*"([^"]+)",\s*"name"\s*:\s*"([^"]+)"/);
    const exportedAtMatch = content.match(/"exportedAt"\s*:\s*"([^"]+)"/);
    const dateRangeMatch = content.match(/"dateRange"\s*:\s*({[^}]+})/);

    const metadata = {};
    
    if (guildMatch) {
      metadata.guild = { id: guildMatch[1], name: guildMatch[2] };
    }
    if (channelMatch) {
      metadata.channel = { id: channelMatch[1], name: channelMatch[2] };
    }
    if (exportedAtMatch) {
      metadata.exportedAt = exportedAtMatch[1];
    }
    if (dateRangeMatch) {
      try {
        metadata.dateRange = JSON.parse(dateRangeMatch[1]);
      } catch (e) {
        // Ignore parse errors
      }
    }

    return metadata;
  } catch (error) {
    console.error(`Error reading metadata from ${filePath}:`, error.message);
    return {};
  }
}

/**
 * Streams messages from a JSON file
 */
async function streamMessages(filePath) {
  return new Promise((resolve, reject) => {
    const messages = [];
    const messageIds = new Set();

    const pipeline = chain([
      fs.createReadStream(filePath),
      parser(),
      pick({ filter: 'messages' }),
      streamArray(),
    ]);

    pipeline.on('data', ({ value: msg }) => {
      // Deduplicate by message ID
      if (msg.id && !messageIds.has(msg.id)) {
        messageIds.add(msg.id);
        messages.push(msg);
      } else if (!msg.id) {
        // Keep messages without IDs (shouldn't happen but be safe)
        messages.push(msg);
      }
    });

    pipeline.on('end', () => resolve(messages));
    pipeline.on('error', (err) => reject(err));
  });
}

/**
 * Merges messages from source into target, sorting by timestamp
 */
function mergeMessages(targetMessages, sourceMessages) {
  // Combine arrays
  const combined = [...targetMessages, ...sourceMessages];
  
  // Sort by timestamp (oldest first)
  combined.sort((a, b) => {
    const timeA = new Date(a.timestamp || 0).getTime();
    const timeB = new Date(b.timestamp || 0).getTime();
    return timeA - timeB;
  });
  
  // Remove duplicates based on message ID (should already be done, but double-check)
  const seen = new Set();
  const unique = [];
  for (const msg of combined) {
    if (msg.id && !seen.has(msg.id)) {
      seen.add(msg.id);
      unique.push(msg);
    } else if (!msg.id) {
      // Keep messages without IDs (shouldn't happen but be safe)
      unique.push(msg);
    }
  }
  
  return unique;
}

/**
 * Writes a JSON file with metadata and messages using streaming
 */
async function writeJsonFileStreaming(filePath, metadata, messages) {
  return new Promise((resolve, reject) => {
    const outputStream = fs.createWriteStream(filePath);
    
    // Write header
    outputStream.write('{\n');
    
    // Write guild
    if (metadata.guild) {
      outputStream.write(`  "guild": ${JSON.stringify(metadata.guild)},\n`);
    }
    
    // Write channel
    if (metadata.channel) {
      outputStream.write(`  "channel": ${JSON.stringify(metadata.channel)},\n`);
    }
    
    // Write dateRange
    if (metadata.dateRange) {
      outputStream.write(`  "dateRange": ${JSON.stringify(metadata.dateRange)},\n`);
    }
    
    // Write exportedAt
    if (metadata.exportedAt) {
      outputStream.write(`  "exportedAt": ${JSON.stringify(metadata.exportedAt)},\n`);
    }
    
    // Write messages array start
    outputStream.write(`  "messages": [\n`);
    
    let isFirstMessage = true;
    let writtenCount = 0;
    
    // Write messages
    for (const msg of messages) {
      if (!isFirstMessage) {
        outputStream.write(',\n');
      } else {
        isFirstMessage = false;
      }
      
      outputStream.write('    ' + JSON.stringify(msg));
      writtenCount++;
    }
    
    // Write footer
    outputStream.write(`\n  ],\n`);
    outputStream.write(`  "messageCount": ${writtenCount}\n`);
    outputStream.write('}');
    
    outputStream.end();
    outputStream.on('finish', () => resolve());
    outputStream.on('error', (err) => reject(err));
  });
}

/**
 * Main merge function
 */
async function mergeFiles() {
  console.log('Starting file merge process...');
  console.log(`Source directory: ${TO_MERGE_DIR}`);
  console.log(`Target directory: ${INPUT_DIR}`);
  
  // Check if directories exist
  if (!fs.existsSync(TO_MERGE_DIR)) {
    console.error(`Error: Directory ${TO_MERGE_DIR} does not exist.`);
    return;
  }
  
  if (!fs.existsSync(INPUT_DIR)) {
    console.error(`Error: Directory ${INPUT_DIR} does not exist.`);
    return;
  }
  
  // Get all files from to_merge directory
  const filesToMerge = fs.readdirSync(TO_MERGE_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => path.join(TO_MERGE_DIR, f));
  
  console.log(`Found ${filesToMerge.length} files to merge.`);
  
  if (filesToMerge.length === 0) {
    console.log('No files found in to_merge directory.');
    return;
  }
  
  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;
  
  for (const sourceFile of filesToMerge) {
    const filename = path.basename(sourceFile);
    console.log(`\nProcessing: ${filename}`);
    
    try {
      // Extract ID from source filename
      const sourceId = extractIdFromFilename(filename);
      if (!sourceId) {
        console.warn(`  ⚠️  Could not extract ID from filename: ${filename}`);
        skippedCount++;
        continue;
      }
      
      console.log(`  ID: ${sourceId}`);
      
      // Find matching file in input directory
      const targetFile = findFileById(INPUT_DIR, sourceId);
      if (!targetFile) {
        console.warn(`  ⚠️  No matching file found in input directory for ID: ${sourceId}`);
        skippedCount++;
        continue;
      }
      
      console.log(`  Target: ${path.basename(targetFile)}`);
      
      // Read metadata from both files
      console.log(`  Reading metadata...`);
      const sourceMetadata = await readMetadata(sourceFile);
      const targetMetadata = await readMetadata(targetFile);
      
      // Stream messages from both files
      console.log(`  Streaming messages from source file...`);
      const sourceMessages = await streamMessages(sourceFile);
      console.log(`  Source messages: ${sourceMessages.length}`);
      
      console.log(`  Streaming messages from target file...`);
      const targetMessages = await streamMessages(targetFile);
      console.log(`  Target messages: ${targetMessages.length}`);
      
      // Merge messages
      console.log(`  Merging and sorting messages...`);
      const mergedMessages = mergeMessages(targetMessages, sourceMessages);
      console.log(`  Merged messages: ${mergedMessages.length}`);
      
      // Merge metadata (prefer target, but update exportedAt if source is newer)
      const finalMetadata = { ...targetMetadata };
      if (sourceMetadata.exportedAt && targetMetadata.exportedAt) {
        const sourceTime = new Date(sourceMetadata.exportedAt);
        const targetTime = new Date(targetMetadata.exportedAt);
        if (sourceTime > targetTime) {
          finalMetadata.exportedAt = sourceMetadata.exportedAt;
        }
      } else if (sourceMetadata.exportedAt && !targetMetadata.exportedAt) {
        finalMetadata.exportedAt = sourceMetadata.exportedAt;
      }
      
      // Write merged data back to target file using streaming
      console.log(`  Writing merged file...`);
      await writeJsonFileStreaming(targetFile, finalMetadata, mergedMessages);
      console.log(`  ✅ Successfully merged into ${path.basename(targetFile)}`);
      successCount++;
    } catch (error) {
      console.error(`  ❌ Error processing ${filename}:`, error.message);
      errorCount++;
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('Merge Summary:');
  console.log(`  ✅ Successfully merged: ${successCount}`);
  console.log(`  ⚠️  Skipped: ${skippedCount}`);
  console.log(`  ❌ Errors: ${errorCount}`);
  console.log('='.repeat(50));
}

// Run the merge
mergeFiles().catch(console.error);

