import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database path relative to this file
const DB_PATH = path.join(__dirname, 'karczma.db');

const db = new Database(DB_PATH);
db.pragma('synchronous = OFF');
db.pragma('journal_mode = MEMORY');

export function initDB() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS meta (
            key TEXT PRIMARY KEY,
            value TEXT
        );

        CREATE TABLE IF NOT EXISTS channels (
            id TEXT PRIMARY KEY,
            name TEXT,
            category_name TEXT,
            type TEXT,
            guild_id TEXT,
            guild_name TEXT,
            message_count INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT,
            discriminator TEXT,
            nickname TEXT,
            avatar_url TEXT,
            roles TEXT,
            is_bot INTEGER
        );

        CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            channel_id TEXT,
            author_id TEXT,
            content TEXT,
            timestamp DATETIME,
            timestamp_edited DATETIME,
            type TEXT,
            is_pinned INTEGER,
            reply_to_msg_id TEXT,
            word_count INTEGER,
            char_count INTEGER,
            has_attachments INTEGER,
            attachment_types TEXT,
            FOREIGN KEY(channel_id) REFERENCES channels(id),
            FOREIGN KEY(author_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS mentions (
            message_id TEXT,
            mentioned_user_id TEXT,
            PRIMARY KEY (message_id, mentioned_user_id),
            FOREIGN KEY(message_id) REFERENCES messages(id),
            FOREIGN KEY(mentioned_user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS reactions (
            message_id TEXT,
            emoji_id TEXT,
            emoji_name TEXT,
            user_id TEXT,
            count INTEGER DEFAULT 1,
            PRIMARY KEY (message_id, emoji_name, user_id),
            FOREIGN KEY(message_id) REFERENCES messages(id),
            FOREIGN KEY(user_id) REFERENCES users(id)
        );
        
        CREATE TABLE IF NOT EXISTS processed_files (
            filename TEXT PRIMARY KEY,
            processed_at DATETIME
        );

        -- Indexes for performance
        CREATE INDEX IF NOT EXISTS idx_messages_author ON messages(author_id);
        CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel_id);
        CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
        CREATE INDEX IF NOT EXISTS idx_messages_year ON messages((strftime('%Y', timestamp)));
        CREATE INDEX IF NOT EXISTS idx_mentions_mentioned ON mentions(mentioned_user_id);
        CREATE INDEX IF NOT EXISTS idx_reactions_user ON reactions(user_id);
        CREATE INDEX IF NOT EXISTS idx_reactions_message ON reactions(message_id);
    `);

    // Migration for existing databases
    try {
        db.exec('ALTER TABLE messages ADD COLUMN attachment_types TEXT');
    } catch (e) { }
    try {
        db.exec('ALTER TABLE channels ADD COLUMN category_name TEXT');
        db.exec('ALTER TABLE channels ADD COLUMN type TEXT');
    } catch (e) { }
    try {
        db.exec('ALTER TABLE users ADD COLUMN roles TEXT');
    } catch (e) { }

    return db;
}

export { db };
