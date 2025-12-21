import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import getStem from 'stemmer_pl';
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

// Paths relative to this file
const DB_PATH = path.join(__dirname, 'karczma.db');
const OUTPUT_FILE = path.join(__dirname, '..', 'static', 'wrap-2025.json');
const EMOJI_DIR = path.join(__dirname, '..', 'static', 'emojis');
const TARGET_YEAR = 2025;

const db = new Database(DB_PATH, { readonly: false });

// Ensure emoji directory exists
if (!fs.existsSync(EMOJI_DIR)) {
  fs.mkdirSync(EMOJI_DIR, { recursive: true });
}

function downloadEmoji(id) {
  if (!id) return;
  const dest = path.join(EMOJI_DIR, `${id}.png`);
  if (fs.existsSync(dest)) return;

  // Try PNG first, then GIF if it's likely animated
  const url = `https://cdn.discordapp.com/emojis/${id}.png`;
  const file = fs.createWriteStream(dest);

  https.get(url, (response) => {
    if (response.statusCode === 200) {
      response.pipe(file);
    } else {
      file.close();
      fs.unlink(dest, () => { }); // Delete if failed

      // If 404, maybe it's a GIF?
      if (response.statusCode === 404) {
        const gifDest = path.join(EMOJI_DIR, `${id}.gif`);
        if (fs.existsSync(gifDest)) return;

        const gifUrl = `https://cdn.discordapp.com/emojis/${id}.gif`;
        const gifFile = fs.createWriteStream(gifDest);
        https.get(gifUrl, (res) => {
          if (res.statusCode === 200) {
            res.pipe(gifFile);
          } else {
            gifFile.close();
            fs.unlink(gifDest, () => { });
          }
        });
      }
    }
  }).on('error', (err) => {
    fs.unlink(dest, () => { });
  });
}

// Create indexes for better performance (if they don't exist)
console.log('Checking database indexes...');
try {
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_messages_author_year ON messages(author_id, timestamp);
    CREATE INDEX IF NOT EXISTS idx_messages_channel_time ON messages(channel_id, timestamp);
    CREATE INDEX IF NOT EXISTS idx_mentions_user_year ON mentions(mentioned_user_id);
    CREATE INDEX IF NOT EXISTS idx_reactions_user ON reactions(user_id);
    CREATE INDEX IF NOT EXISTS idx_reactions_message ON reactions(message_id);
  `);
  console.log('Indexes ready.\n');
} catch (err) {
  console.log('Index creation skipped (may already exist).\n');
}

const STOPWORDS = new Set([
  'a', 'aby', 'ach', 'acz', 'aczkolwiek', 'aj', 'albo', 'ale', 'alez', 'aleź', 'ani', 'az', 'aż', 'bardziej', 'bardzo', 'beda', 'bedzie', 'bez', 'deda', 'będą', 'bede', 'będę', 'będzie', 'bo', 'bowiem', 'by', 'byc', 'być', 'byl', 'byla', 'byli', 'bylo', 'byly', 'był', 'była', 'było', 'były', 'bynajmniej', 'caly', 'cały', 'ci', 'cie', 'ciebie', 'ciat', 'co', 'cokolwiek', 'cos', 'coś', 'czasami', 'czasem', 'czemu', 'czy', 'czyli', 'daleko', 'dla', 'dlaczego', 'dlatego', 'do', 'dobrze', 'dokad', 'dokąd', 'dosc', 'dość', 'duzo', 'dużo', 'dwa', 'dwaj', 'dwie', 'dwoje', 'dzis', 'dzisiaj', 'dziś', 'dy', 'gdy', 'gdyby', 'gdyz', 'gdyż', 'gdzie', 'gdziekolwiek', 'gdzies', 'gdzieś', 'go', 'i', 'ich', 'ile', 'im', 'inna', 'inne', 'inny', 'innych', 'iz', 'iż', 'ja', 'jak', 'jakas', 'jakaś', 'jakby', 'jaki', 'jakichs', 'jakichś', 'jakie', 'jakis', 'jakiś', 'jako', 'jakos', 'jakoś', 'je', 'jeden', 'jedna', 'jedno', 'jednak', 'jednakze', 'jednakże', 'jego', 'jej', 'jemu', 'jest', 'jestem', 'jeszcze', 'jesli', 'jeśli', 'jezeli', 'jeżeli', 'juz', 'już', 'kazdy', 'każdy', 'kiedy', 'kilka', 'kims', 'kimś', 'kto', 'ktokolwiek', 'ktora', 'ktore', 'ktorego', 'ktorej', 'ktory', 'ktorych', 'ktorym', 'ktorzy', 'ktos', 'ktoś', 'która', 'które', 'którego', 'której', 'który', 'których', 'którym', 'którzy', 'ku', 'lat', 'lecz', 'lub', 'ma', 'mają', 'mało', 'mam', 'mi', 'miedzy', 'między', 'mimo', 'mna', 'mną', 'mnie', 'moga', 'mogą', 'moi', 'moim', 'moj', 'moja', 'moje', 'moze', 'może', 'mozliwe', 'możliwe', 'mozna', 'można', 'mój', 'mu', 'musi', 'my', 'na', 'nad', 'nam', 'nami', 'nas', 'nasi', 'nasz', 'nasza', 'nasze', 'naszego', 'naszych', 'natomiast', 'natychmiast', 'nawet', 'nia', 'nią', 'nic', 'nich', 'nie', 'niech', 'niego', 'niej', 'niemu', 'nigdy', 'nim', 'nimi', 'niz', 'niż', 'no', 'o', 'obok', 'od', 'okolo', 'około', 'on', 'ona', 'one', 'oni', 'ono', 'oraz', 'oto', 'owszem', 'pan', 'pana', 'pani', 'po', 'pod', 'podczas', 'pomimo', 'ponad', 'poniewaz', 'ponieważ', 'powinien', 'powinna', 'powinni', 'powinno', 'poza', 'prawie', 'przeciez', 'przecież', 'przed', 'przede', 'przedtem', 'przez', 'przy', 'roku', 'rowniez', 'również', 'sam', 'sama', 'są', 'sie', 'się', 'skad', 'skąd', 'soba', 'sobą', 'sobie', 'sposob', 'sposób', 'swoje', 'ta', 'tak', 'taka', 'taki', 'takie', 'takze', 'także', 'tam', 'te', 'tego', 'tej', 'temu', 'ten', 'teraz', 'też', 'to', 'toba', 'tobą', 'tobie', 'totez', 'toteż', 'totobą', 'trzeba', 'tu', 'tutaj', 'twoi', 'twoim', 'twoj', 'twoja', 'twoje', 'twój', 'ty', 'tylko', 'tym', 'u', 'w', 'wam', 'wami', 'was', 'wasz', 'wasza', 'wasze', 'we', 'według', 'wiele', 'wielu', 'więc', 'więcej', 'wlasnie', 'właśnie', 'wszyscy', 'wszystkich', 'wszystkie', 'wszystkim', 'wszystko', 'wtedy', 'wy', 'z', 'za', 'zaden', 'zadna', 'zadne', 'zadnych', 'zapewne', 'zawsze', 'ze', 'zeby', 'żeby', 'zez', 'zi', 'znow', 'znowu', 'znów', 'zostal', 'został', 'żaden', 'żadna', 'żadne', 'żadnych', 'że', 'żeby',
  // Conversational fillers
  'chyba', 's=19', 'trollgefk', 'youtube', 'qt_iw4yb22jfxrnx3q6eug', 'ezgif-1-458e83eb9c', 'sakamoto_store', 'start_radio', 'fixupx', 'medicos_et_02', 'kaiyodo_pr', 'bilety24', '27s_gate_3', 'hatsune-miku-miku-hatsune-miku-hatsune-washing-machine-gif-4863029126409914383', 'sorry-gif-22861535', 'nero-devil-may-cry-nero-dmc-dmc-devilmaycry-gif-5266084179185635046', 'cat-wiggle-crazy-cat-zoomies-gif-987735829864339346', 'hiding-spooked-sad-crying-cold-gif-15759512', 'teto-kasane-teto-bald-explosion-explode-gif-6656963363388285940', 'kegf3rsj6thrccde4xenvq', 'bocchi_goods', 'sbeaeba-gif-133119280752873140', 'amane_bushi', 'lft4vjtv471cfkd1scuzaw', 'sagafro2', 'vxtwitter', 'ab_channel', 'sessionid', 'seiyuucorner', '_blank', 'shinobuded1', 'shinobuded2', '30**', '909369353554771989><', 'is_from_webapp=1&sender_device=pc&web_id=7476523811413984790', 'gref', 'discordapp', '🇵🇱', 'searchbtn', 'g_st=com', 'cocoxd', 'dogoangery', 'emotethonk', 'anthropic', 's=20', 's=21', 'https', 'wiec', 'tez', 'tylko', 'troche', 'trochę', 'moze', 'może', 'jeszcze', 'tutaj', 'wlasnie', 'właśnie', 'potem', 'teraz', 'znowu', 'nawet', 'nagle', 'napisze', 'dobra', 'raz', 'sumie', 'serio', 'naprawde', 'naprawdę', 'ogolnie', 'ogólnie', 'wtedy', 'zawsze', 'nigdy', 'moim', 'zdaniem', 'raczej', 'zbyt', 'bardzo', 'całkiem', 'całkowicie', 'znow', 'znów', 'wiem', 'chce', 'chcę', 'wiedzieć', 'powiedzieć', 'robić', 'robic', 'mówić', 'mowic', 'prostu', 'razie'
]);

// ==================== EMOJI DISCOVERY ====================

/**
 * Normalize emoji name by:
 * 1. Converting to lowercase
 * 2. Extracting base name (alphabetic characters only)
 * 3. Stripping numeric suffixes like -1, -4, 5, etc.
 * 
 * Examples: "cocoxd-4" -> "cocoxd", "cocoXD5" -> "cocoxd", "cocoXD" -> "cocoxd"
 */
function normalizeEmojiName(name) {
  if (!name) return '';
  // Convert to lowercase and strip only numeric suffixes (optionally preceded by - or _)
  // This allows "cocoxd7", "cocoXD_4", "cocoxd-3" to match "cocoxd"
  // but keeps "cocoxd_spinning" as a separate emoji.
  return name.toLowerCase().replace(/[-_]?\d+$/, '');
}

/**
 * Scan all input JSON files to discover emoji IDs and create a mapping of normalized emoji names to IDs
 * Uses streaming JSON to handle large files
 */
async function discoverAllEmojis() {
  console.log('Scanning input files for emoji discovery and pre-downloading...');

  const emojiMap = {}; // Map: normalized emoji name -> emoji ID
  const inputDir = path.join(__dirname, 'input');
  const emojiRegex = /<a?:(\w+):(\d+)>/g;

  if (!fs.existsSync(inputDir)) {
    console.log('Input directory not found, skipping emoji discovery.');
    return emojiMap;
  }

  const files = fs.readdirSync(inputDir).filter(f => f.endsWith('.json'));
  console.log(`Found ${files.length} JSON files to scan.\n`);

  let emojiCount = 0;
  let downloadCount = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const filePath = path.join(inputDir, file);

    // Show progress
    process.stdout.write(`\r[${i + 1}/${files.length}] Scanning ${file.substring(0, 60)}...`);

    try {
      await new Promise((resolve, reject) => {
        const pipeline = chain([
          fs.createReadStream(filePath),
          parser(),
          pick({ filter: 'messages' }),
          streamArray()
        ]);

        pipeline.on('data', ({ value: msg }) => {
          if (!msg) return;

          // 1. Scan reactions
          if (msg.reactions && Array.isArray(msg.reactions)) {
            for (const reaction of msg.reactions) {
              if (reaction.emoji && reaction.emoji.id && reaction.emoji.name) {
                const nameNormalized = normalizeEmojiName(reaction.emoji.name);
                if (nameNormalized && !emojiMap[nameNormalized]) {
                  emojiMap[nameNormalized] = reaction.emoji.id;
                  emojiCount++;
                }
                downloadEmoji(reaction.emoji.id);
                downloadCount++;
              }
            }
          }

          // 2. Scan message content for inline emojis
          if (msg.content && msg.content.includes('<')) {
            let match;
            while ((match = emojiRegex.exec(msg.content)) !== null) {
              const name = match[1];
              const id = match[2];
              const nameNormalized = normalizeEmojiName(name);

              if (nameNormalized && !emojiMap[nameNormalized]) {
                emojiMap[nameNormalized] = id;
                emojiCount++;
              }
              downloadEmoji(id);
              downloadCount++;
            }
          }
        });

        pipeline.on('end', () => resolve());
        pipeline.on('error', (err) => {
          console.log(`\n  ⚠️  Error scanning ${file}: ${err.message}`);
          resolve(); // Continue with other files even if one fails
        });
      });
    } catch (err) {
      console.log(`\n  ⚠️  Error scanning ${file}: ${err.message}`);
    }
  }

  // Clear the progress line and show final result
  process.stdout.write('\r' + ' '.repeat(100) + '\r');

  console.log(`Discovered ${emojiCount} unique emoji mappings.`);
  console.log(`Queued ${downloadCount} emoji download checks.\n`);
  return emojiMap;
}

// This will be set in the generate() function
let GLOBAL_EMOJI_MAP = {};

function isLikelyLink(w) {
  if (w.startsWith('http')) return true;
  if (w.includes('/') && (w.includes('attachments') || w.includes('cdn') || w.includes('com'))) return true;
  if (w.split('/').length > 2) return true; // More than 2 slashes is likely a path/link
  return false;
}

function isGarbageWord(w) {
  // Pattern 1: URL parameters like "s=46&t=..." (though aggressive split handles most)
  if (w.includes('=') || w.includes('&')) return true;

  // Pattern 2: Malformed Discord emojis or numeric IDs ending with >
  if (w.endsWith('>') || w.startsWith('<')) return true;

  // Pattern 3: Lone numeric IDs (usually fragments of emojis/mentions)
  if (/^\d{15,20}$/.test(w)) return true;

  // Pattern 4: Discord-specific patterns that sometimes slip through
  if (w.includes('cdn') || w.includes('discordapp') || w.includes('tenor')) return true;

  return false;
}

// ==================== ADVANCED METRICS ====================

function computeVocabularyFingerprint(userId, serverWordFreqs, serverRawWords) {
  console.log(`  Computing vocabulary fingerprint (TF-IDF)...`);
  const msgs = db.prepare(`
        SELECT content FROM messages 
        WHERE author_id = ? AND strftime('%Y', timestamp, 'localtime') = ?
    `).all(userId, TARGET_YEAR.toString());

  const userWordCount = {};
  const userRawWords = {}; // Map stem -> most common raw word
  let userTotalWords = 0;

  for (const row of msgs) {
    if (!row.content) continue;
    // Strip Discord emojis and mentions before splitting to avoid emoji names appearing as words
    const cleanContent = row.content.toLowerCase()
      .replace(/<a?:\w+:\d+>/g, '') // Strip emojis <:name:id>
      .replace(/<@!?\d+>/g, '')     // Strip user mentions
      .replace(/<#\d+>/g, '');      // Strip channel mentions

    const words = cleanContent.split(/[\s,.!?":;()\[\]<>{}|\\/+=*&^%$#@~`]+/);
    for (let w of words) {
      // Skip short words, stopwords, URLs, mentions, numbers
      if ((w.length < 4 && w !== 'uwu' && w !== 'owo') || STOPWORDS.has(w)) continue;
      if (isLikelyLink(w) || isGarbageWord(w)) continue;
      if (/^\d+$/.test(w)) continue;

      const s = getStem(w);
      if (s.length < 3 && s !== 'uwu' && s !== 'owo') continue;

      userWordCount[s] = (userWordCount[s] || 0) + 1;
      // Store the raw word for display
      if (!userRawWords[s]) userRawWords[s] = {};
      userRawWords[s][w] = (userRawWords[s][w] || 0) + 1;
      userTotalWords++;
    }
  }

  if (userTotalWords < 50) return [];

  // Compute TF-IDF scores
  const tfIdf = [];
  for (const [stem, count] of Object.entries(userWordCount)) {
    if (count < 5) continue; // Must use word at least 5 times

    const userTF = count / userTotalWords;
    const serverCount = serverWordFreqs[stem] || 1;
    const serverTF = serverCount / serverWordFreqs._total;

    // TF-IDF: Higher means more unique to user
    const score = userTF / serverTF;

    // Only include words that are significantly more unique (score > 1.5 means 50% more)
    if (score < 1.5) continue;

    // Find the most common raw word for this stem
    const rawWordCounts = userRawWords[stem];
    const bestRawWord = Object.entries(rawWordCounts).sort((a, b) => b[1] - a[1])[0][0];

    tfIdf.push({ word: bestRawWord, score, count });
  }

  const result = tfIdf.sort((a, b) => b.score - a.score).slice(0, 10);
  console.log(`  ✅ Generated ${result.length} unique words`);
  return result;
}

