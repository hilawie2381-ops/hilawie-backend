// ፋይል: routes/inventory.js
const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/items', (req, res) => {
    // ዕቃው ካለቀ (ከሚኒመም በታች ከሆነ) is_low = 1 ይሆናል
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

// 🚀 አዲሱ በስህተት የተገባን ዕቃ ማጥፊያ (Delete) ራውት
router.post('/delete-item', (req, res) => {
    const { item_id } = req.body;
    db.query(`DELETE FROM inventory WHERE id = ?`, [item_id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'ዕቃው ከማከማቻው ተሰርዟል!' });
    });
});

module.exports = router;
