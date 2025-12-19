import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, 'karczma.db');
const OUTPUT_FILE = path.join(__dirname, '..', 'static', 'global-stats-2025.json');
const EMOJI_DIR = path.join(__dirname, '..', 'static', 'emojis');
const TARGET_YEAR = 2025;

// Ensure emoji directory exists
if (!fs.existsSync(EMOJI_DIR)) {
    fs.mkdirSync(EMOJI_DIR, { recursive: true });
}

// Parse CLI arguments
const args = process.argv.slice(2);
const limitIndex = args.indexOf('--limit');
const LIMIT = limitIndex !== -1 ? parseInt(args[limitIndex + 1]) : null;

const db = new Database(DB_PATH, { readonly: true });

// --- Helpers ---

function downloadEmoji(id) {
    if (!id) return;
    const dest = path.join(EMOJI_DIR, `${id}.png`);
    if (fs.existsSync(dest)) return;

    const url = `https://cdn.discordapp.com/emojis/${id}.png`;
    const file = fs.createWriteStream(dest);

    https.get(url, (response) => {
        if (response.statusCode === 200) {
            response.pipe(file);
        } else {
            file.close();
            fs.unlink(dest, () => { });
            if (response.statusCode === 404) {
                const gifDest = path.join(EMOJI_DIR, `${id}.gif`);
                if (fs.existsSync(gifDest)) return;
                const gifUrl = `https://cdn.discordapp.com/emojis/${id}.gif`;
                const gifFile = fs.createWriteStream(gifDest);
                https.get(gifUrl, (res) => {
                    if (res.statusCode === 200) res.pipe(gifFile);
                    else { gifFile.close(); fs.unlink(gifDest, () => { }); }
                });
            }
        }
    }).on('error', () => { fs.unlink(dest, () => { }); });
}

function stem(word) {
    if (word.length < 4) return word;
    const suffixes = ['ami', 'ach', 'owi', 'om', 'em', 'am', 'ie', 'y', 'a', 'ę', 'o', 'e', 'u', 'i', 'ą', 'ym', 'im', 'ego', 'mu', 'go', 'że', 'ne', 'na', 'no'];
    for (const suffix of suffixes) {
        if (word.endsWith(suffix)) return word.slice(0, -suffix.length);
    }
    return word;
}

const STOPWORDS = new Set([
    'i', 'w', 'z', 'na', 'do', 'ze', 'za', 'o', 'a', 'ale', 'te', 'to', 'jest', 'jak', 'nie', 'tak', 'co', 'po', 'od', 'tym', 'czy', 'bo', 'się', 'ma', 'są', 'będzie', 'było', 'mnie', 'ci', 'mu', 'jej', 'im', 'nam', 'wam', 'ten', 'ta', 'tego', 'tej', 'dla', 'lub', 'ani', 'gdy', 'już', 'może', 'będą', 'kto', 'gdzie', 'kiedy', 'nic', 'wszystko',
    'albo', 'bardzo', 'bez', 'być', 'ciebie', 'czemu', 'dlaczego', 'dziś', 'go', 'ja', 'je', 'jego', 'jeszcze', 'każdy', 'kogo', 'który', 'mam', 'mi', 'mój', 'moje', 'moim', 'my', 'nad', 'nas', 'nawet', 'niech', 'niż', 'no', 'ona', 'one', 'oni', 'ono', 'pan', 'pani', 'pod', 'ponad', 'przed', 'przez', 'przy', 'sam', 'sobą', 'sobie', 'tam', 'teraz', 'to', 'tobą', 'tobie', 'tu', 'twoje', 'twoim', 'twój', 'ty', 'tylko', 'więc', 'właśnie', 'wszyscy', 'wy', 'wiele', 'żaden', 'zawsze', 'że', 'żeby', 'wiem', 'chce', 'chcę', 'wiedzieć', 'powiedzieć', 'robić', 'robic', 'mówić', 'mowic',
    'które', 'która', 'którego', 'której', 'którym', 'którzy', 'mną', 'tobą', 'sobą', 'naszym', 'waszym', 'ich', 'jego', 'jej', 'nam', 'wam', 'mamy', 'macie', 'mają', 'miał', 'miała', 'mieli', 'był', 'była', 'było', 'byli'
]);

