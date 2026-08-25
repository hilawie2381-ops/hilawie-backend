// ፋይል: server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');

// የፈጠርናቸውን 2 የጥበቃ ኬላዎች (Middlewares) እናመጣለን
const auth = require('./middleware/auth'); 
const sanitize = require('./middleware/sanitize');

const app = express();

// =========================================================
// አዲሱ የ CORS ህግ: ከሞባይል አፕ (APK) ለሚመጡ ጥያቄዎች በሩን ክፍት ያደርጋል
// =========================================================
app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// =========================================================
// የዳታ ማጣሪያ: ማንኛውም መረጃ ወደ ሲስተሙ ከመግባቱ በፊት እዚህ ይጣራል
// =========================================================
app.use(sanitize); 

// ==========================================
// 1. የሎጊን ራውት (ክፍት መሆን ያለበት በር)
// ==========================================
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    // ፓስዋርዱን እዚህ ጋር መቀየር ትችላለህ (አሁን '1234' ነው)
    if (username === 'admin' && password === '1234') { 
        const token = jwt.sign({ id: 1, username: 'admin' }, process.env.JWT_SECRET, { expiresIn: '10h' });
        res.json({ message: 'እንኳን ደህና መጡ!', token: token });
    } else {
        res.status(401).json({ error: 'የተሳሳተ ዩዘርኔም ወይም ፓስዋርድ!' });
    }
});

// ==========================================
// 2. ሌሎች የሲስተሙ ክፍሎች (በ 'auth' ኬላ የተቆለፉ 🔒)
// ==========================================
app.use('/api/dashboard', auth, require('./routes/dashboard'));
app.use('/api/cafe', auth, require('./routes/cafe'));
app.use('/api/pension', auth, require('./routes/pension'));
app.use('/api/game', auth, require('./routes/game'));
app.use('/api/donut', auth, require('./routes/donut'));
app.use('/api/hr', auth, require('./routes/hr'));
app.use('/api/inventory', auth, require('./routes/inventory'));
app.use('/api/admin', auth, require('./routes/admin'));

// ==========================================
// 3. ሰርቨሩን ማስነሻ (Server Listener)
// ==========================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`ሰርቨሩ በፖርት ${PORT} ላይ በትክክል እየሰራ ነው 🚀`);
});
