import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import StreamChain from 'stream-chain';
import StreamJson from 'stream-json';
import StreamArray from 'stream-json/streamers/StreamArray.js';
import Pick from 'stream-json/filters/Pick.js';
import dayjs from 'dayjs';
import { db, initDB } from './db.js';

const { chain } = StreamChain;
const { parser } = StreamJson;
const { streamArray } = StreamArray;
const { pick } = Pick;

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUT_DIR = path.join(__dirname, 'input');

// Prepared Statements for Speed
const stmts = {
  insertMeta: null,
  upsertChannel: null,
  upsertUser: null,
  insertMessage: null,
  insertMention: null,
  insertReaction: null,
  checkFile: null,
  markFile: null,
};

function prepareStatements() {
  stmts.upsertChannel = db.prepare(`
        INSERT INTO channels (id, name, category_name, type, guild_id, guild_name) VALUES (@id, @name, @categoryName, @type, @guildId, @guildName)
        ON CONFLICT(id) DO UPDATE SET 
            name=excluded.name, 
            category_name=excluded.category_name,
            type=excluded.type,
            message_count=message_count+1
    `);

  stmts.upsertUser = db.prepare(`
        INSERT INTO users (id, name, discriminator, nickname, avatar_url, roles, is_bot) 
        VALUES (@id, @name, @discriminator, @nickname, @avatarUrl, @roles, @isBot)
        ON CONFLICT(id) DO UPDATE SET 
            name=excluded.name, 
            nickname=excluded.nickname, 
            avatar_url=excluded.avatar_url,
            roles=excluded.roles
    `);

  stmts.insertMessage = db.prepare(`
        INSERT INTO messages (id, channel_id, author_id, content, timestamp, timestamp_edited, type, is_pinned, reply_to_msg_id, word_count, char_count, has_attachments, attachment_types, attachment_urls)
        VALUES (@id, @channelId, @authorId, @content, @timestamp, @timestampEdited, @type, @isPinned, @replyToMsgId, @wordCount, @charCount, @hasAttachments, @attachmentTypes, @attachmentUrls)
        ON CONFLICT(id) DO UPDATE SET
            channel_id=excluded.channel_id,
            content=excluded.content,
            has_attachments=excluded.has_attachments,
            attachment_types=excluded.attachment_types,
            attachment_urls=excluded.attachment_urls
    `);

  stmts.insertMention = db.prepare(`
        INSERT OR IGNORE INTO mentions (message_id, mentioned_user_id)
        VALUES (@messageId, @mentionedUserId)
    `);

  stmts.insertReaction = db.prepare(`
        INSERT OR IGNORE INTO reactions (message_id, emoji_id, emoji_name, user_id, count)
        VALUES (@messageId, @emojiId, @emojiName, @userId, @count)
    `);

  stmts.checkFile = db.prepare('SELECT 1 FROM processed_files WHERE filename = ?');
  stmts.markFile = db.prepare('INSERT INTO processed_files (filename, processed_at) VALUES (?, ?)');
}

function parseFilename(filePath) {
  const filename = path.basename(filePath, path.extname(filePath));
  // Pattern: "Guild - Category - Channel [ID]..."
  const idMatch = filename.match(/\[(\d+)\]/);
  if (!idMatch) return { guild: { id: '0', name: 'Unknown' }, channel: { id: '0', name: filename } };

  const id = idMatch[1];
  const preId = filename.substring(0, idMatch.index).trim();
  const parts = preId.split(' - ');

  let guildName = 'Unknown Guild';
  let channelName = 'Unknown Channel';

  if (parts.length >= 2) {
    guildName = parts[0].trim();
    channelName = parts[parts.length - 1].trim();
  } else if (parts.length === 1) {
    channelName = parts[0].trim();
  }

  return {
    guild: { id: '0', name: guildName }, // ID is typically not in filename
    channel: { id, name: channelName }
  };
}

// Helper to read header metadata
function readHeaderMetadata(filePath) {
  const fd = fs.openSync(filePath, 'r');
  const buffer = Buffer.alloc(4096); // Read 4KB
  fs.readSync(fd, buffer, 0, 4096, 0);
  fs.closeSync(fd);
  const content = buffer.toString('utf8');

  // Extract channel object (simple regex, robust for pretty-printed JSON)
  const channelMatch = content.match(/"channel":\s*({[^}]+})/);
  const guildMatch = content.match(/"guild":\s*({[^}]+})/);

  let channel = null;
  let guild = null;

  try {
    if (channelMatch) channel = JSON.parse(channelMatch[1]);
    if (guildMatch) guild = JSON.parse(guildMatch[1]);
  } catch (e) {
    console.log('Error parsing header metadata:', e.message);
  }

  return { channel, guild };
}