// --- Metrics ---

function getTimeline(userFilter = '') {
    console.log('Computing daily timeline...');
    const rows = db.prepare(`
        SELECT date(timestamp) as day, COUNT(*) as count 
        FROM messages 
        WHERE strftime('%Y', timestamp) = ?${userFilter}
        GROUP BY day 
        ORDER BY day ASC
    `).all(TARGET_YEAR.toString());
    return rows;
}

function getHourlyHeatmap(userFilter = '') {
    console.log('Computing hourly heatmap...');
    const rows = db.prepare(`
        SELECT strftime('%H', timestamp) as hour, COUNT(*) as count 
        FROM messages 
        WHERE strftime('%Y', timestamp) = ?${userFilter}
        GROUP BY hour
    `).all(TARGET_YEAR.toString());

    const dist = new Array(24).fill(0);
    rows.forEach(r => dist[parseInt(r.hour)] = r.count);
    return dist;
}

function getWeeklyHeatmap(userFilter = '') {
    console.log('Computing weekly heatmap...');
    const rows = db.prepare(`
        SELECT strftime('%w', timestamp) as day, COUNT(*) as count 
        FROM messages 
        WHERE strftime('%Y', timestamp) = ?${userFilter}
        GROUP BY day
    `).all(TARGET_YEAR.toString());

    const dist = new Array(7).fill(0);
    rows.forEach(r => dist[parseInt(r.day)] = r.count);
    return dist;
}

function getChannelStats(userFilter = '') {
    console.log('Computing channel stats...');
    const channels = db.prepare(`
        SELECT c.name, c.category_name, COUNT(m.id) as count
        FROM messages m
        JOIN channels c ON m.channel_id = c.id
        WHERE strftime('%Y', m.timestamp) = ?${userFilter.replace(/author_id/g, 'm.author_id')}
        GROUP BY c.id
        ORDER BY count DESC
        LIMIT 20
    `).all(TARGET_YEAR.toString());

    const categories = db.prepare(`
        SELECT c.category_name, COUNT(m.id) as count
        FROM messages m
        JOIN channels c ON m.channel_id = c.id
        WHERE strftime('%Y', m.timestamp) = ?${userFilter.replace(/author_id/g, 'm.author_id')}
        GROUP BY c.category_name
        ORDER BY count DESC
    `).all(TARGET_YEAR.toString());

    return { channels, categories };
}