function computeResponseLatency(userId) {
  console.log(`  Computing response latency...`);

  const latencies = [];

  // Get all messages that ping the user OR are replies to the user's messages
  const incomingInteractions = db.prepare(`
        SELECT m_trigger.id, m_trigger.channel_id, m_trigger.timestamp
        FROM messages m_trigger
        -- Check for mentions
        LEFT JOIN mentions mn ON m_trigger.id = mn.message_id AND mn.mentioned_user_id = ?
        -- Check for replies
        LEFT JOIN messages m_target ON m_trigger.reply_to_msg_id = m_target.id
        WHERE (mn.mentioned_user_id IS NOT NULL OR m_target.author_id = ?)
        AND strftime('%Y', m_trigger.timestamp, 'localtime') = ?
        AND m_trigger.author_id != ? -- Ignore self-replies/mentions
    `).all(userId, userId, TARGET_YEAR.toString(), userId);

  if (incomingInteractions.length === 0) return null;

  const responseStmt = db.prepare(`
        SELECT timestamp
        FROM messages
        WHERE channel_id = ? 
        AND author_id = ?
        AND timestamp > ?
        ORDER BY timestamp ASC
        LIMIT 1
    `);

  for (const interaction of incomingInteractions) {
    const response = responseStmt.get(interaction.channel_id, userId, interaction.timestamp);

    if (response) {
      const seconds = (new Date(response.timestamp) - new Date(interaction.timestamp)) / 1000;
      if (seconds < 86400) { // within 24 hours
        latencies.push(seconds);
      }
    }
  }

  if (latencies.length === 0) return null;

  const sorted = latencies.sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const average = sorted.reduce((a, b) => a + b, 0) / sorted.length;

  return {
    median: Math.round(median),
    average: Math.round(average)
  };
}

function computeChronotype(hourlyDist) {
  console.log(`  Computing sleep schedule estimation...`);
  const threshold = Math.max(...hourlyDist) * 0.05;
  let longestQuietStart = 0;
  let longestQuietLength = 0;
  let currentQuietStart = -1;
  let currentQuietLength = 0;

  for (let h = 0; h < 48; h++) {
    const hour = h % 24;
    if (hourlyDist[hour] < threshold) {
      if (currentQuietStart === -1) currentQuietStart = h;
      currentQuietLength++;
    } else {
      if (currentQuietLength > longestQuietLength) {
        longestQuietLength = currentQuietLength;
        longestQuietStart = currentQuietStart;
      }
      currentQuietStart = -1;
      currentQuietLength = 0;
    }
  }

  if (currentQuietLength > longestQuietLength) {
    longestQuietLength = currentQuietLength;
    longestQuietStart = currentQuietStart;
  }

  if (longestQuietLength < 4) return null;

  const sleepStart = longestQuietStart % 24;
  const sleepEnd = (longestQuietStart + longestQuietLength) % 24;

  return { sleepStart, sleepEnd, duration: longestQuietLength };
}

function computeSessionAnalysis(userId) {
  console.log(`  Computing session analysis...`);
  const messages = db.prepare(`
        SELECT timestamp FROM messages
        WHERE author_id = ? AND strftime('%Y', timestamp, 'localtime') = ?
        ORDER BY timestamp ASC
    `).all(userId, TARGET_YEAR.toString());

  if (messages.length < 2) return null;

  const sessions = [];
  let sessionStart = new Date(messages[0].timestamp);
  let lastMsg = sessionStart;
  let sessionMsgCount = 1;

  for (let i = 1; i < messages.length; i++) {
    const currentMsg = new Date(messages[i].timestamp);
    const gap = (currentMsg - lastMsg) / 1000;

    if (gap > 1800) {
      const sessionLength = (lastMsg - sessionStart) / 1000;
      if (sessionLength > 0) {
        sessions.push({
          length: sessionLength,
          messages: sessionMsgCount,
          avgInterval: sessionLength / sessionMsgCount
        });
      }
      sessionStart = currentMsg;
      sessionMsgCount = 1;
    } else {
      sessionMsgCount++;
    }
    lastMsg = currentMsg;
  }

  const sessionLength = (lastMsg - sessionStart) / 1000;
  if (sessionLength > 0) {
    sessions.push({
      length: sessionLength,
      messages: sessionMsgCount,
      avgInterval: sessionLength / sessionMsgCount
    });
  }

  if (sessions.length === 0) return null;

  const avgSessionLength = sessions.reduce((a, b) => a + b.length, 0) / sessions.length;
  const avgAttentionSpan = sessions.reduce((a, b) => a + b.avgInterval, 0) / sessions.length;

  return {
    sessionCount: sessions.length,
    avgSessionLength: Math.round(avgSessionLength / 60),
    avgAttentionSpan: Math.round(avgAttentionSpan),
  };
}

