import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, 'karczma.db');
const OUTPUT_FILE = path.join(__dirname, '..', 'static', 'monthly-top-2025.json');
const TARGET_YEAR = 2025;

// Excluded channel ID (same as in generate_global.js)
const EXCLUDED_CHANNEL_ID = '875089858144632832';
const EXCLUDED_POPULAR_CHANNEL_IDS = ['875089730759426069', '951084270313672744'];

const db = new Database(DB_PATH, { readonly: true });

function getTopUsersByMonth() {
    console.log('Computing TOP 10 users per month...');
    
    const rows = db.prepare(`
        SELECT 
            strftime('%m', timestamp) as month,
            author_id,
            COUNT(*) as count
        FROM messages
        WHERE strftime('%Y', timestamp) = ? 
        AND channel_id != ?
        GROUP BY month, author_id
        ORDER BY month ASC, count DESC
    `).all(TARGET_YEAR.toString(), EXCLUDED_CHANNEL_ID);

    const monthlyUsers = {};
    
    for (const row of rows) {
        const month = parseInt(row.month);
        if (!monthlyUsers[month]) {
            monthlyUsers[month] = [];
        }
        monthlyUsers[month].push({
            id: row.author_id,
            count: row.count
        });
    }

    // Get user details and limit to TOP 10 per month
    const result = {};
    const getUserStmt = db.prepare('SELECT name, avatar_url FROM users WHERE id = ?');
    
    for (let month = 1; month <= 12; month++) {
        if (!monthlyUsers[month]) {
            result[month] = [];
            continue;
        }
        
        // Sort by count descending and take top 10
        const topUsers = monthlyUsers[month]
            .sort((a, b) => b.count - a.count)
            .slice(0, 10)
            .map(user => {
                const userInfo = getUserStmt.get(user.id);
                return {
                    id: user.id,
                    name: userInfo?.name || 'Unknown',
                    avatar: userInfo?.avatar_url || null,
                    count: user.count
                };
            });
        
        result[month] = topUsers;
    }
    
    return result;
}

function getTopChannelsByMonth() {
    console.log('Computing TOP 10 channels per month...');
    
    const excludedChannels = [EXCLUDED_CHANNEL_ID, ...EXCLUDED_POPULAR_CHANNEL_IDS];
    const excludedChannelsPlaceholders = excludedChannels.map(() => '?').join(',');
    
    const rows = db.prepare(`
        SELECT 
            strftime('%m', m.timestamp) as month,
            m.channel_id,
            c.name,
            c.category_name,
            COUNT(m.id) as count
        FROM messages m
        JOIN channels c ON m.channel_id = c.id
        WHERE strftime('%Y', m.timestamp) = ? 
        AND m.channel_id NOT IN (${excludedChannelsPlaceholders})
        GROUP BY month, m.channel_id
        ORDER BY month ASC, count DESC
    `).all(TARGET_YEAR.toString(), ...excludedChannels);

    const monthlyChannels = {};
    
    for (const row of rows) {
        const month = parseInt(row.month);
        if (!monthlyChannels[month]) {
            monthlyChannels[month] = [];
        }
        monthlyChannels[month].push({
            id: row.channel_id,
            name: row.name,
            category_name: row.category_name,
            count: row.count
        });
    }

    // Limit to TOP 10 per month
    const result = {};
    
    for (let month = 1; month <= 12; month++) {
        if (!monthlyChannels[month]) {
            result[month] = [];
            continue;
        }
        
        // Sort by count descending and take top 10
        const topChannels = monthlyChannels[month]
            .sort((a, b) => b.count - a.count)
            .slice(0, 10)
            .map(channel => ({
                id: channel.id,
                name: channel.name,
                category_name: channel.category_name,
                count: channel.count
            }));
        
        result[month] = topChannels;
    }
    
    return result;
}

function generateMonthlyTop() {
    console.log('=============================================');
    console.log(`📊 Generating Monthly TOP 10 Stats ${TARGET_YEAR}`);
    console.log('=============================================\n');

    const topUsers = getTopUsersByMonth();
    const topChannels = getTopChannelsByMonth();

    const stats = {
        meta: {
            generatedAt: new Date().toISOString(),
            year: TARGET_YEAR
        },
        users: topUsers,
        channels: topChannels
    };

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(stats, null, 2));
    console.log(`\n✅ Saved monthly top stats to ${OUTPUT_FILE}`);
    console.log(`   - Users: ${Object.values(topUsers).reduce((sum, arr) => sum + arr.length, 0)} entries`);
    console.log(`   - Channels: ${Object.values(topChannels).reduce((sum, arr) => sum + arr.length, 0)} entries`);
}

generateMonthlyTop();