function getGlobalWords(userFilter = '') {
    console.log('Computing global word cloud...');
    const msgs = db.prepare(`
        SELECT content FROM messages WHERE strftime('%Y', timestamp) = ?${userFilter}
    `).all(TARGET_YEAR.toString());

    const counts = {};
    const rawMap = {};

    for (const row of msgs) {
        if (!row.content) continue;
        const words = row.content.toLowerCase().split(/[\s,.!?":;()\[\]<>{}|\\/+=*&^%$#@~`]+/);
        for (const w of words) {
            if (!w || w.includes('http') || w.includes('https') || w.includes('tenor') || w.includes('discord') || w.includes('www')) continue;
            if (/^\d+$/.test(w) || w.length > 15) continue;
            if ((w.length < 4 && w !== 'uwu' && w !== 'owo' && w !== 'xd') || STOPWORDS.has(w)) continue;

            const s = stem(w);
            counts[s] = (counts[s] || 0) + 1;
            if (!rawMap[s]) rawMap[s] = w;
        }
    }

    return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 100)
        .map(([k, v]) => ({ text: rawMap[k], value: v }));
}

function getUserDistribution(userFilter = '') {
    console.log('Computing user activity buckets...');
    const users = db.prepare(`
        SELECT author_id, COUNT(*) as count 
        FROM messages 
        WHERE strftime('%Y', timestamp) = ?${userFilter}
        GROUP BY author_id
    `).all(TARGET_YEAR.toString());

    const buckets = {
        '1-10': 0,
        '11-100': 0,
        '101-500': 0,
        '501-1000': 0,
        '1001-5000': 0,
        '5000+': 0
    };

    for (const u of users) {
        if (u.count <= 10) buckets['1-10']++;
        else if (u.count <= 100) buckets['11-100']++;
        else if (u.count <= 500) buckets['101-500']++;
        else if (u.count <= 1000) buckets['501-1000']++;
        else if (u.count <= 5000) buckets['1001-5000']++;
        else buckets['5000+']++;
    }

    return buckets;
}

function getAttachmentStats(userFilter = '') {
    console.log('Computing attachment breakdown...');
    const rows = db.prepare(`
        SELECT attachment_types FROM messages 
        WHERE has_attachments = 1 AND strftime('%Y', timestamp) = ?${userFilter}
    `).all(TARGET_YEAR.toString());

    const types = { image: 0, video: 0, audio: 0, file: 0 };
    for (const row of rows) {
        if (!row.attachment_types) continue;
        const parts = row.attachment_types.split(',');
        for (const p of parts) {
            if (types[p] !== undefined) types[p]++;
            else types.file++;
        }
    }
    return types;
}

function getLinkStats(userFilter = '') {
    console.log('Computing global link stats...');
    const msgs = db.prepare(`
        SELECT content FROM messages WHERE strftime('%Y', timestamp) = ?${userFilter}
    `).all(TARGET_YEAR.toString());

    const stats = {
        spotify: 0, youtube: 0, twitter: 0, pixiv: 0, gif: 0, total: 0
    };
    const linkRegex = /https?:\/\/[^\s]+/g;

    for (const row of msgs) {
        if (!row.content) continue;
        const links = row.content.match(linkRegex);
        if (links) {
            stats.total += links.length;
            for (const link of links) {
                const l = link.toLowerCase();
                if (l.includes('spotify.com')) stats.spotify++;
                if (l.includes('youtube.com') || l.includes('youtu.be')) stats.youtube++;
                if (l.includes('twitter.com') || l.includes('x.com')) stats.twitter++;
                if (l.includes('pixiv.net')) stats.pixiv++;
                if (l.includes('tenor.com') || l.includes('giphy.com')) stats.gif++;
            }
        }
    }
    return stats;
}

function getEmojiStats(userFilter = '') {
    console.log('Computing global emoji stats...');
    const topEmojis = db.prepare(`
        SELECT emoji_name as name, emoji_id as id, COUNT(*) as count
        FROM reactions
        WHERE message_id IN (SELECT id FROM messages WHERE strftime('%Y', timestamp) = ?${userFilter})
        GROUP BY emoji_name, emoji_id
        ORDER BY count DESC
        LIMIT 50
    `).all(TARGET_YEAR.toString());

    // Trigger downloads for top emojis
    topEmojis.forEach(e => downloadEmoji(e.id));

    return topEmojis;
}

function getMostActiveDay(userFilter = '') {
    const day = db.prepare(`
        SELECT date(timestamp) as date, COUNT(*) as count
        FROM messages
        WHERE strftime('%Y', timestamp) = ?${userFilter}
        GROUP BY date
        ORDER BY count DESC
        LIMIT 1
    `).get(TARGET_YEAR.toString());
    return day;
}

function getInteractionNetwork(userFilter = '') {
    console.log('Computing interaction network...');
    const replies = db.prepare(`
        SELECT m1.author_id as source, m2.author_id as target, COUNT(*) as count
        FROM messages m1
        JOIN messages m2 ON m1.reply_to_msg_id = m2.id
        WHERE strftime('%Y', m1.timestamp) = ?
        AND m1.author_id != m2.author_id
        ${userFilter.replace(/author_id/g, 'm1.author_id')}
        GROUP BY m1.author_id, m2.author_id
    `).all(TARGET_YEAR.toString());

    const pairs = {};
    for (const r of replies) {
        const key = [r.source, r.target].sort().join('-');
        pairs[key] = (pairs[key] || 0) + r.count;
    }

    const topPairs = Object.entries(pairs)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12);

    const result = [];
    const nameStmt = db.prepare('SELECT name, avatar_url FROM users WHERE id = ?');

    for (const [key, count] of topPairs) {
        const [id1, id2] = key.split('-');
        const u1 = nameStmt.get(id1);
        const u2 = nameStmt.get(id2);
        if (u1 && u2) {
            result.push({
                user1: { name: u1.name, avatar: u1.avatar_url },
                user2: { name: u2.name, avatar: u2.avatar_url },
                count
            });
        }
    }
    return result;
}

