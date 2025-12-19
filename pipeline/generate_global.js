import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, 'karczma.db');
const OUTPUT_FILE = path.join(__dirname, '..', 'static', 'global-stats-2025.json');
const TARGET_YEAR = 2025;

const db = new Database(DB_PATH, { readonly: true });

// --- Helpers ---

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
    'albo', 'bardzo', 'bez', 'być', 'ciebie', 'czemu', 'dlaczego', 'dziś', 'go', 'ja', 'je', 'jego', 'jeszcze', 'każdy', 'kogo', 'który', 'mam', 'mi', 'mój', 'moje', 'moim', 'my', 'nad', 'nas', 'nawet', 'niech', 'niż', 'no', 'ona', 'one', 'oni', 'ono', 'pan', 'pani', 'pod', 'ponad', 'przed', 'przez', 'przy', 'sam', 'sobą', 'sobie', 'tam', 'teraz', 'to', 'tobą', 'tobie', 'tu', 'twoje', 'twoim', 'twój', 'ty', 'tylko', 'więc', 'właśnie', 'wszyscy', 'wy', 'wiele', 'żaden', 'zawsze', 'że', 'żeby', 'wiem', 'chce', 'chcę', 'wiedzieć', 'powiedzieć', 'robić', 'robic', 'mówić', 'mowic'
]);

// --- Metrics ---

function getTimeline() {
    console.log('Computing daily timeline...');
    const rows = db.prepare(`
        SELECT date(timestamp) as day, COUNT(*) as count 
        FROM messages 
        WHERE strftime('%Y', timestamp) = ?
        GROUP BY day 
        ORDER BY day ASC
    `).all(TARGET_YEAR.toString());
    return rows;
}

function getHourlyHeatmap() {
    console.log('Computing hourly heatmap...');
    const rows = db.prepare(`
        SELECT strftime('%H', timestamp) as hour, COUNT(*) as count 
        FROM messages 
        WHERE strftime('%Y', timestamp) = ?
        GROUP BY hour
    `).all(TARGET_YEAR.toString());

    const dist = new Array(24).fill(0);
    rows.forEach(r => dist[parseInt(r.hour)] = r.count);
    return dist;
}

function getWeeklyHeatmap() {
    console.log('Computing weekly heatmap...');
    const rows = db.prepare(`
        SELECT strftime('%w', timestamp) as day, COUNT(*) as count 
        FROM messages 
        WHERE strftime('%Y', timestamp) = ?
        GROUP BY day
    `).all(TARGET_YEAR.toString());

    // SQLite %w: 0 = Sunday, 1 = Monday...
    const dist = new Array(7).fill(0);
    rows.forEach(r => dist[parseInt(r.day)] = r.count);
    return dist;
}

function getChannelStats() {
    console.log('Computing channel stats...');
    // Top Channels
    const channels = db.prepare(`
        SELECT c.name, c.category_name, COUNT(m.id) as count
        FROM messages m
        JOIN channels c ON m.channel_id = c.id
        WHERE strftime('%Y', m.timestamp) = ?
        GROUP BY c.id
        ORDER BY count DESC
        LIMIT 20
    `).all(TARGET_YEAR.toString());

    // Category Breakdown
    const categories = db.prepare(`
        SELECT c.category_name, COUNT(m.id) as count
        FROM messages m
        JOIN channels c ON m.channel_id = c.id
        WHERE strftime('%Y', m.timestamp) = ?
        GROUP BY c.category_name
        ORDER BY count DESC
    `).all(TARGET_YEAR.toString());

    return { channels, categories };
}

