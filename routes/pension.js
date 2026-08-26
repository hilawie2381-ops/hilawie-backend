// ፋይል: routes/pension.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// =========================================================================
// ብልሁ አውቶ-ቼክአውት (Auto-Checkout Middleware) 🚀
// ሲስተሙ በማንኛውም ሰዓት ሲከፈት፣ መውጫ ቀናቸው የደረሰን አልጋዎች አውቶማቲካሊ 'Available' ያደርጋል
// =========================================================================
const autoCheckout = (req, res, next) => {
    const today = new Date().toISOString().split('T')[0];
    
    // የቼክ-አውት ቀናቸው ዛሬ ወይም ከዛሬ በፊት የሆኑትን ክፍሎች 'Available' እናደርጋቸዋለን
    const query = `UPDATE rooms SET status = 'Available', guest_name = NULL, checkout_date = NULL WHERE status = 'Occupied' AND checkout_date <= ?`;
    
    db.query(query, [today], (err) => {
        if (err) console.error("Auto-checkout error:", err);
        next(); // ስራውን ከጨረሰ በኋላ ወደ ተጠየቀው ራውት ያልፈዋል
    });
};

// 1. የክፍሎች ሁኔታ (autoCheckoutን ይጠቀማል)
router.get('/rooms', autoCheckout, (req, res) => {
    db.query(`SELECT * FROM rooms`, (err, results) => { 
        if (err) return res.status(500).json({ error: err.message }); 
        res.json(results); 
    });
});

// 2. ክፍል መያዝ (የሚቆይበትን ቀን አባዝቶ ሒሳብ ይሰራል፣ መውጫ ቀኑንም መዝግቦ ያስቀምጣል)
router.post('/book', autoCheckout, (req, res) => {
    const { room_id, book_date, stay_days, guest_name, city, phone } = req.body;
    
    const targetDate = book_date || new Date().toISOString().split('T')[0];
    const days = parseInt(stay_days) || 1; // ካልተሞላ እንደ 1 ቀን ይቆጠራል

    // መውጫ ቀኑን (Checkout Date) ማስላት: ለምሳሌ ዛሬ + 3 ቀን
    const checkoutDate = new Date(new Date(targetDate).getTime() + (days * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];

    // 1ኛ: ክፍሉን 'Occupied' አድርጎ የደንበኛውን ስም እና መውጫ ቀን መመዝገብ
    const updateRoomQuery = `UPDATE rooms SET status = 'Occupied', guest_name = ?, checkout_date = ? WHERE id = ?`;
    
    db.query(updateRoomQuery, [guest_name, checkoutDate, room_id], (err) => {
        if (err) return res.status(500).json({ error: err.message });

        // 2ኛ: ሒሳቡን መዝገብ (ክፍያው = የአንዱ ቀን ዋጋ x የሚቆይበት ቀን)
        const insertSalesQuery = `INSERT INTO room_sales (room_id, amount_paid, sale_date, guest_name, city, phone, stay_days) 
                                  SELECT id, (price_per_night * ?), ?, ?, ?, ?, ? FROM rooms WHERE id = ?`;
        
        db.query(insertSalesQuery, [days, targetDate, guest_name, city, phone, days, room_id], (err2) => { 
            if (err2) return res.status(500).json({ error: err2.message }); 
            res.json({ message: `ክፍል ተይዟል (እስከ ${checkoutDate})` }); 
        });
    });
});

// 3. ክፍል መልቀቅ (በማንዋል ሲለቀቅ - ቀኑ ሳይደርስ ቢወጣ)
router.post('/checkout', (req, res) => {
    db.query(`UPDATE rooms SET status = 'Available', guest_name = NULL, checkout_date = NULL WHERE id = ?`, [req.body.room_id], (err) => { 
        if (err) return res.status(500).json({ error: err.message }); 
        res.json({ message: 'ክፍል ተለቋል' }); 
    });
});

// 4. ትርፍ ገቢ መመዝገቢያ
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

// 6. በተመረጠው ቀን የተመዘገቡትን ማምጫ
router.get('/data-by-date', autoCheckout, (req, res) => {
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