function getHallOfFame(userFilter = '') {
    console.log('Computing Hall of Fame...');
    const year = TARGET_YEAR.toString();

    const getTopUser = (query, label, valueFormatter = v => v) => {
        const res = db.prepare(query).get(year);
        if (!res) return null;
        const user = db.prepare('SELECT name, avatar_url FROM users WHERE id = ?').get(res.id);
        return {
            title: label,
            user: { name: user?.name, avatar: user?.avatar_url },
            value: valueFormatter(res.val)
        };
    };

    return [
        getTopUser(`
            SELECT author_id as id, COUNT(*) as val FROM messages 
            WHERE strftime('%Y', timestamp) = ?${userFilter} GROUP BY author_id ORDER BY val DESC LIMIT 1
        `, 'Chatterbox', v => `${v.toLocaleString()} msgs`),

        getTopUser(`
            SELECT author_id as id, SUM(word_count) as val FROM messages 
            WHERE strftime('%Y', timestamp) = ?${userFilter} GROUP BY author_id ORDER BY val DESC LIMIT 1
        `, 'Yap God', v => `${v.toLocaleString()} words`),

        getTopUser(`
            SELECT m.author_id as id, COUNT(*) as val FROM reactions r
            JOIN messages m ON r.message_id = m.id
            WHERE strftime('%Y', m.timestamp) = ?${userFilter.replace(/author_id/g, 'm.author_id')} 
            GROUP BY m.author_id ORDER BY val DESC LIMIT 1
        `, 'Reaction Farmer', v => `${v.toLocaleString()} reactions`),

        getTopUser(`
            SELECT author_id as id, COUNT(*) as val FROM messages 
            WHERE strftime('%Y', timestamp) = ? AND has_attachments = 1${userFilter} 
            GROUP BY author_id ORDER BY val DESC LIMIT 1
        `, 'Media Mogul', v => `${v.toLocaleString()} files`),

        getTopUser(`
            SELECT author_id as id, COUNT(*) as val FROM messages 
            WHERE strftime('%Y', timestamp) = ? 
            AND CAST(strftime('%H', timestamp) as INT) BETWEEN 2 AND 5${userFilter}
            GROUP BY author_id ORDER BY val DESC LIMIT 1
        `, 'Nocturnal Beast', v => `${v} night msgs`),

        getTopUser(`
            SELECT user_id as id, COUNT(*) as val FROM reactions
            WHERE message_id IN (SELECT id FROM messages WHERE strftime('%Y', timestamp) = ?${userFilter})
            GROUP BY user_id ORDER BY val DESC LIMIT 1
        `, 'Serial Reactor', v => `${v.toLocaleString()} reacts sent`)
    ].filter(x => x !== null);
}

function getTimeOfDayStats(userFilter = '') {
    console.log('Computing time of day stats...');
    const rows = db.prepare(`
        SELECT 
            CASE 
                WHEN CAST(strftime('%H', timestamp) as INT) BETWEEN 6 AND 11 THEN 'Morning'
                WHEN CAST(strftime('%H', timestamp) as INT) BETWEEN 12 AND 17 THEN 'Afternoon'
                WHEN CAST(strftime('%H', timestamp) as INT) BETWEEN 18 AND 22 THEN 'Evening'
                ELSE 'Night'
            END as period,
            COUNT(*) as count
        FROM messages
        WHERE strftime('%Y', timestamp) = ?${userFilter}
        GROUP BY period
    `).all(TARGET_YEAR.toString());

    return rows;
}

