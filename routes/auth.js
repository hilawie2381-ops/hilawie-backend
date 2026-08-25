// ፋይል: routes/auth.js
const express = require('express');
const router = express.Router();
const db = require('../db'); // ዳታቤዙን ከ db.js ይጠራል

router.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.query(`SELECT * FROM admin_users WHERE username = ? AND password = ?`, [username, password], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length > 0) res.json({ success: true, message: 'በትክክል ገብተዋል' });
        else res.status(401).json({ success: false, error: 'የተሳሳተ ስም!' });
    });
});

module.exports = router;