function getGlobalWords() {
    console.log('Computing global word cloud...');
    const msgs = db.prepare(`
        SELECT content FROM messages WHERE strftime('%Y', timestamp) = ?
    `).all(TARGET_YEAR.toString());

    const counts = {};
    const rawMap = {};

    for (const row of msgs) {
        if (!row.content) continue;
        const words = row.content.toLowerCase().split(/[\s,.!?":;()]+/);
        for (const w of words) {
            if ((w.length < 4 && w !== 'uwu' && w !== 'owo') || STOPWORDS.has(w)) continue;
            const s = stem(w);
            counts[s] = (counts[s] || 0) + 1;
            if (!rawMap[s]) rawMap[s] = w;
        }
    }

    return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 50)
        .map(([k, v]) => ({ text: rawMap[k], value: v }));
}

function getUserDistribution() {
    console.log('Computing user activity buckets...');
    const users = db.prepare(`
        SELECT author_id, COUNT(*) as count 
        FROM messages 
        WHERE strftime('%Y', timestamp) = ?
        GROUP BY author_id
    `).all(TARGET_YEAR.toString());

    const buckets = {
        '1-10': 0,
        '11-100': 0,
        '101-500': 0,
        '501-1000': 0,
        '1000-5000': 0,
        '5000+': 0
    };

    for (const u of users) {
        if (u.count <= 10) buckets['1-10']++;
        else if (u.count <= 100) buckets['11-100']++;
        else if (u.count <= 500) buckets['101-500']++;
        else if (u.count <= 1000) buckets['501-1000']++;
        else if (u.count <= 5000) buckets['1000-5000']++;
        else buckets['5000+']++;
    }

    return buckets;
}

function getAttachmentStats() {
    console.log('Computing attachment breakdown...');
    const rows = db.prepare(`
        SELECT attachment_types FROM messages 
        WHERE has_attachments = 1 AND strftime('%Y', timestamp) = ?
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

function getLinkStats() {
    console.log('Computing global link stats...');
    const msgs = db.prepare(`
        SELECT content, channel_id FROM messages WHERE strftime('%Y', timestamp) = ?
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

function getEmojiStats() {
    console.log('Computing global emoji stats...');
    const topEmojis = db.prepare(`
        SELECT emoji_name as name, COUNT(*) as count
        FROM reactions
        WHERE message_id IN (SELECT id FROM messages WHERE strftime('%Y', timestamp) = ?)
        GROUP BY emoji_name
        ORDER BY count DESC
        LIMIT 50
    `).all(TARGET_YEAR.toString());
    return topEmojis;
}

function getBadgesStats() {
    // We can't easily recompute all badges here without duplicating logic from generate.js
    // Ideally, generate_global.js would run AFTER generate.js and read wrap-2025.json
    // But we can approximate some or just skip for now if we want purely SQL-based global stats.
    // However, the user asked to "work like All users put together".
    // Since we are separate, we will stick to SQL aggregations that mirror the user metrics.
    return {};
}

function getMostActiveDay() {
    const day = db.prepare(`
        SELECT date(timestamp) as date, COUNT(*) as count
        FROM messages
        WHERE strftime('%Y', timestamp) = ?
        GROUP BY date
        ORDER BY count DESC
        LIMIT 1
    `).get(TARGET_YEAR.toString());
    return day;
}

function getRoleDistribution() {
    console.log('Computing role distribution...');
    const users = db.prepare('SELECT roles FROM users WHERE is_bot = 0').all();
    const roleCounts = {};

    for (const u of users) {
        if (!u.roles) continue;
        try {
            const roles = JSON.parse(u.roles);
            for (const r of roles) {
                roleCounts[r.name] = (roleCounts[r.name] || 0) + 1;
            }
        } catch (e) { }
    }

    return Object.entries(roleCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15) // Top 15 roles
        .map(([name, count]) => ({ name, count }));
}

function getInteractionNetwork() {
    console.log('Computing interaction network...');
    // A reply B
    const replies = db.prepare(`
        SELECT m1.author_id as source, m2.author_id as target, COUNT(*) as count
        FROM messages m1
        JOIN messages m2 ON m1.reply_to_msg_id = m2.id
        WHERE strftime('%Y', m1.timestamp) = ?
        AND m1.author_id != m2.author_id
        GROUP BY m1.author_id, m2.author_id
    `).all(TARGET_YEAR.toString());

    const pairs = {};

    for (const r of replies) {
        // Create unique key for the pair (sorted IDs)
        const key = [r.source, r.target].sort().join('-');
        pairs[key] = (pairs[key] || 0) + r.count;
    }

    // Resolve names
    const topPairs = Object.entries(pairs)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

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

function getHallOfFame() {
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
            WHERE strftime('%Y', timestamp) = ? GROUP BY author_id ORDER BY val DESC LIMIT 1
        `, 'Chatterbox', v => `${v.toLocaleString()} msgs`),

        getTopUser(`
            SELECT author_id as id, SUM(word_count) as val FROM messages 
            WHERE strftime('%Y', timestamp) = ? GROUP BY author_id ORDER BY val DESC LIMIT 1
        `, 'Yap God', v => `${v.toLocaleString()} words`),

        getTopUser(`
            SELECT m.author_id as id, COUNT(*) as val FROM reactions r
            JOIN messages m ON r.message_id = m.id
            WHERE strftime('%Y', m.timestamp) = ? GROUP BY m.author_id ORDER BY val DESC LIMIT 1
        `, 'Reaction Farmer', v => `${v.toLocaleString()} reactions`),

        getTopUser(`
            SELECT author_id as id, COUNT(*) as val FROM messages 
            WHERE strftime('%Y', timestamp) = ? AND has_attachments = 1 GROUP BY author_id ORDER BY val DESC LIMIT 1
        `, 'Media Mogul', v => `${v.toLocaleString()} files`),

        getTopUser(`
            SELECT author_id as id, COUNT(*) as val FROM messages 
            WHERE strftime('%Y', timestamp) = ? 
            AND CAST(strftime('%H', timestamp) as INT) BETWEEN 2 AND 5
            GROUP BY author_id ORDER BY val DESC LIMIT 1
        `, 'Nocturnal Beast', v => `${v} night msgs`),

        getTopUser(`
            SELECT user_id as id, COUNT(*) as val FROM reactions
            WHERE message_id IN (SELECT id FROM messages WHERE strftime('%Y', timestamp) = ?)
            GROUP BY user_id ORDER BY val DESC LIMIT 1
        `, 'Serial Reactor', v => `${v.toLocaleString()} reacts sent`)
    ].filter(x => x !== null);
}

function generateGlobal() {
    console.log('=============================================');
    console.log('🌍 Generating Global Discord Stats 2025');
    console.log('=============================================');

    const stats = {
        meta: {
            generatedAt: new Date().toISOString(),
            year: TARGET_YEAR
        },
        timeline: getTimeline(),
        hourlyHeatmap: getHourlyHeatmap(),
        weeklyHeatmap: getWeeklyHeatmap(),
        channels: getChannelStats(),
        wordCloud: getGlobalWords(),
        userDistribution: getUserDistribution(),
        attachments: getAttachmentStats(),
        links: getLinkStats(),
        emojis: getEmojiStats(),
        mostActiveDay: getMostActiveDay(),
        roleDistribution: getRoleDistribution(),
        interactionNetwork: getInteractionNetwork(),
        hallOfFame: getHallOfFame(),

        // Aggregates that mimic user-specific stats but for the whole server
        globalAverages: {
            avgMessageLength: db.prepare(`SELECT AVG(char_count) as val FROM messages WHERE strftime('%Y', timestamp) = ?`).get(TARGET_YEAR.toString())?.val || 0,
            totalReactions: db.prepare(`SELECT COUNT(*) as count FROM reactions WHERE message_id IN (SELECT id FROM messages WHERE strftime('%Y', timestamp) = ?)`).get(TARGET_YEAR.toString())?.count || 0,
            totalMentions: db.prepare(`SELECT COUNT(*) as count FROM mentions WHERE message_id IN (SELECT id FROM messages WHERE strftime('%Y', timestamp) = ?)`).get(TARGET_YEAR.toString())?.count || 0
        }
    };

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(stats, null, 2));
    console.log(`\n✅ Saved global stats to ${OUTPUT_FILE}`);
}

generateGlobal();