function getGlobalResponseStats(userFilter = '') {
    console.log('Computing response stats...');
    const stats = db.prepare(`
        SELECT 
            AVG(word_count) as avgWords,
            AVG(char_count) as avgChars,
            SUM(CASE WHEN reply_to_msg_id IS NOT NULL THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as replyRate
        FROM messages 
        WHERE strftime('%Y', timestamp) = ?${userFilter}
    `).get(TARGET_YEAR.toString());

    return stats;
}

function generateGlobal() {
    console.log('=============================================');
    console.log(`🌍 Generating Global Discord Stats ${TARGET_YEAR}`);
    if (LIMIT) console.log(`⚠️  LIMITED TO TOP ${LIMIT} USERS`);
    console.log('=============================================');

    let userFilter = '';
    let topUserIds = [];
    if (LIMIT) {
        topUserIds = db.prepare(`
            SELECT author_id 
            FROM messages 
            WHERE strftime('%Y', timestamp) = ? 
            GROUP BY author_id 
            ORDER BY COUNT(*) DESC 
            LIMIT ?
        `).all(TARGET_YEAR.toString(), LIMIT).map(u => u.author_id);

        if (topUserIds.length > 0) {
            userFilter = ` AND author_id IN (${topUserIds.map(id => `'${id}'`).join(',')})`;
        }
    }

    const stats = {
        meta: {
            generatedAt: new Date().toISOString(),
            year: TARGET_YEAR,
            isLimited: !!LIMIT,
            limitCount: LIMIT
        },
        guild: {
            name: "Fantastyczna Karczma",
            activeUsers: db.prepare(`SELECT COUNT(DISTINCT author_id) as count FROM messages WHERE strftime('%Y', timestamp) = ?${userFilter}`).get(TARGET_YEAR.toString()).count,
            totalMessages: db.prepare(`SELECT COUNT(*) as count FROM messages WHERE strftime('%Y', timestamp) = ?${userFilter}`).get(TARGET_YEAR.toString()).count,
        },
        timeline: getTimeline(userFilter),
        hourlyHeatmap: getHourlyHeatmap(userFilter),
        weeklyHeatmap: getWeeklyHeatmap(userFilter),
        channels: getChannelStats(userFilter),
        wordCloud: getGlobalWords(userFilter),
        userDistribution: getUserDistribution(userFilter),
        attachments: getAttachmentStats(userFilter),
        links: getLinkStats(userFilter),
        emojis: getEmojiStats(userFilter),
        mostActiveDay: getMostActiveDay(userFilter),
        roleDistribution: [], // Removed as requested
        interactionNetwork: getInteractionNetwork(userFilter),
        hallOfFame: getHallOfFame(userFilter),

        globalAverages: {
            avgMessageLength: db.prepare(`SELECT AVG(char_count) as val FROM messages WHERE strftime('%Y', timestamp) = ?${userFilter}`).get(TARGET_YEAR.toString())?.val || 0,
            totalReactions: db.prepare(`SELECT COUNT(*) as count FROM reactions WHERE message_id IN (SELECT id FROM messages WHERE strftime('%Y', timestamp) = ?${userFilter})`).get(TARGET_YEAR.toString())?.count || 0,
            totalMentions: db.prepare(`SELECT COUNT(*) as count FROM mentions WHERE message_id IN (SELECT id FROM messages WHERE strftime('%Y', timestamp) = ?${userFilter})`).get(TARGET_YEAR.toString())?.count || 0
        },

        timeOfDay: getTimeOfDayStats(userFilter),
        responseStats: getGlobalResponseStats(userFilter)
    };

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(stats, null, 2));
    console.log(`\n✅ Saved global stats to ${OUTPUT_FILE}`);
}

generateGlobal();
