import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,      
  user: process.env.DB_USER,       
  password: process.env.DB_PASS,   
  database: process.env.DB_NAME,   
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Function to retrieve a conversation for a given user and npc.
export async function getConversation(userId, npcId) {
  const [rows] = await pool.query(
    "SELECT conversation FROM user_conversations WHERE user_id = ? AND npc_id = ?",
    [userId, npcId]
  );
  if (rows.length > 0) {
    // Check if the conversation is already an object or a string.
    const conv = rows[0].conversation;
    return typeof conv === 'string' ? JSON.parse(conv) : conv;
  }
  return [];
}

// Function to update (or insert) a conversation for a given user and npc.
export async function updateConversation(userId, npcId, conversation) {
  const conversationJSON = JSON.stringify(conversation);
  await pool.query(
    `INSERT INTO user_conversations (user_id, npc_id, conversation) 
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE conversation = ?`,
    [userId, npcId, conversationJSON, conversationJSON]
  );
}

export default pool;
