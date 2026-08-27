// ፋይል: routes/inventory.js
const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/items', (req, res) => {
    db.query(`SELECT *, (stock_quantity <= min_alert_level) as is_low FROM inventory ORDER BY is_low DESC, id DESC`, (err, results) => {
        if(err) return res.status(500).json({error: err.message}); res.json(results);
    });
});

router.post('/add-item', (req, res) => {
    const { item_name, stock_quantity, min_alert_level, unit } = req.body;
    db.query(`INSERT INTO inventory (item_name, stock_quantity, min_alert_level, unit) VALUES (?, ?, ?, ?)`,
    [item_name, stock_quantity, min_alert_level, unit], (err) => {
        if(err) return res.status(500).json({error: err.message}); res.json({message: 'እቃው ተመዝግቧል'});
    });
});

router.post('/update-stock', (req, res) => {
    db.query(`UPDATE inventory SET stock_quantity = stock_quantity + ? WHERE id = ?`, [req.body.quantity_to_add, req.body.item_id], (err) => {
        if(err) return res.status(500).json({error: err.message}); res.json({message: 'ስቶክ ተስተካክሏል'});
    });
});

// 🚀 የተሻሻለው የዕቃ ማጥፊያ ራውት (ካፌው ጋር መገናኘቱን ያጣራል)
router.post('/delete-item', (req, res) => {
    const { item_id, item_name } = req.body;
    
    // በመጀመሪያ ካፌው ላይ ወጪ ተደርጎበት (ጥቅም ላይ ውሎ) እንደሆነ እናጣራለን
    db.query(`SELECT COUNT(*) as usage_count FROM cafe_expenses WHERE item_name = ?`, [item_name], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        
        if (results[0].usage_count > 0) {
            // ካፌው ከተጠቀመበት ማጥፋት አይቻልም (የስህተት መልዕክት እንመልሳለን)
            return res.status(400).json({ error: `ይህንን ዕቃ (${item_name}) ካፌው ውስጥ እየተጠቀሙበት ስለሆነ ማጥፋት አይቻልም!` });
        }
        
        // ካፌው ካልተጠቀመበት ግን እናጠፋዋለን
        db.query(`DELETE FROM inventory WHERE id = ?`, [item_id], (err2) => {
            if (err2) return res.status(500).json({ error: err2.message });
            res.json({ message: 'ዕቃው ከማከማቻው ተሰርዟል!' });
        });
    });
});

module.exports = router;
