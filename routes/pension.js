// ፋይል: routes/pension.js
const express = require('express');
const router = express.Router();
const db = require('../db');

const autoCheckout = (req, res, next) => {
    const today = new Date().toISOString().split('T')[0];
    const query = `UPDATE rooms SET status = 'Available', guest_name = NULL, checkout_date = NULL WHERE status = 'Occupied' AND checkout_date <= ?`;
    
    db.query(query, [today], (err) => {
        if (err) console.error("Auto-checkout error:", err);
        next();
    });
};

router.get('/rooms', autoCheckout, (req, res) => {
    db.query(`SELECT * FROM rooms`, (err, results) => { 
        if (err) return res.status(500).json({ error: err.message }); 
        res.json(results); 
    });
});

router.post('/book', autoCheckout, (req, res) => {
    // id_photo ተጨምሯል 🚀
    const { room_id, book_date, stay_days, guest_name, city, phone, id_photo } = req.body;
    
    const targetDate = book_date || new Date().toISOString().split('T')[0];
    const days = parseInt(stay_days) || 1; 
    const checkoutDate = new Date(new Date(targetDate).getTime() + (days * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];

    const updateRoomQuery = `UPDATE rooms SET status = 'Occupied', guest_name = ?, checkout_date = ? WHERE id = ?`;
    
    db.query(updateRoomQuery, [guest_name, checkoutDate, room_id], (err) => {
        if (err) return res.status(500).json({ error: err.message });

        // id_photo ወደ ቴብሉ እንዲገባ ተደርጓል
        const insertSalesQuery = `INSERT INTO room_sales (room_id, amount_paid, sale_date, guest_name, city, phone, stay_days, id_photo) 
                                  SELECT id, (price_per_night * ?), ?, ?, ?, ?, ?, ? FROM rooms WHERE id = ?`;
        
        db.query(insertSalesQuery, [days, targetDate, guest_name, city, phone, days, id_photo, room_id], (err2) => { 
            if (err2) return res.status(500).json({ error: err2.message }); 
            res.json({ message: `ክፍል ተይዟል (እስከ ${checkoutDate})` }); 
        });
    });
});

router.post('/checkout', (req, res) => {
    db.query(`UPDATE rooms SET status = 'Available', guest_name = NULL, checkout_date = NULL WHERE id = ?`, [req.body.room_id], (err) => { 
        if (err) return res.status(500).json({ error: err.message }); 
        res.json({ message: 'ክፍል ተለቋል' }); 
    });
});

router.post('/extra-income', (req, res) => {
    const { description, amount, income_date } = req.body;
    const targetDate = income_date || new Date().toISOString().split('T')[0];
    db.query(`INSERT INTO pension_extra_income (description, amount, income_date) VALUES (?, ?, ?)`, [description, amount, targetDate], (err) => {
        if (err) return res.status(500).json({ error: err.message }); res.json({ message: 'ትርፍ ገቢ ተመዝግቧል' });
    });
});

router.post('/expense', (req, res) => {
    const { expense_name, cost, expense_date } = req.body;
    const targetDate = expense_date || new Date().toISOString().split('T')[0];
    db.query(`INSERT INTO pension_expenses (expense_name, cost, expense_date) VALUES (?, ?, ?)`, [expense_name, cost, targetDate], (err) => {
        if (err) return res.status(500).json({ error: err.message }); res.json({ message: 'ወጪ ተመዝግቧል' });
    });
});

router.post('/cancel-booking', (req, res) => {
    const { sale_id, room_id } = req.body;
    db.query(`DELETE FROM room_sales WHERE id = ?`, [sale_id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        db.query(`UPDATE rooms SET status = 'Available', guest_name = NULL, checkout_date = NULL WHERE id = ?`, [room_id], (err2) => { 
            if (err2) return res.status(500).json({ error: err2.message }); 
            res.json({ message: 'ምዝገባው ተሰርዟል' }); 
        });
    });
});

router.get('/data-by-date', autoCheckout, (req, res) => {
    const { date } = req.query;
    
    // rs.id_photo ተጨምሯል 🚀
    db.query(`SELECT rs.id as sale_id, r.id as room_id, r.room_number, rs.amount_paid, rs.guest_name, rs.city, rs.phone, rs.stay_days, rs.id_photo FROM room_sales rs JOIN rooms r ON rs.room_id = r.id WHERE rs.sale_date = ?`, [date], (err1, roomSales) => {
        if (err1) return res.status(500).json({ error: err1.message });
        
        db.query(`SELECT * FROM pension_extra_income WHERE income_date = ?`, [date], (err2, extraIncomes) => {
            if (err2) return res.status(500).json({ error: err2.message });
            
            db.query(`SELECT * FROM pension_expenses WHERE expense_date = ?`, [date], (err3, expenses) => {
                if (err3) return res.status(500).json({ error: err3.message });
                
                const summaryQuery = `
                  SELECT
                    (SELECT COALESCE(SUM(amount_paid), 0) FROM room_sales WHERE YEARWEEK(sale_date, 1) = YEARWEEK(?, 1)) +
                    (SELECT COALESCE(SUM(amount), 0) FROM pension_extra_income WHERE YEARWEEK(income_date, 1) = YEARWEEK(?, 1)) -
                    (SELECT COALESCE(SUM(cost), 0) FROM pension_expenses WHERE YEARWEEK(expense_date, 1) = YEARWEEK(?, 1)) AS weekly,
                    
                    (SELECT COALESCE(SUM(amount_paid), 0) FROM room_sales WHERE MONTH(sale_date) = MONTH(?) AND YEAR(sale_date) = YEAR(?)) +
                    (SELECT COALESCE(SUM(amount), 0) FROM pension_extra_income WHERE MONTH(income_date) = MONTH(?) AND YEAR(income_date) = YEAR(?)) -
                    (SELECT COALESCE(SUM(cost), 0) FROM pension_expenses WHERE MONTH(expense_date) = MONTH(?) AND YEAR(expense_date) = YEAR(?)) AS monthly,
                    
                    (SELECT COALESCE(SUM(amount_paid), 0) FROM room_sales WHERE YEAR(sale_date) = YEAR(?)) +
                    (SELECT COALESCE(SUM(amount), 0) FROM pension_extra_income WHERE YEAR(income_date) = YEAR(?)) -
                    (SELECT COALESCE(SUM(cost), 0) FROM pension_expenses WHERE YEAR(expense_date) = YEAR(?)) AS yearly
                `;
                
                const d = date;
                const params = [d, d, d, d, d, d, d, d, d, d, d, d];
                
                db.query(summaryQuery, params, (err4, summaryResult) => {
                    if (err4) return res.status(500).json({ error: err4.message });
                    
                    res.json({ 
                        roomSales, 
                        extraIncomes, 
                        expenses,
                        period_summary: summaryResult[0] || { weekly: 0, monthly: 0, yearly: 0 }
                    });
                });
            });
        });
    });
});

module.exports = router;
