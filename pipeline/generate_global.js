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

function isLikelyLink(w) {
    if (w.startsWith('http')) return true;
    if (w.includes('/') && (w.includes('attachments') || w.includes('cdn') || w.includes('com'))) return true;
    if (w.split('/').length > 2) return true;
    return false;
}

function isGarbageWord(w) {
    if (w.includes('=') || w.includes('&')) return true;
    if (w.endsWith('>') || w.startsWith('<')) return true;
    if (/^\d{15,20}$/.test(w)) return true;
    if (w.includes('cdn') || w.includes('discordapp') || w.includes('tenor')) return true;
    return false;
}

function shortenRepeatedChars(w) {
    // Format: "p...p" to indicate the repeated character clearly
    return w.replace(/(.)\1{4,}/g, (match, char) => {
        return `${char}...${char}`;
    });
}

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
    'które', 'która', 'którego', 'której', 'którym', 'którzy', 'mną', 'tobą', 'sobą', 'naszym', 'waszym', 'ich', 'jego', 'jej', 'nam', 'wam', 'mamy', 'macie', 'mają', 'miał', 'miała', 'mieli', 'był', 'była', 'było', 'byli',
    'status', 'vxtwitter', 'view', 'attachments', 'youtube', 'watch'
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
        // Strip Discord emojis and mentions before splitting
        const cleanContent = row.content.toLowerCase()
            .replace(/<a?:\w+:\d+>/g, '') // Strip emojis <:name:id>
            .replace(/<@!?\d+>/g, '')     // Strip user mentions
            .replace(/<#\d+>/g, '');      // Strip channel mentions

        const words = cleanContent.split(/[\s,.!?":;()\[\]<>{}|\\/+=*&^%$#@~`]+/);
        for (const w of words) {
            if (!w || isLikelyLink(w) || isGarbageWord(w) || w.includes('tenor') || w.includes('discord') || w.includes('www')) continue;
            if (/^\d+$/.test(w) || w.length > 15) continue;
            if ((w.length < 4 && w !== 'uwu' && w !== 'owo' && w !== 'xd') || STOPWORDS.has(w)) continue;

            const s = stem(w);
            const displayWord = shortenRepeatedChars(w);
            counts[s] = (counts[s] || 0) + 1;
            if (!rawMap[s]) rawMap[s] = displayWord;
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
        LIMIT 100
    `).all(TARGET_YEAR.toString());

    // Add server differentiation for specific emojis
    const differentiated = topEmojis.map(e => {
        if (e.id === '909369353554771989') return { ...e, server: 'Karczma' };
        if (e.id === '729822486799319071') return { ...e, server: 'Vtuberkowy' };
        return e;
    });

    // Trigger downloads for top emojis
    console.log('\n--- TOP 5 EMOJIS DEBUG ---');
    differentiated.slice(0, 5).forEach((e, idx) => console.log(`[${idx}]`, JSON.stringify(e, null, 2)));
    console.log('--------------------------\n');

    differentiated.forEach(e => downloadEmoji(e.id));

    return differentiated;
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
        .slice(0, 60);

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
    const assignedUserIds = new Set();

    // --- Starboard Data Pre-computation ---
    console.log('  Processing starboard data for badges...');
    const starboardUserData = {}; // author_id -> { totalPosts, totalStars, maxStars }
    let globalMaxStars = -1;
    let globalBestPost = null; // { author_id, stars }

    const inputDir = path.join(__dirname, 'input');
    const files = fs.readdirSync(inputDir);
    const starboardFile = files.find(f => f.includes('starboard') && f.includes('951084270313672744'));

    if (starboardFile) {
        const filePath = path.join(inputDir, starboardFile);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const authorCache = new Map(); // original_msg_id -> author_id

        if (data.messages) {
            for (const msg of data.messages) {
                if (msg.embeds && msg.embeds.length > 0) {
                    const embed = msg.embeds[0];
                    const originalMsgId = embed.footer?.text;
                    if (!originalMsgId || !/^\d+$/.test(originalMsgId)) continue;

                    let authorId = authorCache.get(originalMsgId);
                    if (!authorId) {
                        const row = db.prepare('SELECT author_id FROM messages WHERE id = ?').get(originalMsgId);
                        if (row) {
                            authorId = row.author_id;
                            authorCache.set(originalMsgId, authorId);
                        }
                    }

                    if (authorId) {
                        const stars = (msg.reactions || []).reduce((sum, r) => sum + (r.count || 0), 0);

                        if (!starboardUserData[authorId]) {
                            starboardUserData[authorId] = { totalPosts: 0, totalStars: 0, maxStars: 0 };
                        }

                        starboardUserData[authorId].totalPosts++;
                        starboardUserData[authorId].totalStars += stars;
                        if (stars > starboardUserData[authorId].maxStars) {
                            starboardUserData[authorId].maxStars = stars;
                        }

                        if (stars > globalMaxStars) {
                            globalMaxStars = stars;
                            globalBestPost = { author_id: authorId, stars };
                        }
                    }
                }
            }
        }
    }
    console.log(`  Found ${Object.keys(starboardUserData).length} users with starboard presence.`);

    // Exclude specific users by name
    const excludedNames = ['Pingu'];
    for (const name of excludedNames) {
        const user = db.prepare('SELECT id FROM users WHERE name = ?').get(name);
        if (user) {
            assignedUserIds.add(user.id);
            console.log(`    🚫 Excluding ${name} (${user.id}) from Hall of Fame`);
        }
    }

    const getTopUser = (query, label, valueFormatter = v => v, skipIds = new Set()) => {
        let sql = query;
        let idField = 'author_id';
        if (sql.includes('user_id')) idField = 'user_id';
        if (sql.includes('m.author_id')) idField = 'm.author_id';

        if (skipIds.size > 0) {
            const placeholders = Array.from(skipIds).map(id => `'${id}'`).join(',');
            // Insert NOT IN clause before GROUP BY or ORDER BY
            if (sql.includes('GROUP BY')) {
                sql = sql.replace('GROUP BY', `AND ${idField} NOT IN (${placeholders}) GROUP BY`);
            } else if (sql.includes('ORDER BY')) {
                // If no group by, we might need a WHERE clause adjustment
                if (sql.includes('WHERE')) {
                    sql = sql.replace('ORDER BY', `AND ${idField} NOT IN (${placeholders}) ORDER BY`);
                } else {
                    sql = sql.replace('ORDER BY', `WHERE ${idField} NOT IN (${placeholders}) ORDER BY`);
                }
            }
        }

        const res = db.prepare(sql).get(year);
        if (!res) return null;

        assignedUserIds.add(res.id);
        const user = db.prepare('SELECT name, avatar_url FROM users WHERE id = ?').get(res.id);
        return {
            title: label,
            user: { name: user?.name, avatar: user?.avatar_url },
            value: valueFormatter(res.val)
        };
    };

    const findOmnipresent = (filter = '', skipIds = new Set()) => {
        const userChannels = db.prepare(`
            SELECT author_id, channel_id, COUNT(*) as count
            FROM messages
            WHERE strftime('%Y', timestamp) = ?${filter}
            GROUP BY author_id, channel_id
        `).all(year);

        const userTotals = {};
        const userChannelData = {};

        for (const row of userChannels) {
            userTotals[row.author_id] = (userTotals[row.author_id] || 0) + row.count;
            if (!userChannelData[row.author_id]) userChannelData[row.author_id] = [];
            userChannelData[row.author_id].push({ channel_id: row.channel_id, count: row.count });
        }

        let bestUser = null;
        let maxSignificantChannels = -1;

        for (const [userId, channels] of Object.entries(userChannelData)) {
            if (skipIds.has(userId)) continue;

            const total = userTotals[userId];
            if (total < 500) continue; // Higher threshold for omnipresent

            // Logic: Count channels where (msgs >= 200) AND (msgs >= 1% of total)
            const significantChannels = channels.filter(c => c.count >= 200 && (c.count / total) >= 0.01).length;

            if (significantChannels > maxSignificantChannels) {
                maxSignificantChannels = significantChannels;
                bestUser = { id: userId, val: significantChannels };
            }
        }

        if (!bestUser || maxSignificantChannels === 0) return null;

        assignedUserIds.add(bestUser.id);
        const user = db.prepare('SELECT name, avatar_url FROM users WHERE id = ?').get(bestUser.id);
        return {
            title: 'Wszechobecny',
            user: { name: user?.name, avatar: user?.avatar_url },
            value: `w ${bestUser.val} kanałach`
        };
    };

    const chatterbox = getTopUser(`
        SELECT author_id as id, COUNT(*) as val FROM messages 
        WHERE strftime('%Y', timestamp) = ?${userFilter} GROUP BY author_id ORDER BY val DESC LIMIT 1
    `, 'Gaduła', v => `${v.toLocaleString()} wiadomości`, assignedUserIds);

    const yapGod = getTopUser(`
        SELECT author_id as id, SUM(word_count) as val FROM messages 
        WHERE strftime('%Y', timestamp) = ?${userFilter} GROUP BY author_id ORDER BY val DESC LIMIT 1
    `, 'Mistrz Yappowania', v => `${v.toLocaleString()} słów`, assignedUserIds);

    const reactionFarmer = getTopUser(`
        SELECT m.author_id as id, COUNT(*) as val FROM reactions r
        JOIN messages m ON r.message_id = m.id
        WHERE strftime('%Y', m.timestamp) = ?${userFilter.replace(/author_id/g, 'm.author_id')} 
        GROUP BY m.author_id ORDER BY val DESC LIMIT 1
    `, 'Farmer Reakcji', v => `${v.toLocaleString()} otrzymanych reakcji`, assignedUserIds);

    const mediaMogul = getTopUser(`
        SELECT author_id as id, COUNT(*) as val FROM messages 
        WHERE strftime('%Y', timestamp) = ? AND has_attachments = 1${userFilter} 
        GROUP BY author_id ORDER BY val DESC LIMIT 1
    `, 'Potentat Mediowy', v => `${v.toLocaleString()} plików`, assignedUserIds);

    const omnipresent = findOmnipresent(userFilter, assignedUserIds);

    const serialReactor = getTopUser(`
        SELECT user_id as id, COUNT(*) as val FROM reactions
        WHERE message_id IN (SELECT id FROM messages WHERE strftime('%Y', timestamp) = ?${userFilter})
        GROUP BY user_id ORDER BY val DESC LIMIT 1
    `, 'Seryjny Reaktor', v => `${v.toLocaleString()} wysłanych reakcji`, assignedUserIds);

    // --- New Starboard Badges ---

    // 7. Kolekcjoner Gwiazdek (Most total posts in starboard)
    let starCollector = null;
    let maxStarPosts = -1;
    for (const [authorId, data] of Object.entries(starboardUserData)) {
        if (assignedUserIds.has(authorId)) continue;
        if (data.totalPosts > maxStarPosts) {
            maxStarPosts = data.totalPosts;
            starCollector = { id: authorId, val: data.totalPosts };
        }
    }
    let starCollectorBadge = null;
    if (starCollector) {
        assignedUserIds.add(starCollector.id);
        const user = db.prepare('SELECT name, avatar_url FROM users WHERE id = ?').get(starCollector.id);
        starCollectorBadge = {
            title: 'Kolekcjoner Gwiazdek',
            user: { name: user?.name, avatar: user?.avatar_url },
            value: `${starCollector.val} postów na starboardzie`
        };
    }

    // 8. Gwiazda Karczmy (Best proportion: starboard posts / total messages)
    // Need total messages per user first
    const userTotalMessages = {};
    const totalMsgsRows = db.prepare(`SELECT author_id, COUNT(*) as count FROM messages WHERE strftime('%Y', timestamp) = ? GROUP BY author_id`).all(year);
    for (const row of totalMsgsRows) {
        userTotalMessages[row.author_id] = row.count;
    }

    let starOfTavern = null;
    let bestProportion = -1;
    for (const [authorId, data] of Object.entries(starboardUserData)) {
        if (assignedUserIds.has(authorId)) continue;
        const total = userTotalMessages[authorId] || 0;
        if (total < 100) continue; // Requirement: at least 100 messages overall
        const proportion = data.totalPosts / total;
        if (proportion > bestProportion) {
            bestProportion = proportion;
            starOfTavern = { id: authorId, val: proportion };
        }
    }
    let starOfTavernBadge = null;
    if (starOfTavern) {
        assignedUserIds.add(starOfTavern.id);
        const user = db.prepare('SELECT name, avatar_url FROM users WHERE id = ?').get(starOfTavern.id);
        starOfTavernBadge = {
            title: 'Gwiazda Karczmy',
            user: { name: user?.name, avatar: user?.avatar_url },
            value: `1 na ${Math.round(1 / starOfTavern.val)} wiadomości trafia na starboard`
        };
    }

    // 9. Jednogłośny (Single message with most reactions of a single type)
    const topEmojiOnSingleMessage = db.prepare(`
        SELECT m.author_id as id, r.emoji_name, r.emoji_id, COUNT(*) as val
        FROM reactions r
        JOIN messages m ON r.message_id = m.id
        WHERE strftime('%Y', m.timestamp) = ?
        GROUP BY r.message_id, r.emoji_name, r.emoji_id
        ORDER BY val DESC
    `).all(year);

    let unanimousBadge = null;
    for (const row of topEmojiOnSingleMessage) {
        if (assignedUserIds.has(row.id)) continue;

        assignedUserIds.add(row.id);
        const user = db.prepare('SELECT name, avatar_url FROM users WHERE id = ?').get(row.id);
        unanimousBadge = {
            title: 'Jednogłośny',
            user: { name: user?.name, avatar: user?.avatar_url },
            value: `${row.val.toLocaleString()}x ${row.emoji_name} pod jedną wiadomością`
        };
        break;
    }

    return [
        chatterbox, yapGod, reactionFarmer,
        mediaMogul, omnipresent, serialReactor,
        starCollectorBadge, starOfTavernBadge, unanimousBadge
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

    const totalMessages = db.prepare(`SELECT COUNT(*) as count FROM messages WHERE strftime('%Y', timestamp) = ?${userFilter}`).get(TARGET_YEAR.toString()).count;
    const totalWords = db.prepare(`SELECT SUM(word_count) as val FROM messages WHERE strftime('%Y', timestamp) = ?${userFilter}`).get(TARGET_YEAR.toString())?.val || 0;
    const typingSpeedWPM = 40;
    const timeSpentTypingMinutes = totalWords / typingSpeedWPM;

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
            totalMessages,
            totalWords,
            timeSpentTypingMinutes
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
            totalWords,
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