function computeLongestStreak(userId) {
  console.log(`  Computing longest active streak...`);
  const days = db.prepare(`
        SELECT DISTINCT date(timestamp, 'localtime') as day
        FROM messages
        WHERE author_id = ? AND strftime('%Y', timestamp, 'localtime') = ?
        ORDER BY day ASC
    `).all(userId, TARGET_YEAR.toString());

  if (days.length === 0) return 0;

  let longestStreak = 1;
  let currentStreak = 1;

  for (let i = 1; i < days.length; i++) {
    const prevDate = new Date(days[i - 1].day);
    const currDate = new Date(days[i].day);
    const diffDays = (currDate - prevDate) / (1000 * 60 * 60 * 24);

    if (diffDays === 1) {
      currentStreak++;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else {
      currentStreak = 1;
    }
  }

  return longestStreak;
}

function computeReactionRelationships(userId) {
  console.log(`  Computing reaction-based relationships...`);
  const topReactors = db.prepare(`
        SELECT r.user_id as id, u.name, u.avatar_url, COUNT(*) as count
        FROM reactions r
        JOIN messages m ON r.message_id = m.id
        JOIN users u ON r.user_id = u.id
        WHERE m.author_id = ? AND strftime('%Y', m.timestamp, 'localtime') = ?
        AND u.name != 'Link Expander'
        GROUP BY r.user_id
        ORDER BY count DESC
        LIMIT 5
    `).all(userId, TARGET_YEAR.toString());

  const topReactedTo = db.prepare(`
        SELECT m.author_id as id, u.name, u.avatar_url, COUNT(*) as count
        FROM reactions r
        JOIN messages m ON r.message_id = m.id
        JOIN users u ON m.author_id = u.id
        WHERE r.user_id = ? AND strftime('%Y', m.timestamp, 'localtime') = ?
        AND u.name != 'Link Expander'
        GROUP BY m.author_id
        ORDER BY count DESC
        LIMIT 5
    `).all(userId, TARGET_YEAR.toString());

  return { topReactors, topReactedTo };
}

// ==================== NEW ADVANCED METRICS (2025 UPDATE) ====================

const COCOXD_IDS = [
  '909369353554771989',
  '729822486799319071',
  '917810523003813948',
  '932416113902485544',
  '1389334877807313076',
  '1324140637372682260'
];

const IGNORED_EMOJI_IDS = [
  '942868829854384148',
  '1443166033144975400',
  '1324140863487610921',
  '914627053486211092',
  '1020667496346427393',
  '1003285860596338758',
  '1056314396713955458',
  '1324140679785480284',
  '867302170775781376'
];

const IGNORED_EMOJI_NAMES = [
  '🚬'
];

function computeFunniestMessages(userId, guildId) {
  console.log(`  Computing funniest messages (cocoxd)...`);
  // Top 3 messages with most "cocoxd" reactions
  const funniest = db.prepare(`
    SELECT m.id, m.content, m.channel_id, m.attachment_urls, COUNT(r.message_id) as reaction_count
    FROM messages m
    JOIN reactions r ON m.id = r.message_id
    WHERE m.author_id = ? 
    AND (r.emoji_id IN (${COCOXD_IDS.map(id => `'${id}'`).join(',')}) OR LOWER(r.emoji_name) LIKE '%cocoxd%')
    AND strftime('%Y', m.timestamp, 'localtime') = ?
    GROUP BY m.id
    ORDER BY reaction_count DESC
    LIMIT 15
  `).all(userId, TARGET_YEAR.toString());

  return funniest.map(msg => {
    // Get all reactions for this message to display them
    const reactions = db.prepare(`
      SELECT emoji_id, emoji_name, COUNT(*) as count
      FROM reactions
      WHERE message_id = ?
      GROUP BY emoji_id, emoji_name
      ORDER BY count DESC
    `).all(msg.id);

    return {
      id: msg.id,
      content: msg.content,
      count: msg.reaction_count,
      link: `https://discord.com/channels/${guildId}/${msg.channel_id}/${msg.id}`,
      attachments: msg.attachment_urls ? JSON.parse(msg.attachment_urls) : [],
      reactions
    };
  });
}

function computeMostReactedMessages(userId, guildId) {
  console.log(`  Computing most reacted messages (single emoji type)...`);
  // Find top messages based on the highest count of a SINGLE emoji type
  const excludedIds = [...COCOXD_IDS, ...IGNORED_EMOJI_IDS];

  // Use a subquery to find the best reaction type for each message first
  const mostReacted = db.prepare(`
    SELECT id, content, channel_id, attachment_urls, emoji_name, emoji_id, max_count
    FROM (
      SELECT m.id, m.content, m.channel_id, m.attachment_urls, r.emoji_name, r.emoji_id, COUNT(*) as max_count,
             ROW_NUMBER() OVER (PARTITION BY m.id ORDER BY COUNT(*) DESC) as rn
      FROM messages m
      JOIN reactions r ON m.id = r.message_id
      WHERE m.author_id = ? 
      AND (r.emoji_id NOT IN (${excludedIds.map(id => `'${id}'`).join(',')}) OR r.emoji_id IS NULL)
      AND r.emoji_name NOT IN (${IGNORED_EMOJI_NAMES.map(name => `'${name}'`).join(',')})
      AND LOWER(r.emoji_name) NOT LIKE '%cocoxd%'
      AND strftime('%Y', m.timestamp, 'localtime') = ?
      GROUP BY m.id, r.emoji_name, r.emoji_id
    )
    WHERE rn = 1
    ORDER BY max_count DESC
    LIMIT 15
  `).all(userId, TARGET_YEAR.toString());

  return mostReacted.map(msg => {
    const reactions = db.prepare(`
      SELECT emoji_id, emoji_name, COUNT(*) as count
      FROM reactions
      WHERE message_id = ?
      GROUP BY emoji_id, emoji_name
      ORDER BY count DESC
    `).all(msg.id);

    return {
      id: msg.id,
      content: msg.content,
      emoji_name: msg.emoji_name,
      emoji_id: msg.emoji_id,
      count: msg.max_count,
      link: `https://discord.com/channels/${guildId}/${msg.channel_id}/${msg.id}`,
      attachments: msg.attachment_urls ? JSON.parse(msg.attachment_urls) : [],
      reactions
    };
  });
}

function computeLongestMessage(userId, guildId) {
  console.log(`  Computing longest message...`);
  const longest = db.prepare(`
    SELECT id, content, channel_id, char_count
    FROM messages
    WHERE author_id = ? AND strftime('%Y', timestamp, 'localtime') = ?
    ORDER BY char_count DESC
    LIMIT 1
  `).get(userId, TARGET_YEAR.toString());

  if (!longest) return null;

  return {
    id: longest.id,
    content: longest.content.substring(0, 100) + (longest.content.length > 100 ? '...' : ''),
    char_count: longest.char_count,
    link: `https://discord.com/channels/${guildId}/${longest.channel_id}/${longest.id}`
  };
}

function computeMostRepliedToMessage(userId, guildId) {
  console.log(`  Computing most replied to message...`);
  // This user's message that received the most replies from others
  const mostRepliedTo = db.prepare(`
    SELECT m1.id, m1.content, m1.channel_id, m1.attachment_urls, COUNT(m2.id) as reply_count
    FROM messages m1
    JOIN messages m2 ON m1.id = m2.reply_to_msg_id
    WHERE m1.author_id = ? AND m2.author_id != ?
    AND strftime('%Y', m1.timestamp, 'localtime') = ?
    GROUP BY m1.id
    ORDER BY reply_count DESC
    LIMIT 1
  `).get(userId, userId, TARGET_YEAR.toString());

  if (!mostRepliedTo) return null;

  const reactions = db.prepare(`
    SELECT emoji_id, emoji_name, COUNT(*) as count
    FROM reactions
    WHERE message_id = ?
    GROUP BY emoji_id, emoji_name
    ORDER BY count DESC
  `).all(mostRepliedTo.id);

  return {
    id: mostRepliedTo.id,
    content: mostRepliedTo.content,
    count: mostRepliedTo.reply_count,
    link: `https://discord.com/channels/${guildId}/${mostRepliedTo.channel_id}/${mostRepliedTo.id}`,
    attachments: mostRepliedTo.attachment_urls ? JSON.parse(mostRepliedTo.attachment_urls) : [],
    reactions
  };
}

function computeRoleAnalytics(userId) {
  const user = db.prepare('SELECT roles FROM users WHERE id = ?').get(userId);
  if (!user || !user.roles) return null;

  try {
    const roles = JSON.parse(user.roles);
    if (!roles || roles.length === 0) return null;

    // Find highest position role
    const topRole = roles.sort((a, b) => b.position - a.position)[0];
    return {
      topRole: topRole.name,
      color: topRole.color,
      roleCount: roles.length
    };
  } catch (e) {
    return null;
  }
}

function computeCategoryStats(userId) {
  // Count messages per category
  const categories = db.prepare(`
    SELECT c.category_name, COUNT(*) as count
    FROM messages m
    JOIN channels c ON m.channel_id = c.id
    WHERE m.author_id = ? AND strftime('%Y', m.timestamp, 'localtime') = ?
    GROUP BY c.category_name
    ORDER BY count DESC
  `).all(userId, TARGET_YEAR.toString());

  return categories.map(c => ({
    name: c.category_name || 'Uncategorized',
    count: c.count
  }));
}

function computeEntropy(userId, totalMessages, activeChannelCount) {
  // Shannon entropy for channel distribution
  const channels = db.prepare(`
    SELECT channel_id, COUNT(*) as count
    FROM messages
    WHERE author_id = ? AND strftime('%Y', timestamp, 'localtime') = ?
    GROUP BY channel_id
  `).all(userId, TARGET_YEAR.toString());

  if (channels.length === 0) return 0;

  let entropy = 0;

  // Filter out noise: keep only channels with > 2% of user messages if total messages > 100
  let relevantChannels = channels;
  if (totalMessages > 100) {
    relevantChannels = channels.filter(ch => ch.count > totalMessages * 0.02);
  }

  // Recalculate total for probability distribution based on filtered set
  const relevantTotal = relevantChannels.reduce((sum, ch) => sum + ch.count, 0);

  for (const ch of relevantChannels) {
    const p = ch.count / relevantTotal;
    if (p > 0) entropy -= p * Math.log2(p);
  }

  // Normalize entropy to a 0-10 scale
  // Max entropy is capped at log2(15) channels for the 10/10 score
  const maxPossibleEntropy = Math.log2(15);
  const normalizedEntropy = Math.min(10, (entropy / maxPossibleEntropy) * 10);

  console.log(`  📊 Entropy Debug [${userId}]:`);
  console.log(`     - Total Messages: ${totalMessages}`);
  console.log(`     - Channels (All): ${channels.length}`);
  console.log(`     - Channels (Relevant >2%): ${relevantChannels.length}`);
  console.log(`     - Raw Entropy: ${entropy.toFixed(3)}`);
  console.log(`     - Max Possible Entropy (log2(15)): ${maxPossibleEntropy.toFixed(3)}`);
  console.log(`     - Normalized Result: ${normalizedEntropy.toFixed(2)}/10`);
  if (relevantChannels.length > 0) {
    console.log(`     - Top Channel Share: ${((relevantChannels.sort((a, b) => b.count - a.count)[0].count / relevantTotal) * 100).toFixed(1)}%`);
  }

  // Determine Entropy Persona with finer granularity (0-10 Scale)
  let entropyPersona = 'Balanced';
  if (normalizedEntropy < 1.5) entropyPersona = 'The Hermit';
  else if (normalizedEntropy < 3.0) entropyPersona = 'The Local';
  else if (normalizedEntropy < 4.5) entropyPersona = 'The Explorer';
  else if (normalizedEntropy < 6.0) entropyPersona = 'The Traveler';
  else if (normalizedEntropy < 8.0) entropyPersona = 'The Wanderer';
  else if (normalizedEntropy < 9.5) entropyPersona = 'The Nomad';
  else entropyPersona = 'The Omnipresent';

  return {
    value: Number(entropy.toFixed(2)),
    normalized: Number(normalizedEntropy.toFixed(2)),
    persona: entropyPersona
  };
}

function computeContentHabits(userId) {
  console.log('  Computing content habits (links, caps, questions)...');
  const msgs = db.prepare(`
    SELECT content, channel_id
    FROM messages 
    WHERE author_id = ? AND strftime('%Y', timestamp, 'localtime') = ?
  `).all(userId, TARGET_YEAR.toString());

  let capsCount = 0;
  let questionCount = 0;
  let spotifyCount = 0;
  let youtubeCount = 0;
  let twitterCount = 0; // X.com / Twitter
  let pixivCount = 0;
  let gifCount = 0; // Tenor/Giphy
  let totalLinks = 0;
  let musicLinksFound = 0;

  const linkRegex = /https?:\/\/[^\s]+/g;

  for (const row of msgs) {
    if (!row.content) continue;
    const content = row.content;

    // Caps Lock (messages > 5 chars, > 60% caps)
    if (content.length > 5) {
      const caps = content.replace(/[^A-Z]/g, '').length;
      if (caps / content.length > 0.6) capsCount++;
    }

    // Questions (ends with ?)
    if (content.trim().endsWith('?')) questionCount++;

    // Link Analysis
    const links = content.match(linkRegex);
    if (links) {
      totalLinks += links.length;
      for (const link of links) {
        const l = link.toLowerCase();

        // The DJ (Music) - Specific Channel Only (875089270430396526)
        if (row.channel_id === '875089270430396526') {
          if (
            l.includes('spotify.com') ||
            l.includes('open.spotify.com') ||
            l.includes('youtube.com') ||
            l.includes('youtu.be') ||
            l.includes('music.youtube.com')
          ) {
            youtubeCount++; // Using youtubeCount as the general music link counter for the badge
            musicLinksFound++;
          }
        }

        // The Artist - Specific Channels Only (1130865669429264456, 875089164213829662)
        if (row.channel_id === '1130865669429264456' || row.channel_id === '875089164213829662') {
          if (l.includes('twitter.com') || l.includes('x.com')) twitterCount++;
          if (l.includes('pixiv.net')) pixivCount++;
        }

        // GIF Spammer - Global
        if (l.includes('tenor.com') || l.includes('giphy.com')) gifCount++;
      }
    }
  }

  // Screenshot Abuser - Image attachments in channel 875089652518903869
  const screenshotCount = db.prepare(`
    SELECT COUNT(*) as count 
    FROM messages 
    WHERE author_id = ? 
    AND channel_id = '875089652518903869'
    AND has_attachments = 1
    AND attachment_types LIKE '%image%'
    AND strftime('%Y', timestamp, 'localtime') = ?
  `).get(userId, TARGET_YEAR.toString()).count;

  if (musicLinksFound > 0) {
    console.log(`  🎵 DJ Debug [${userId}]: Found ${musicLinksFound} music links in #kącik-muzyczny (ID: 875089270430396526)`);
  }

  return {
    capsRatio: msgs.length > 0 ? capsCount / msgs.length : 0,
    questionRatio: msgs.length > 0 ? questionCount / msgs.length : 0,
    spotifyCount,
    youtubeCount,
    twitterCount,
    pixivCount,
    gifCount,
    screenshotCount, // New Metric
    totalLinks
  };
}

function computeTopGifs(userId) {
  console.log(`  Computing top GIFs for ${userId}...`);
  const msgs = db.prepare(`
    SELECT content, attachment_urls, attachment_types
    FROM messages 
    WHERE author_id = ? AND strftime('%Y', timestamp, 'localtime') = ?
    AND (
      content LIKE '%tenor.com%' 
      OR content LIKE '%giphy.com%' 
      OR content LIKE '%.gif%'
      OR attachment_types LIKE '%gif%'
    )
  `).all(userId, TARGET_YEAR.toString());

  if (msgs.length === 0) return [];

  const gifCounts = {};
  // Improved regex to catch:
  // 1. Tenor/Giphy links (any path)
  // 2. Direct .gif links (ignoring query params for grouping)
  const linkRegex = /https?:\/\/[^\s]+(?:\.gif(?:[?#][^\s]*)?|tenor\.com\/[^\s]+|giphy\.com\/[^\s]+)/gi;

  let totalGifsFound = 0;

  for (const row of msgs) {
    // 1. Check content for links
    if (row.content) {
      const links = row.content.match(linkRegex);
      if (links) {
        for (const link of links) {
          // Normalize link: strip query parameters for .gif files to group them
          // But keep them for tenor/giphy as they might be important or just handle them as is
          // Actually, for tenor/giphy, usually the ID is in the path.
          // Let's strip query params for all to be safe for grouping.
          let cleanLink = link;
          try {
            const urlObj = new URL(link);
            urlObj.search = '';
            urlObj.hash = '';
            cleanLink = urlObj.toString();
          } catch (e) {
            // If invalid URL, just use original
          }

          gifCounts[cleanLink] = (gifCounts[cleanLink] || 0) + 1;
          totalGifsFound++;
        }
      }
    }

    // 2. Check attachments for GIFs
    if (row.attachment_urls && row.attachment_types && row.attachment_types.includes('gif')) {
      const urls = row.attachment_urls.split(',');
      const types = row.attachment_types.split(',');

      for (let i = 0; i < types.length; i++) {
        if (types[i].toLowerCase().includes('gif') && urls[i]) {
          let gifUrl = urls[i].trim();
          // Normalize attachment URL too
          try {
            const urlObj = new URL(gifUrl);
            urlObj.search = '';
            urlObj.hash = '';
            gifUrl = urlObj.toString();
          } catch (e) { }

          gifCounts[gifUrl] = (gifCounts[gifUrl] || 0) + 1;
          totalGifsFound++;
        }
      }
    }
  }

  console.log(`    Found ${totalGifsFound} total GIF candidates.`);

  // Convert to array and sort
  const sortedGifs = Object.entries(gifCounts)
    .map(([url, count]) => ({ url, count }))
    .sort((a, b) => b.count - a.count)
    .filter(g => g.count >= 5) // Keep threshold at 5
    .slice(0, 5); // Top 5

  if (sortedGifs.length > 0) {
    console.log(`    🏆 Top GIF: ${sortedGifs[0].url} (${sortedGifs[0].count} times)`);
    console.log(`    Found ${sortedGifs.length} GIFs matching criteria.`);
    return sortedGifs;
  } else {
    console.log(`    No GIFs found with count >= 5.`);
    return [];
  }
}

function computeWorkLifeBalance(userId) {
  // Weekend vs Weekday
  const days = db.prepare(`
    SELECT strftime('%w', timestamp, 'localtime') as day, COUNT(*) as count
    FROM messages
    WHERE author_id = ? AND strftime('%Y', timestamp, 'localtime') = ?
    GROUP BY day
  `).all(userId, TARGET_YEAR.toString());

  let weekend = 0;
  let weekday = 0;

  for (const d of days) {
    const day = parseInt(d.day);
    if (day === 0 || day === 6) weekend += d.count; // 0=Sun, 6=Sat
    else weekday += d.count;
  }

  const total = weekend + weekday;
  return {
    weekend: total > 0 ? weekend / total : 0,
    weekday: total > 0 ? weekday / total : 0
  };
}

function computeNetworkStats(userId) {
  // Clique: User A replies to B, B replies to A.
  // We check top 3 people user replies to, and see if they reply back.

  const topRepliedTo = db.prepare(`
    SELECT m2.author_id, COUNT(*) as count
    FROM messages m1
    JOIN messages m2 ON m1.reply_to_msg_id = m2.id
    WHERE m1.author_id = ? AND strftime('%Y', m1.timestamp, 'localtime') = ?
    AND m2.author_id != ?
    GROUP BY m2.author_id
    ORDER BY count DESC
    LIMIT 10
  `).all(userId, TARGET_YEAR.toString(), userId);

  let cliqueScore = 0;
  const cliqueMembers = [];

  for (const target of topRepliedTo) {
    const replyBack = db.prepare(`
        SELECT COUNT(*) as count
        FROM messages m1
        JOIN messages m2 ON m1.reply_to_msg_id = m2.id
        WHERE m1.author_id = ? AND m2.author_id = ?
        AND strftime('%Y', m1.timestamp, 'localtime') = ?
    `).get(target.author_id, userId, TARGET_YEAR.toString()).count;

    if (replyBack > 0) {
      // Simple mutual score
      const min = Math.min(target.count, replyBack);
      const max = Math.max(target.count, replyBack);
      if (min / max > 0.2) { // At least 20% reciprocity
        cliqueScore++;
        // Get name
        const name = db.prepare('SELECT name FROM users WHERE id = ?').get(target.author_id)?.name;
        if (name) cliqueMembers.push(name);
      }
    }
  }

  // Bridge: Unique people replied to
  const uniqueContacts = db.prepare(`
    SELECT COUNT(DISTINCT m2.author_id) as count
    FROM messages m1
    JOIN messages m2 ON m1.reply_to_msg_id = m2.id
    WHERE m1.author_id = ? AND strftime('%Y', m1.timestamp, 'localtime') = ?
    AND m2.author_id != ?
  `).get(userId, TARGET_YEAR.toString(), userId).count;

  return { cliqueMembers: cliqueMembers.slice(0, 3), uniqueContacts };
}

// Pre-compute starboard counts by scanning the starboard JSON file
function computeAllStarboardCounts() {
  console.log('Computing starboard counts from JSON file...');
  const starboardCounts = {};

  // Find the starboard JSON file
  const INPUT_DIR = path.join(__dirname, 'input');
  const files = fs.readdirSync(INPUT_DIR);
  const starboardFile = files.find(f => f.includes('starboard') && f.includes('951084270313672744'));

  if (!starboardFile) {
    console.log('  Starboard file not found, skipping starboard counts');
    return starboardCounts;
  }

  const filePath = path.join(INPUT_DIR, starboardFile);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  if (!data.messages) {
    console.log('  No messages in starboard file');
    return starboardCounts;
  }

  // Count embed authors
  for (const msg of data.messages) {
    if (msg.embeds && msg.embeds.length > 0) {
      for (const embed of msg.embeds) {
        if (embed.author && embed.author.name) {
          const authorName = embed.author.name.toLowerCase();
          starboardCounts[authorName] = (starboardCounts[authorName] || 0) + 1;
        }
      }
    }
  }

  console.log(`  Found ${Object.keys(starboardCounts).length} unique starboard authors`);
  return starboardCounts;
}

function computeVoidShouter(userId, totalMessages) {
  // Ratio of messages / (received replies + received reactions)
  // Higher = shouting into void

  const replies = db.prepare(`
    SELECT COUNT(*) as count
    FROM messages m1
    JOIN messages m2 ON m2.reply_to_msg_id = m1.id
    WHERE m1.author_id = ? AND strftime('%Y', m1.timestamp, 'localtime') = ?
  `).get(userId, TARGET_YEAR.toString()).count;

  const reactions = db.prepare(`
    SELECT COUNT(*) as count
    FROM reactions r
    JOIN messages m ON r.message_id = m.id
    WHERE m.author_id = ? AND strftime('%Y', m.timestamp, 'localtime') = ?
  `).get(userId, TARGET_YEAR.toString()).count;

  const engagement = replies + reactions;
  if (engagement === 0) return totalMessages; // Infinite void
  return Number((totalMessages / engagement).toFixed(2));
}

function computeConversationStarter(userId) {
  // Messages sent > 30 minutes (0.5 hours) after the previous message in the same channel
  const starterCount = db.prepare(`
    SELECT COUNT(*) as count
    FROM messages m
    JOIN (
        SELECT channel_id, timestamp, 
               LAG(timestamp) OVER (PARTITION BY channel_id ORDER BY timestamp) as prev_ts
        FROM messages
        WHERE strftime('%Y', timestamp, 'localtime') = ?
    ) prev ON m.channel_id = prev.channel_id AND m.timestamp = prev.timestamp
    WHERE m.author_id = ?
    AND (julianday(m.timestamp) - julianday(prev.prev_ts)) * 24 > 0.5
  `).get(TARGET_YEAR.toString(), userId).count;

  return starterCount;
}

// ==================== BADGES ====================

function computeAdvancedBadges(userId, metrics, guildStats) {
  console.log(`  Computing badges...`);
  const allBadges = [];
  const m = metrics;

  // 1. Night Owl (20:00 - 05:00)
  const nightHours = [20, 21, 22, 23, 0, 1, 2, 3, 4];
  const nightMsgs = nightHours.reduce((sum, h) => sum + m.hourlyDistribution[h], 0);
  const nightRatio = m.totalMessages > 0 ? nightMsgs / m.totalMessages : 0;
  allBadges.push({
    id: 'night-owl',
    label: 'Nocny Marek',
    description: 'Największa aktywność w nocy (20:00 - 05:00)',
    achieved: m.totalMessages > 50 && nightRatio > 0.4,
    progress: nightRatio,
    threshold: 0.4,
    displayValue: `${(nightRatio * 100).toFixed(1)}%`
  });

  // 2. Early Bird (05:00 - 10:00)
  const morningHours = [5, 6, 7, 8, 9];
  const morningMsgs = morningHours.reduce((sum, h) => sum + m.hourlyDistribution[h], 0);
  const morningRatio = m.totalMessages > 0 ? morningMsgs / m.totalMessages : 0;
  allBadges.push({
    id: 'early-bird',
    label: 'Ranny Ptaszek',
    description: 'Największa aktywność rano (05:00 - 10:00)',
    achieved: m.totalMessages > 50 && morningRatio > 0.4,
    progress: morningRatio,
    threshold: 0.4,
    displayValue: `${(morningRatio * 100).toFixed(1)}%`
  });

  // 2.5. Work Hours (08:00 - 16:00)
  const workHours = [8, 9, 10, 11, 12, 13, 14, 15, 16];
  const workMsgs = workHours.reduce((sum, h) => sum + m.hourlyDistribution[h], 0);
  const workRatio = m.totalMessages > 0 ? workMsgs / m.totalMessages : 0;
  allBadges.push({
    id: 'work-hours',
    label: 'Pracownik Miesiąca',
    description: 'Największa aktywność w godzinach pracy (08:00 - 16:00)',
    achieved: m.totalMessages > 50 && workRatio > 0.4,
    progress: workRatio,
    threshold: 0.4,
    displayValue: `${(workRatio * 100).toFixed(1)}%`
  });

  // 3. Channel Hopper
  const significantChannels = m.topChannels.filter(c => c.percentage >= 5).length;
  allBadges.push({
    id: 'channel-hopper',
    label: 'Wędrowiec Kanałów',
    description: 'Aktywność w 5+ kanałach (min. 5% w każdym)',
    achieved: significantChannels >= 5,
    progress: significantChannels,
    threshold: 5,
    displayValue: `${significantChannels} kanałów`
  });

  // 4. One Channel Gremlin
  const topChannelPct = (m.totalMessages > 0 && m.topChannels[0]) ? m.topChannels[0].percentage / 100 : 0;
  allBadges.push({
    id: 'one-channel',
    label: 'Jednokanałowy Gremlin',
    description: '80% wiadomości w jednym kanale',
    achieved: m.totalMessages > 100 && topChannelPct > 0.8,
    progress: topChannelPct,
    threshold: 0.8,
    displayValue: `${(topChannelPct * 100).toFixed(1)}%`
  });

  // 5. Emoji Machine
  const totalReactions = m.topEmojisSent.reduce((a, b) => a + b.count, 0);
  const reactionRatio = m.totalMessages > 0 ? totalReactions / m.totalMessages : 0;
  allBadges.push({
    id: 'emoji-machine',
    label: 'Fabryka Emoji',
    description: 'Używasz emoji w ponad 30% aktywności',
    achieved: reactionRatio > 0.3,
    progress: reactionRatio,
    threshold: 0.3,
    displayValue: `${(reactionRatio * 100).toFixed(1)}%`
  });

  // 6. The Editor
  const editedCount = db.prepare(`
        SELECT COUNT(*) as count FROM messages 
        WHERE author_id = ? AND strftime('%Y', timestamp, 'localtime') = ? AND timestamp_edited IS NOT NULL
    `).get(userId, TARGET_YEAR.toString()).count;
  const editRatio = m.totalMessages > 0 ? editedCount / m.totalMessages : 0;
  allBadges.push({
    id: 'the-editor',
    label: 'Redaktor Naczelny',
    description: 'Edycja >5% wiadomości',
    achieved: editRatio > 0.05,
    progress: editRatio,
    threshold: 0.05,
    displayValue: `${(editRatio * 100).toFixed(1)}%`
  });

  // 7. Gallery Curator
  const attachRatio = m.totalMessages > 0 ? m.attachmentCount / m.totalMessages : 0;
  allBadges.push({
    id: 'gallery-curator',
    label: 'Kurator Galerii',
    description: 'Ponad 10% wiadomości z załącznikami',
    achieved: attachRatio > 0.1,
    progress: attachRatio,
    threshold: 0.1,
    displayValue: `${(attachRatio * 100).toFixed(1)}%`
  });

  // 8. Pinned Celebrity
  allBadges.push({
    id: 'pinned-celebrity',
    label: 'Przypięta Gwiazda',
    description: '3+ przypiętych wiadomości',
    achieved: m.pinnedMessages >= 3,
    progress: m.pinnedMessages,
    threshold: 3,
    displayValue: `${m.pinnedMessages} przypiętych`
  });

  // 9. Double Texter (Podwójny SMS)
  const recentMsgs = db.prepare(`
        SELECT channel_id, timestamp
        FROM messages
        WHERE author_id = ? 
        AND strftime('%Y', timestamp, 'localtime') = ?
        ORDER BY timestamp ASC
    `).all(userId, TARGET_YEAR.toString());

  let tripleBurstCount = 0;
  for (let i = 2; i < recentMsgs.length; i++) {
    const m1 = recentMsgs[i - 2];
    const m2 = recentMsgs[i - 1];
    const m3 = recentMsgs[i];

    if (m1.channel_id === m2.channel_id && m2.channel_id === m3.channel_id) {
      const t1 = new Date(m1.timestamp).getTime();
      const t3 = new Date(m3.timestamp).getTime();
      if ((t3 - t1) <= 4000) { // 4 seconds
        tripleBurstCount++;
      }
    }
  }

  allBadges.push({
    id: 'double-texter',
    label: 'Podwójny SMS',
    description: 'Szybkie serie (3 wiadomości w 4s) - min. 100 serii',
    achieved: tripleBurstCount >= 100,
    progress: tripleBurstCount,
    threshold: 100,
    displayValue: `${tripleBurstCount} serii`
  });

  // 10. Ghost
  const msgsPerActiveDay = m.activeDays > 0 ? m.totalMessages / m.activeDays : 0;
  allBadges.push({
    id: 'ghost',
    label: 'Szara Eminencja',
    description: 'Częsta obecność, ale mało pisania (<25 msg/dzień)',
    achieved: m.activeDays > 100 && msgsPerActiveDay < 25,
    progress: Math.max(0, 25 - msgsPerActiveDay),
    threshold: 25,
    displayValue: `${msgsPerActiveDay.toFixed(1)} msg/dzień`
  });

  // 11. React Lord
  const totalReactionsReceived = m.topEmojisReceived.reduce((a, b) => a + b.count, 0);
  const receivedRatio = m.totalMessages > 0 ? totalReactionsReceived / m.totalMessages : 0;
  const msgPerReaction = receivedRatio > 0 ? (1 / receivedRatio) : 0;

  allBadges.push({
    id: 'react-lord',
    label: 'Mistrz Reakcji',
    description: 'Otrzymujesz średnio 1 reakcję na każde 5 wiadomości',
    achieved: receivedRatio >= 0.2,
    progress: receivedRatio,
    threshold: 0.2,
    displayValue: msgPerReaction > 0 ? `1 na ${msgPerReaction.toFixed(1)} msg` : '0 reakcji'
  });

  // 12. Trendsetter
  const trendsetterCount = db.prepare(`
      SELECT COUNT(DISTINCT ranked.message_id) as count
      FROM (
        SELECT r.user_id,
               r.message_id,
               row_number() OVER (PARTITION BY r.message_id ORDER BY r.rowid ASC) as rank,
               m.timestamp as msg_ts
        FROM reactions r
        JOIN messages m ON r.message_id = m.id
        WHERE r.message_id IN (
            SELECT message_id FROM reactions GROUP BY message_id HAVING COUNT(*) >= 10
        )
      ) ranked
      WHERE ranked.user_id = ? AND ranked.rank <= 3 AND strftime('%Y', ranked.msg_ts, 'localtime') = ?
   `).get(userId, TARGET_YEAR.toString())?.count || 0;

  allBadges.push({
    id: 'trendsetter',
    label: 'Trendsetter',
    description: 'Wśród 3 pierwszych osób reagujących pod popularnymi postami (10+) - min. 250 wiadomości',
    achieved: trendsetterCount >= 250,
    progress: trendsetterCount,
    threshold: 250,
    displayValue: `${trendsetterCount} razy`
  });

  // 13. Conversation Killer
  allBadges.push({
    id: 'conversation-killer',
    label: 'Pogromca Konwersacji',
    description: 'Ostatnia wiadomość w rozmowie - min. 50 razy',
    achieved: m.killerCount >= 50,
    progress: m.killerCount,
    threshold: 50,
    displayValue: `${m.killerCount} razy`
  });

  // 15. Consistent
  allBadges.push({
    id: 'consistent',
    label: 'Konsekwencja',
    description: 'Seria 180 dni z rzędu',
    achieved: m.longestStreak > 180,
    progress: m.longestStreak,
    threshold: 180,
    displayValue: `${m.longestStreak} dni`
  });

  // 16. Screenshot Abuser
  allBadges.push({
    id: 'screenshot-abuser',
    label: 'Duch Animowych Dysput',
    description: '750 obrazków na #animowe-dysputy',
    achieved: m.contentHabits.screenshotCount >= 750,
    progress: m.contentHabits.screenshotCount,
    threshold: 750,
    displayValue: `${m.contentHabits.screenshotCount} obrazków`
  });

  // 17. The DJ
  allBadges.push({
    id: 'the-dj',
    label: 'DJ Cieńka Książka',
    description: '> 100 linków muzycznych (YT/Spotify) na #kącik-muzyczny',
    achieved: m.contentHabits.youtubeCount >= 100,
    progress: m.contentHabits.youtubeCount,
    threshold: 100,
    displayValue: `${m.contentHabits.youtubeCount} linków`
  });

  // 18. Starboard Fame - count is computed separately via computeStarboardCount
  const starboardCount = m.starboardCount || 0;

  allBadges.push({
    id: 'starboard-fame',
    label: 'Gwiazda Starboardu',
    description: '50+ wpisów na starboardzie',
    achieved: starboardCount >= 50,
    progress: starboardCount,
    threshold: 50,
    displayValue: `${starboardCount} wpisów`
  });

  console.log(`  🏅 Badges Generated: ${allBadges.map(b => b.id).join(', ')}`);
  return allBadges;
}

function computeAllKills() {
  console.log('  Computing all conversation kills (this may take a moment)...');
  const kills = {};

  // Get all messages ordered by channel and timestamp
  const allMsgs = db.prepare(`
    SELECT channel_id, author_id, timestamp,
           LAG(timestamp) OVER (PARTITION BY channel_id ORDER BY timestamp) as prev_ts,
           LEAD(timestamp) OVER (PARTITION BY channel_id ORDER BY timestamp) as next_ts
    FROM messages
    WHERE strftime('%Y', timestamp, 'localtime') = ?
    ORDER BY channel_id, timestamp ASC
  `).all(TARGET_YEAR.toString());

  let conversationLength = 0;
  for (let i = 0; i < allMsgs.length; i++) {
    const msg = allMsgs[i];

    // Check if this message continues a conversation (gap <= 15 mins)
    if (msg.prev_ts) {
      const gapWithPrev = (new Date(msg.timestamp) - new Date(msg.prev_ts)) / 1000;
      if (gapWithPrev <= 900) { // 15 minutes
        conversationLength++;
      } else {
        conversationLength = 1; // Start new conversation
      }
    } else {
      conversationLength = 1;
    }

    // Check if this message KILLS the conversation
    // 1. Conversation must be at least 20 messages long
    // 2. No message in the same channel for at least 2 hours
    let isKill = false;
    if (conversationLength >= 20) {
      if (!msg.next_ts) {
        isKill = true;
      } else {
        const gapWithNext = (new Date(msg.next_ts) - new Date(msg.timestamp)) / 1000;
        if (gapWithNext >= 7200) { // 2 hours
          isKill = true;
        }
      }
    }

    if (isKill) {
      kills[msg.author_id] = (kills[msg.author_id] || 0) + 1;
    }
  }

  return kills;
}

// ==================== MAIN GENERATION ====================

function computeContentStats(userId, rawWordsMap) {
  // Use pre-computed map from vocabulary function to avoid re-parsing
  // Note: rawWordsMap contains { stem: { word: "raw", count: X } }

  // We need to re-scan for just top words if we want "most used words" generally, 
  // but let's just use the same logic as before to be safe.

  console.log(`  Computing word frequencies...`);
  const msgs = db.prepare(`
        SELECT content 
        FROM messages 
        WHERE author_id = ? AND strftime('%Y', timestamp, 'localtime') = ?
    `).all(userId, TARGET_YEAR.toString());

  const wordCounts = {};
  const rawWords = {};

  for (const row of msgs) {
    if (!row.content) continue;
    // Strip Discord emojis and mentions before splitting
    const cleanContent = row.content.toLowerCase()
      .replace(/<a?:\w+:\d+>/g, '') // Strip emojis <:name:id>
      .replace(/<@!?\d+>/g, '')     // Strip user mentions
      .replace(/<#\d+>/g, '');      // Strip channel mentions

    const words = cleanContent.split(/[\s,.!?":;()\[\]<>{}|\\/+=*&^%$#@~`]+/);
    for (let w of words) {
      if ((w.length < 4 && w !== 'uwu' && w !== 'owo') || STOPWORDS.has(w)) continue;
      if (isLikelyLink(w) || isGarbageWord(w)) continue;
      if (/^\d+$/.test(w)) continue;
      const s = getStem(w);
      wordCounts[s] = (wordCounts[s] || 0) + 1;
      if (!rawWords[s]) rawWords[s] = w;
    }
  }

  return Object.entries(wordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([k, v]) => ({ word: rawWords[k], count: v }));
}

function computeInlineEmojis(userId) {
  const msgs = db.prepare(`
        SELECT content 
        FROM messages 
        WHERE author_id = ? AND strftime('%Y', timestamp, 'localtime') = ?
    `).all(userId, TARGET_YEAR.toString());

  const emojiCounts = {};
  const emojiIds = {}; // Track most common ID for each emoji name
  const customEmojiRegex = /<a?:(\w+):(\d+)>/g;

  // Broad regex for unicode emojis
  // This covers most common emoji ranges
  const unicodeEmojiRegex = /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/g;

  for (const row of msgs) {
    if (!row.content) continue;

    // 1. Custom Discord Emojis
    let customMatch;
    while ((customMatch = customEmojiRegex.exec(row.content)) !== null) {
      const name = customMatch[1];
      const id = customMatch[2];
      emojiCounts[name] = (emojiCounts[name] || 0) + 1;

      if (!emojiIds[name] || emojiCounts[name] > (emojiIds[name].count || 0)) {
        emojiIds[name] = { id, count: emojiCounts[name] };
      }
      downloadEmoji(id);
    }

    // 2. Unicode Emojis
    let unicodeMatch;
    while ((unicodeMatch = unicodeEmojiRegex.exec(row.content)) !== null) {
      const emoji = unicodeMatch[0];
      // Use the emoji character as both name and key for unicode emojis
      emojiCounts[emoji] = (emojiCounts[emoji] || 0) + 1;
    }
  }

  return { counts: emojiCounts, ids: emojiIds };
}

function computeRepliesMetrics(userId) {
  console.log(`  Computing replies metrics for ${userId}...`);
  const repliesTo = db.prepare(`
        SELECT u.id, u.name, u.avatar_url, COUNT(*) as count
        FROM messages m1
        JOIN messages m2 ON m1.reply_to_msg_id = m2.id
        JOIN users u ON m2.author_id = u.id
        WHERE m1.author_id = ? AND strftime('%Y', m1.timestamp, 'localtime') = ?
        AND u.name != 'Link Expander'
        AND u.id != ?
        GROUP BY u.id
        ORDER BY count DESC
        LIMIT 5
    `).all(userId, TARGET_YEAR.toString(), userId);

  const repliedBy = db.prepare(`
        SELECT u.id, u.name, u.avatar_url, COUNT(*) as count
        FROM messages m1
        JOIN messages m2 ON m2.reply_to_msg_id = m1.id
        JOIN users u ON m2.author_id = u.id
        WHERE m1.author_id = ? AND strftime('%Y', m2.timestamp, 'localtime') = ?
        AND u.name != 'Link Expander'
        AND u.id != ?
        GROUP BY u.id
        ORDER BY count DESC
        LIMIT 5
    `).all(userId, TARGET_YEAR.toString(), userId);

  if (repliesTo.length > 0 && repliedBy.length > 0 && repliesTo[0].id === repliedBy[0].id && repliesTo[0].count === repliedBy[0].count) {
    console.log(`    ⚠️  REPLY DEBUG [${userId}]: Symmetry detected with ${repliesTo[0].name} (${repliesTo[0].count} replies)`);
  }

  return { repliesTo, repliedBy };
}

function computeMonthlyDistribution(userId) {
  const months = db.prepare(`
        SELECT strftime('%m', timestamp, 'localtime') as month, COUNT(*) as count
        FROM messages
        WHERE author_id = ? AND strftime('%Y', timestamp, 'localtime') = ?
        GROUP BY month
    `).all(userId, TARGET_YEAR.toString());

  const monthlyDist = new Array(12).fill(0);
  months.forEach(m => monthlyDist[parseInt(m.month) - 1] = m.count);
  return monthlyDist;
}

async function generate() {
  console.log('='.repeat(60));
  console.log('🚀 Generating Discord Wrapped - Complete Analytics');
  console.log('='.repeat(60));
  console.log('');

  // Discover emojis from input files
  const hasEmojis = fs.existsSync(EMOJI_DIR) && fs.readdirSync(EMOJI_DIR).length > 0;
  const forceEmojis = process.argv.includes('--force-emojis');

  if (!hasEmojis || forceEmojis) {
    GLOBAL_EMOJI_MAP = await discoverAllEmojis();
  } else {
    console.log('💡 Emoji directory already exists and contains files. Skipping global scan.');
    console.log('   (Use --force-emojis to run the scan and download missing emojis)\n');
    GLOBAL_EMOJI_MAP = {};
  }

  // Pre-compute starboard counts
  const starboardCounts = computeAllStarboardCounts();

  // Pre-compute conversation kills
  const conversationKills = computeAllKills();

  console.log('Computing server-wide word frequencies for TF-IDF...');
  const allMessages = db.prepare(`
        SELECT content FROM messages WHERE strftime('%Y', timestamp, 'localtime') = ?
    `).all(TARGET_YEAR.toString());

  const serverWordFreqs = { _total: 0 };
  for (const row of allMessages) {
    if (!row.content) continue;
    // Strip Discord emojis and mentions before splitting to avoid emoji names appearing as words
    const cleanContent = row.content.toLowerCase()
      .replace(/<a?:\w+:\d+>/g, '') // Strip emojis <:name:id>
      .replace(/<@!?\d+>/g, '')     // Strip user mentions
      .replace(/<#\d+>/g, '');      // Strip channel mentions

    const words = cleanContent.split(/[\s,.!?":;()\[\]<>{}|\\/+=*&^%$#@~`]+/);
    for (let w of words) {
      if ((w.length < 4 && w !== 'uwu' && w !== 'owo') || STOPWORDS.has(w)) continue;
      if (isLikelyLink(w) || isGarbageWord(w)) continue;
      if (/^\d+$/.test(w)) continue;
      const s = getStem(w);
      if (s.length < 3 && s !== 'uwu' && s !== 'owo') continue;
      serverWordFreqs[s] = (serverWordFreqs[s] || 0) + 1;
      serverWordFreqs._total++;
    }
  }
  console.log(`Total server words analyzed: ${serverWordFreqs._total}\n`);

  const guildStats = db.prepare(`
        SELECT 
            (SELECT COUNT(*) FROM messages WHERE strftime('%Y', timestamp, 'localtime') = ?) as totalMessages,
            (SELECT COUNT(DISTINCT author_id) FROM messages WHERE strftime('%Y', timestamp, 'localtime') = ?) as activeUsers,
            (SELECT COUNT(DISTINCT channel_id) FROM messages WHERE strftime('%Y', timestamp, 'localtime') = ?) as activeChannels
    `).get(TARGET_YEAR.toString(), TARGET_YEAR.toString(), TARGET_YEAR.toString());

  const topChannels = db.prepare(`
        SELECT c.id, c.name, COUNT(m.id) as count 
        FROM messages m 
        JOIN channels c ON m.channel_id = c.id
        WHERE strftime('%Y', m.timestamp, 'localtime') = ?
        GROUP BY c.id 
        ORDER BY count DESC 
        LIMIT 10
    `).all(TARGET_YEAR.toString());

  const guildInfo = db.prepare('SELECT guild_id, guild_name FROM channels LIMIT 1').get() || { guild_id: '0', guild_name: 'Fantastyczna Karczma' };
  const guildId = guildInfo.guild_id;
  const guildName = guildInfo.guild_name;

  const activeUsers = db.prepare(`
        SELECT u.id, u.name, u.nickname, u.avatar_url, u.is_bot, COUNT(m.id) as msg_count
        FROM users u
        JOIN messages m ON u.id = m.author_id
        WHERE strftime('%Y', m.timestamp, 'localtime') = ? AND u.is_bot = 0
        GROUP BY u.id
        ORDER BY msg_count DESC
    `).all(TARGET_YEAR.toString());

  console.log(`Found ${activeUsers.length} active users.\n`);

  // Allow limiting users for faster testing
  const limit = process.argv.includes('--limit') ? parseInt(process.argv[process.argv.indexOf('--limit') + 1]) || 3 : activeUsers.length;
  const usersToProcess = activeUsers.slice(0, limit);

  const outputUsers = usersToProcess.map((u, index) => {
    console.log(`\n[${index + 1}/${usersToProcess.length}] 👤 ${u.name}`);
    console.log('-'.repeat(60));

    const rank = index + 1;
    // V2: Percentile calculation that hits 100 for rank 1
    const percentile = Number((((activeUsers.length - rank + 1) / activeUsers.length) * 100).toFixed(1));

    const activeDays = db.prepare(`
            SELECT COUNT(DISTINCT date(timestamp, 'localtime')) as count 
            FROM messages 
            WHERE author_id = ? AND strftime('%Y', timestamp, 'localtime') = ?
        `).get(u.id, TARGET_YEAR.toString()).count;

    const hours = db.prepare(`
            SELECT strftime('%H', timestamp, 'localtime') as hour, COUNT(*) as count
            FROM messages
            WHERE author_id = ? AND strftime('%Y', timestamp, 'localtime') = ?
            GROUP BY hour
        `).all(u.id, TARGET_YEAR.toString());

    const hourlyDist = new Array(24).fill(0);
    hours.forEach(h => hourlyDist[parseInt(h.hour)] = h.count);

    const days = db.prepare(`
            SELECT strftime('%w', timestamp, 'localtime') as day, COUNT(*) as count
            FROM messages
            WHERE author_id = ? AND strftime('%Y', timestamp, 'localtime') = ?
            GROUP BY day
        `).all(u.id, TARGET_YEAR.toString());

    const dailyDist = new Array(7).fill(0);
    days.forEach(d => dailyDist[parseInt(d.day)] = d.count);

    const monthlyDist = computeMonthlyDistribution(u.id);
    const mostActiveMonth = monthlyDist.indexOf(Math.max(...monthlyDist)) + 1;

    const userChannels = db.prepare(`
            SELECT c.id, c.name, c.category_name, c.type, COUNT(m.id) as count
            FROM messages m
            JOIN channels c ON m.channel_id = c.id
            WHERE m.author_id = ? AND strftime('%Y', m.timestamp, 'localtime') = ?
            GROUP BY c.id
            ORDER BY count DESC
        `).all(u.id, TARGET_YEAR.toString())
      .map(c => ({
        ...c,
        percentage: Math.round((c.count / u.msg_count) * 100)
      }))
      .filter(c => c.percentage >= 1);

    const topMentions = db.prepare(`
            SELECT u.id, u.name, u.avatar_url, COUNT(*) as count
            FROM mentions mn
            JOIN messages m ON mn.message_id = m.id
            JOIN users u ON mn.mentioned_user_id = u.id
            WHERE m.author_id = ? AND strftime('%Y', m.timestamp, 'localtime') = ?
            AND u.name != 'Link Expander'
            AND u.id != ?
            GROUP BY u.id
            ORDER BY count DESC
            LIMIT 5
        `).all(u.id, TARGET_YEAR.toString(), u.id);

    const topMentionedBy = db.prepare(`
            SELECT u.id, u.name, u.avatar_url, COUNT(*) as count
            FROM mentions mn
            JOIN messages m ON mn.message_id = m.id
            JOIN users u ON m.author_id = u.id
            WHERE mn.mentioned_user_id = ? AND strftime('%Y', m.timestamp, 'localtime') = ?
            AND u.name != 'Link Expander'
            AND u.id != ?
            GROUP BY u.id
            ORDER BY count DESC
            LIMIT 5
        `).all(u.id, TARGET_YEAR.toString(), u.id);

    const { repliesTo, repliedBy } = computeRepliesMetrics(u.id);
    const { topReactors, topReactedTo } = computeReactionRelationships(u.id);

    const inlineEmojis = computeInlineEmojis(u.id);

    // Get reactions sent including IDs to download them
    const reactionsSent = db.prepare(`
            SELECT emoji_name as key, emoji_id, COUNT(*) as count
            FROM reactions
            WHERE user_id = ? 
            AND message_id IN (SELECT id FROM messages WHERE strftime('%Y', timestamp, 'localtime') = ?)
            GROUP BY emoji_name, emoji_id
            ORDER BY count DESC
            LIMIT 10
        `).all(u.id, TARGET_YEAR.toString());

    // Download reaction emojis
    reactionsSent.forEach(r => {
      if (r.emoji_id) downloadEmoji(r.emoji_id);
    });

    const emojiIdMap = {}; // Map: normalized emoji name -> emoji ID
    const emojiKeyMap = {}; // Map: normalized emoji name -> original key (for display)

    const emojisInlineMap = {}; // Map: normalized emoji name -> count
    const reactionsSentMap = {}; // Map: normalized emoji name -> count
    const emojisSentCombined = {}; // Map: normalized emoji name -> count

    // Process inline emojis
    for (const [name, count] of Object.entries(inlineEmojis.counts || {})) {
      const nameNormalized = normalizeEmojiName(name);
      if (!nameNormalized) continue;

      emojisInlineMap[nameNormalized] = (emojisInlineMap[nameNormalized] || 0) + count;
      emojisSentCombined[nameNormalized] = (emojisSentCombined[nameNormalized] || 0) + count;

      // Store the most common ID for this emoji name
      if (inlineEmojis.ids && inlineEmojis.ids[name] && inlineEmojis.ids[name].id) {
        emojiIdMap[nameNormalized] = inlineEmojis.ids[name].id;
      }
      // Also check global emoji map as fallback
      if (!emojiIdMap[nameNormalized] && GLOBAL_EMOJI_MAP[nameNormalized]) {
        emojiIdMap[nameNormalized] = GLOBAL_EMOJI_MAP[nameNormalized];
      }

      // Store the original key for display (prefer one without suffix)
      if (!emojiKeyMap[nameNormalized] || !emojiKeyMap[nameNormalized].match(/[-_\d]/)) {
        emojiKeyMap[nameNormalized] = name;
      }
    }

    // Process reaction emojis
    for (const emoji of reactionsSent) {
      const keyNormalized = normalizeEmojiName(emoji.key);
      if (!keyNormalized) continue;

      reactionsSentMap[keyNormalized] = (reactionsSentMap[keyNormalized] || 0) + emoji.count;
      emojisSentCombined[keyNormalized] = (emojisSentCombined[keyNormalized] || 0) + emoji.count;

      // Store emoji ID if available
      if (emoji.emoji_id) {
        emojiIdMap[keyNormalized] = emoji.emoji_id;
      }
      // Also check global emoji map
      if (!emojiIdMap[keyNormalized] && GLOBAL_EMOJI_MAP[keyNormalized]) {
        emojiIdMap[keyNormalized] = GLOBAL_EMOJI_MAP[keyNormalized];
      }

      // Store the original key for display (prefer one without suffix)
      if (!emojiKeyMap[keyNormalized] || !emojiKeyMap[keyNormalized].match(/[-_\d]/)) {
        emojiKeyMap[keyNormalized] = emoji.key;
      }
    }

    const mapToTopList = (map) => Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30) // Increased from 10 to 30 to allow filtering in UI
      .map(([normalizedKey, count]) => ({
        key: emojiKeyMap[normalizedKey] || normalizedKey,
        count,
        emoji_id: emojiIdMap[normalizedKey] || null
      }));

    const topEmojisSent = mapToTopList(emojisSentCombined);
    const topEmojisInline = mapToTopList(emojisInlineMap);
    const topReactionsSent = mapToTopList(reactionsSentMap);

    const topEmojisReceivedRaw = db.prepare(`
            SELECT r.emoji_name as key, r.emoji_id, COUNT(*) as count
            FROM reactions r
            JOIN messages m ON r.message_id = m.id
            WHERE m.author_id = ? AND strftime('%Y', m.timestamp, 'localtime') = ?
            GROUP BY r.emoji_name, r.emoji_id
            ORDER BY count DESC
            LIMIT 30
        `).all(u.id, TARGET_YEAR.toString());

    // Download received reaction emojis
    topEmojisReceivedRaw.forEach(r => {
      if (r.emoji_id) downloadEmoji(r.emoji_id);
    });

    // Combine by normalized emoji name, keeping the most common ID
    const receivedEmojiMapNormalized = {};
    const receivedEmojiKeyMap = {}; // Track original key for display

    for (const emoji of topEmojisReceivedRaw) {
      const keyNormalized = normalizeEmojiName(emoji.key);
      if (!keyNormalized) continue;

      if (!receivedEmojiMapNormalized[keyNormalized]) {
        receivedEmojiMapNormalized[keyNormalized] = {
          count: emoji.count,
          emoji_id: emoji.emoji_id || GLOBAL_EMOJI_MAP[keyNormalized] || null
        };
        receivedEmojiKeyMap[keyNormalized] = emoji.key;
      } else if (emoji.count > receivedEmojiMapNormalized[keyNormalized].count) {
        receivedEmojiMapNormalized[keyNormalized].count = emoji.count;
        // Update with ID if this one has it
        if (emoji.emoji_id) {
          receivedEmojiMapNormalized[keyNormalized].emoji_id = emoji.emoji_id;
        }
        // Also update key to prefer ones without suffix
        if (!emoji.key.match(/[-_\d]/)) {
          receivedEmojiKeyMap[keyNormalized] = emoji.key;
        }
      } else if (emoji.count === receivedEmojiMapNormalized[keyNormalized].count) {
        // If same count, prefer the one with an ID
        if (emoji.emoji_id && !receivedEmojiMapNormalized[keyNormalized].emoji_id) {
          receivedEmojiMapNormalized[keyNormalized].emoji_id = emoji.emoji_id;
        }
        // Prefer key without suffix
        if (!emoji.key.match(/[-_\d]/) && receivedEmojiKeyMap[keyNormalized].match(/[-_\d]/)) {
          receivedEmojiKeyMap[keyNormalized] = emoji.key;
        }
      }
    }

    const topEmojisReceived = Object.entries(receivedEmojiMapNormalized)
      .map(([normalizedKey, data]) => ({
        key: receivedEmojiKeyMap[normalizedKey] || normalizedKey,
        count: data.count,
        emoji_id: data.emoji_id
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 30); // Increased from 10 to 30 to allow filtering in UI

    const topWords = computeContentStats(u.id);

    const avgLength = db.prepare(`
            SELECT AVG(char_count) as avg_char, AVG(word_count) as avg_word
            FROM messages
            WHERE author_id = ? AND strftime('%Y', timestamp, 'localtime') = ?
        `).get(u.id, TARGET_YEAR.toString());

    const attachmentCount = db.prepare(`
            SELECT COUNT(*) as count FROM messages
            WHERE author_id = ? AND strftime('%Y', timestamp, 'localtime') = ? AND has_attachments = 1
        `).get(u.id, TARGET_YEAR.toString()).count;

    const attachmentTypesRaw = db.prepare(`
            SELECT attachment_types 
            FROM messages 
            WHERE author_id = ? AND strftime('%Y', timestamp, 'localtime') = ? AND has_attachments = 1
        `).all(u.id, TARGET_YEAR.toString());

    const attachmentStats = { image: 0, video: 0, audio: 0, file: 0 };
    for (const row of attachmentTypesRaw) {
      if (!row.attachment_types) continue;
      row.attachment_types.split(',').forEach(type => {
        if (attachmentStats[type] !== undefined) attachmentStats[type]++;
        else attachmentStats.file++;
      });
    }

    const avgTimeToEdit = db.prepare(`
            SELECT AVG((julianday(timestamp_edited) - julianday(timestamp)) * 86400) as val
            FROM messages
            WHERE author_id = ? AND strftime('%Y', timestamp, 'localtime') = ? AND timestamp_edited IS NOT NULL
        `).get(u.id, TARGET_YEAR.toString())?.val || 0;

    const pinnedMessages = db.prepare(`
            SELECT COUNT(*) as count FROM messages
            WHERE author_id = ? AND strftime('%Y', timestamp, 'localtime') = ? AND is_pinned = 1
        `).get(u.id, TARGET_YEAR.toString()).count;

    const firstMsg = db.prepare(`
            SELECT timestamp FROM messages
            WHERE author_id = ? AND strftime('%Y', timestamp, 'localtime') = ?
            ORDER BY timestamp ASC LIMIT 1
        `).get(u.id, TARGET_YEAR.toString())?.timestamp;

    const lastMsg = db.prepare(`
            SELECT timestamp FROM messages
            WHERE author_id = ? AND strftime('%Y', timestamp, 'localtime') = ?
            ORDER BY timestamp DESC LIMIT 1
        `).get(u.id, TARGET_YEAR.toString())?.timestamp;

    const hourMax = hourlyDist.indexOf(Math.max(...hourlyDist));
    let persona = 'Day Walker';
    if (hourMax >= 22 || hourMax < 5) persona = 'Night Owl';
    else if (hourMax >= 5 && hourMax < 12) persona = 'Early Bird';
    else if (hourMax >= 12 && hourMax < 18) persona = 'Afternoon Chatter';
    else if (hourMax >= 18 && hourMax < 22) persona = 'Evening Regular';

    console.log('  🔬 Computing advanced metrics...');

    const longestStreak = computeLongestStreak(u.id);
    const vocabularyFingerprint = computeVocabularyFingerprint(u.id, serverWordFreqs, null);
    const responseLatency = computeResponseLatency(u.id);
    const chronotype = computeChronotype(hourlyDist);
    const sessionAnalysis = computeSessionAnalysis(u.id);

    // Starboard count - lookup by username (case insensitive)
    const userStarboardCount = starboardCounts[u.name.toLowerCase()] || 0;

    const totalStats = db.prepare(`
            SELECT SUM(char_count) as total_char, SUM(word_count) as total_word
            FROM messages
            WHERE author_id = ? AND strftime('%Y', timestamp, 'localtime') = ?
        `).get(u.id, TARGET_YEAR.toString());

    const totalWords = totalStats.total_word || 0;
    const typingSpeedWPM = 40;
    const typingTimeMinutes = Math.round(totalWords / typingSpeedWPM);

    const metricsObj = {
      totalMessages: u.msg_count,
      totalWords,
      typingTimeMinutes,
      rank,
      percentile,
      activeDays,
      longestStreak,
      mostActiveMonth,
      topChannels: userChannels,
      topWords,
      topEmojisSent,
      topEmojisInline,
      topReactionsSent,
      topEmojisReceived,
      topMentions,
      topMentionedBy,
      topRepliesTo: repliesTo,
      topRepliedBy: repliedBy,
      topReactors,
      topReactedTo,
      hourlyDistribution: hourlyDist,
      dailyDistribution: dailyDist,
      monthlyDistribution: monthlyDist,
      avgMessageLength: Math.round(avgLength.avg_char || 0),
      avgWordCount: Math.round(avgLength.avg_word || 0),
      attachmentCount,
      attachmentStats,
      avgTimeToEdit: Math.round(avgTimeToEdit),
      pinnedMessages,
      firstMessageTimestamp: firstMsg,
      lastMessageTimestamp: lastMsg,
      persona,
      vocabularyFingerprint,
      responseLatency,
      chronotype,
      sessionAnalysis,
      // NEW METRICS
      roleInfo: computeRoleAnalytics(u.id),
      categoryStats: computeCategoryStats(u.id),
      entropy: computeEntropy(u.id, u.msg_count, guildStats.activeChannels),
      contentHabits: computeContentHabits(u.id),
      workLifeBalance: computeWorkLifeBalance(u.id),
      networkStats: computeNetworkStats(u.id),
      voidScore: computeVoidShouter(u.id, u.msg_count),
      conversationStarter: computeConversationStarter(u.id),
      killerCount: conversationKills[u.id] || 0,
      starboardCount: userStarboardCount,
      funniestMessages: computeFunniestMessages(u.id, guildId),
      mostReactedMessages: computeMostReactedMessages(u.id, guildId),
      longestMessage: computeLongestMessage(u.id, guildId),
      mostRepliedToMessage: computeMostRepliedToMessage(u.id, guildId),
      topGifs: computeTopGifs(u.id),
      badges: []
    };

    metricsObj.badges = computeAdvancedBadges(u.id, metricsObj, guildStats);

    console.log(`  ✅ Complete: ${metricsObj.badges.length} badges, ${metricsObj.topWords.length} top words`);

    return {
      id: u.id,
      profile: {
        name: u.name,
        nickname: u.nickname,
        avatarUrl: u.avatar_url,
        isBot: false
      },
      metrics: metricsObj
    };
  });

  const output = {
    meta: {
      year: TARGET_YEAR,
      generatedAt: new Date().toISOString(),
      schemaVersion: '2.1',
      features: ['experimental', 'tf-idf', 'sessions', 'chronotype', 'roles', 'entropy', 'links']
    },
    guild: {
      id: '0',
      name: guildName,
      totalMessages: guildStats.totalMessages,
      activeUsers: guildStats.activeUsers,
      activeChannels: guildStats.activeChannels,
      topChannels,
      globalStats: {
        avgEntropy: 0,
        avgVoidScore: 0,
        avgCapsRatio: 0,
        totalLinks: 0,
        linkTypes: { spotify: 0, youtube: 0, twitter: 0, pixiv: 0, gif: 0, screenshots: 0 }
      }
    },
    users: outputUsers
  };

  // Compute Global Averages
  if (outputUsers.length > 0) {
    const validUsers = outputUsers.filter(u => u.metrics.totalMessages > 10); // Filter noise

    if (validUsers.length > 0) {
      output.guild.globalStats.avgEntropy = Number((validUsers.reduce((sum, u) => sum + (u.metrics.entropy?.normalized || 0), 0) / validUsers.length).toFixed(2));
      output.guild.globalStats.avgVoidScore = Number((validUsers.reduce((sum, u) => sum + (u.metrics.voidScore || 0), 0) / validUsers.length).toFixed(2));
      output.guild.globalStats.avgCapsRatio = Number((validUsers.reduce((sum, u) => sum + (u.metrics.contentHabits?.capsRatio || 0), 0) / validUsers.length).toFixed(3));
    }

    outputUsers.forEach(u => {
      const h = u.metrics.contentHabits;
      if (h) {
        output.guild.globalStats.totalLinks += h.totalLinks;
        output.guild.globalStats.linkTypes.spotify += h.spotifyCount;
        output.guild.globalStats.linkTypes.youtube += h.youtubeCount;
        output.guild.globalStats.linkTypes.twitter += h.twitterCount;
        output.guild.globalStats.linkTypes.pixiv += h.pixivCount;
        output.guild.globalStats.linkTypes.gif += h.gifCount;
        output.guild.globalStats.linkTypes.screenshots += h.screenshotCount;
      }
    });

    // Compute Badge Global Percentages
    const badgeCounts = {};
    outputUsers.forEach(u => {
      if (u.metrics.badges) {
        u.metrics.badges.forEach(b => {
          if (b.achieved) badgeCounts[b.id] = (badgeCounts[b.id] || 0) + 1;
        });
      }
    });

    outputUsers.forEach(u => {
      if (u.metrics.badges) {
        u.metrics.badges.forEach(b => {
          const count = badgeCounts[b.id] || 0;
          b.globalPercentage = ((count / outputUsers.length) * 100).toFixed(1) + '%';
        });
        u.metrics.badges.sort((a, b) => (a.achieved === b.achieved ? 0 : a.achieved ? -1 : 1));
      }
    });
  }

  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));

  console.log('');
  console.log('='.repeat(60));
  console.log(`✅ COMPLETE: Discord Wrapped ${TARGET_YEAR}`);
  console.log('='.repeat(60));
  console.log(`📁 Output: ${OUTPUT_FILE}`);
  console.log(`👥 Users: ${outputUsers.length}`);
  console.log(`💬 Messages: ${guildStats.totalMessages.toLocaleString()}`);
  console.log(`🏆 Features: TF-IDF, Asymmetry, Sessions, Chronotype`);
  console.log('='.repeat(60));
}

generate().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
