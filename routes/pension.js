// ፋይል: routes/pension.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// 1. የክፍሎች ሁኔታ
router.get('/rooms', (req, res) => {
    db.query(`SELECT * FROM rooms`, (err, results) => { 
        if (err) return res.status(500).json({ error: err.message }); res.json(results); 
    });
});

// 2. ክፍል መያዝ (በተመረጠው ቀን ሒሳቡ ይመዘገባል)
router.post('/book', (req, res) => {
    const targetDate = req.body.book_date || new Date().toISOString().split('T')[0];
    db.query(`UPDATE rooms SET status = 'Occupied' WHERE id = ?`, [req.body.room_id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        db.query(`INSERT INTO room_sales (room_id, amount_paid, sale_date) SELECT id, price_per_night, ? FROM rooms WHERE id = ?`, [targetDate, req.body.room_id], (err2) => { 
            if (err2) return res.status(500).json({ error: err2.message }); res.json({ message: `ክፍል ተይዟል` }); 
        });
    });
});

// 3. ክፍል መልቀቅ
router.post('/checkout', (req, res) => {
    db.query(`UPDATE rooms SET status = 'Available' WHERE id = ?`, [req.body.room_id], (err) => { 
        if (err) return res.status(500).json({ error: err.message }); res.json({ message: 'ክፍል ተለቋል' }); 
    });
});

// 4. ትርፍ ገቢ መመዝገቢያ (የአጭር ሰዓት)
router.post('/extra-income', (req, res) => {
    const { description, amount, income_date } = req.body;
    const targetDate = income_date || new Date().toISOString().split('T')[0];
    db.query(`INSERT INTO pension_extra_income (description, amount, income_date) VALUES (?, ?, ?)`, [description, amount, targetDate], (err) => {
        if (err) return res.status(500).json({ error: err.message }); res.json({ message: 'ትርፍ ገቢ ተመዝግቧል' });
    });
});

// 5. የቀን ወጪ መመዝገቢያ
router.post('/expense', (req, res) => {
    const { expense_name, cost, expense_date } = req.body;
    const targetDate = expense_date || new Date().toISOString().split('T')[0];
    db.query(`INSERT INTO pension_expenses (expense_name, cost, expense_date) VALUES (?, ?, ?)`, [expense_name, cost, targetDate], (err) => {
        if (err) return res.status(500).json({ error: err.message }); res.json({ message: 'ወጪ ተመዝግቧል' });
    });
});

// 6. በተመረጠው ቀን የተመዘገቡትን ሁሉንም ማምጫ
router.get('/data-by-date', (req, res) => {
    const { date } = req.query;
    db.query(`SELECT r.room_number, rs.amount_paid FROM room_sales rs JOIN rooms r ON rs.room_id = r.id WHERE rs.sale_date = ?`, [date], (err1, roomSales) => {
        if (err1) return res.status(500).json({ error: err1.message });
        db.query(`SELECT * FROM pension_extra_income WHERE income_date = ?`, [date], (err2, extraIncomes) => {
            if (err2) return res.status(500).json({ error: err2.message });
            db.query(`SELECT * FROM pension_expenses WHERE expense_date = ?`, [date], (err3, expenses) => {
                if (err3) return res.status(500).json({ error: err3.message });
                res.json({ roomSales, extraIncomes, expenses });
            });
        });
    });
});

module.exports = router;