async function processFile(filePath) {
  const filename = path.basename(filePath);
  if (stmts.checkFile.get(filename)) {
    console.log(`Skipping ${filename} (already processed)`);
    return;
  }

  console.log(`Processing ${filename}...`);
  const fileStats = fs.statSync(filePath);
  const fileSize = fileStats.size;
  let bytesRead = 0;

  const fileMeta = parseFilename(filePath);
  const headerMeta = readHeaderMetadata(filePath);

  // Merge metadata (Header takes precedence)
  const channelId = headerMeta.channel?.id || fileMeta.channel.id;
  const channelName = headerMeta.channel?.name || fileMeta.channel.name;
  const categoryName = headerMeta.channel?.category || 'Unknown';
  const channelType = headerMeta.channel?.type || 'GuildText';
  const guildId = headerMeta.guild?.id || '0';
  const guildName = headerMeta.guild?.name || fileMeta.guild.name;

  return new Promise((resolve, reject) => {
    // Transaction batching
    const BATCH_SIZE = 1000;
    let batch = [];

    const commitBatch = db.transaction((messages) => {
      for (const msg of messages) {
        // Ensure Channel Exists
        stmts.upsertChannel.run({
          id: channelId,
          name: channelName,
          categoryName: categoryName,
          type: channelType,
          guildId: guildId,
          guildName: guildName
        });

        // Ensure Author Exists
        stmts.upsertUser.run({
          id: msg.author.id,
          name: msg.author.name,
          discriminator: msg.author.discriminator || '0000',
          nickname: msg.author.nickname || null,
          avatarUrl: msg.author.avatarUrl || null,
          roles: JSON.stringify(msg.author.roles || []),
          isBot: msg.author.isBot ? 1 : 0
        });

        // Parse Reference
        let replyToMsgId = null;
        if (msg.reference && msg.reference.messageId) {
          replyToMsgId = msg.reference.messageId;
        }

        // Insert Message
        const content = msg.content || '';
        const attachmentTypes = (msg.attachments || []).map(a => {
          if (a.contentType) return a.contentType.split('/')[0];
          const ext = path.extname(a.fileName || a.url || '').toLowerCase();
          if (['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext)) return 'image';
          if (['.mp4', '.mov', '.webm'].includes(ext)) return 'video';
          if (['.mp3', '.wav', '.ogg'].includes(ext)) return 'audio';
          return 'file';
        }).join(',');

        const attachmentUrls = (msg.attachments || []).map(a => ({
          url: a.url,
          name: a.fileName,
          type: a.contentType ? a.contentType.split('/')[0] : 'file'
        }));

        stmts.insertMessage.run({
          id: msg.id,
          channelId: channelId,
          authorId: msg.author.id,
          content: content,
          timestamp: msg.timestamp,
          timestampEdited: msg.timestampEdited || null,
          type: msg.type,
          isPinned: msg.isPinned ? 1 : 0,
          replyToMsgId: replyToMsgId,
          wordCount: content.split(/\s+/).filter(w => w.length > 0).length,
          charCount: content.length,
          hasAttachments: (msg.attachments && msg.attachments.length > 0) ? 1 : 0,
          attachmentTypes: attachmentTypes,
          attachmentUrls: JSON.stringify(attachmentUrls)
        });

        // Mentions
        for (const mention of msg.mentions) {
          // Ensure mentioned user exists (stub)
          // We might not have full profile for mentioned user if they haven't spoken, 
          // but usually mention object has basic info.
          stmts.upsertUser.run({
            id: mention.id,
            name: mention.name,
            discriminator: mention.discriminator || '0000',
            nickname: mention.nickname || null,
            avatarUrl: mention.avatarUrl || null,
            roles: JSON.stringify(mention.roles || []),
            isBot: mention.isBot ? 1 : 0
          });

          stmts.insertMention.run({
            messageId: msg.id,
            mentionedUserId: mention.id
          });
        }

        // Reactions
        for (const reaction of msg.reactions) {
          // Reaction object has "users": [ ... ]
          for (const user of reaction.users) {
            // Ensure reacting user exists
            stmts.upsertUser.run({
              id: user.id,
              name: user.name,
              discriminator: user.discriminator || '0000',
              nickname: user.nickname || null,
              avatarUrl: user.avatarUrl || null,
              roles: JSON.stringify(user.roles || []),
              isBot: user.isBot ? 1 : 0
            });

            stmts.insertReaction.run({
              messageId: msg.id,
              emojiId: reaction.emoji.id, // Null for unicode
              emojiName: reaction.emoji.name,
              userId: user.id,
              count: 1 // Individual user reaction
            });
          }
        }
      }
    });

    const pipeline = chain([
      fs.createReadStream(filePath),
      // Track progress
      (data) => {
        if (Buffer.isBuffer(data)) bytesRead += data.length;
        else if (typeof data === 'string') bytesRead += data.length;
        return data;
      },
      parser(),
      pick({ filter: 'messages' }),
      streamArray(),
    ]);

    let lastProgress = 0;

    pipeline.on('data', ({ value: msg }) => {
      batch.push(msg);
      if (batch.length >= BATCH_SIZE) {
        commitBatch(batch);
        batch = [];

        // Log progress
        const progress = Math.floor((bytesRead / fileSize) * 100);
        if (progress > lastProgress) { // Log every 5%
          console.log(`${filename}: ${progress}% processed...`);
          lastProgress = progress;
        }
      }
    });

    pipeline.on('end', () => {
      if (batch.length > 0) commitBatch(batch);
      stmts.markFile.run(filename, new Date().toISOString());
      console.log(`${filename}: 100% Done.`);
      resolve();
    });

    pipeline.on('error', (err) => reject(err));
  });
}

async function main() {
  initDB();
  prepareStatements();

  // Get all JSON files
  const allFiles = fs.readdirSync(INPUT_DIR).filter(f => f.endsWith('.json'));
  console.log(`Found ${allFiles.length} files.`);

  for (const file of allFiles) {
    await processFile(path.join(INPUT_DIR, file));
  }

  console.log('Ingestion complete.');
}

main().catch(console.error);

