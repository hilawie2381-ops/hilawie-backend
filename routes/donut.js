// ፋይል: routes/donut.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// 1. አዲስ ዱቄት መመዝገቢያ (የገባበትን ቀን ጨምሮ)
router.post('/new-batch', (req, res) => {
    const { flour_amount_kg, start_date } = req.body;
    const targetDate = start_date || new Date().toISOString().split('T')[0];
    db.query(`INSERT INTO donut_batches (flour_amount_kg, start_date, status) VALUES (?, ?, 'In_Progress')`, [flour_amount_kg, targetDate], (err) => { 
        if (err) return res.status(500).json({ error: err.message }); 
        res.json({ message: 'አዲስ የዱቄት ዙር ተጀምሯል' }); 
    }); 
});

// 2. የዕለት ሽያጭ መመዝገቢያ
router.post('/sell', (req, res) => {
    const { batch_id, quantity_sold, total_price, sale_date } = req.body;
    const targetDate = sale_date || new Date().toISOString().split('T')[0];
    db.query(`INSERT INTO donut_sales (batch_id, quantity_sold, total_price, sale_date) VALUES (?, ?, ?, ?)`, [batch_id, quantity_sold, total_price, targetDate], (err) => { 
        if (err) return res.status(500).json({ error: err.message }); 
        res.json({ message: 'የዶናት ሽያጭ ተመዝግቧል' }); 
    }); 
});

// 3. አሁን በስራ ላይ ያለውን ዱቄት ማምጫ (አክቲቭ ዙር)
router.get('/active-batch', (req, res) => { 
    db.query(`
        SELECT b.*, DATE_FORMAT(b.start_date, '%Y-%m-%d') as formatted_start_date, 
        COALESCE(SUM(s.total_price), 0) as total_earned, 
        COALESCE(SUM(s.quantity_sold), 0) as total_sold 
        FROM donut_batches b 
        LEFT JOIN donut_sales s ON b.id = s.batch_id 
        WHERE b.status = 'In_Progress' 
        GROUP BY b.id LIMIT 1
    `, (err, results) => { 
        if (err) return res.status(500).json({ error: err.message }); 
        res.json(results.length > 0 ? results[0] : null); 
    }); 
});

// 4. በተመረጠው ቀን የተሸጠውን ማምጫ
router.get('/daily-sales', (req, res) => {
    const { date, batch_id } = req.query;
    if (!batch_id) return res.json([]);
    db.query(`SELECT * FROM donut_sales WHERE sale_date = ? AND batch_id = ? ORDER BY id DESC`, [date, batch_id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// 5. ዱቄቱ ሲያልቅ ዙሩን መዝጊያ
router.post('/finish-batch', (req, res) => { 
    db.query(`UPDATE donut_batches SET status = 'Finished', finished_date = CURDATE() WHERE id = ?`, [req.body.batch_id], (err) => { 
        if (err) return res.status(500).json({ error: err.message }); 
        res.json({ message: 'ዱቄቱ አልቋል፣ ዙር ተዘግቷል' }); 
    }); 
});

module.exports = router;