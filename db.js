// ፋይል: db.js
require('dotenv').config();
const mysql = require('mysql2');

const db = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT, // የክላውዱን ፖርት እንዲያነብ የተጨመረ
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    // ክላውድ (Aiven) ላይ ያለን ዳታቤዝ ለማገናኘት ይህቺ ጥበቃ (SSL) ግዴታ ናት
    ssl: {
        rejectUnauthorized: false
    }
});

db.getConnection((err, connection) => {
    if (err) {
        console.error('የዳታቤዝ ግንኙነት አልተሳካም (Database Connection Failed):', err.message);
    } else {
        console.log('ከዳታቤዝ ጋር በትክክል ተገናኝቷል! ✅');
        connection.release();
    }
});

module.exports = db;