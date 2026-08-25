// ፋይል: routes/game.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// 1. ያሉትን ማሽኖች ማምጣት
router.get('/assets', (req, res) => {
    db.query(`SELECT * FROM game_assets WHERE status = 'Active'`, (err, results) => { if (err) return res.status(500).json({ error: err.message }); res.json(results); });
});

router.post('/add-asset', (req, res) => {
    db.query(`INSERT INTO game_assets (asset_name) VALUES (?)`, [req.body.asset_name], (err) => { if (err) return res.status(500).json({ error: err.message }); res.json({ message: 'ማሽን ተጨምሯል' }); });
});

router.post('/remove-asset', (req, res) => {
    db.query(`UPDATE game_assets SET status = 'Inactive' WHERE id = ?`, [req.body.asset_id], (err) => { if (err) return res.status(500).json({ error: err.message }); res.json({ message: 'ማሽኑ ተወግዷል' }); });
});

// 2. በተመረጠው ቀን ያለውን ገቢ እና ወጪ ማምጣት (አዲሱ ሎጂክ)
router.get('/data-by-date', (req, res) => {
    const { date } = req.query;
    db.query(`SELECT * FROM game_sales WHERE sale_date = ?`, [date], (err, sales) => {
        if (err) return res.status(500).json({ error: err.message });
        db.query(`SELECT * FROM game_expenses WHERE expense_date = ? ORDER BY id DESC`, [date], (err2, expenses) => {
            if (err2) return res.status(500).json({ error: err2.message });
            res.json({ sales, expenses });
        });
    });
});

// 3. ገቢ መመዝገብ ወይም ማስተካከል (Update / Insert)
router.post('/sales', (req, res) => {
    const { asset_id, daily_income, sale_date } = req.body;
    const targetDate = sale_date || new Date().toISOString().split('T')[0];

    // መጀመሪያ የተመዘገበ እንዳለ ፈልግ
    db.query(`SELECT id FROM game_sales WHERE asset_id = ? AND sale_date = ?`, [asset_id, targetDate], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        
        if (results.length > 0) {
            // ካለ -> አስተካክለው (Update)
            db.query(`UPDATE game_sales SET daily_income = ? WHERE id = ?`, [daily_income, results[0].id], (err2) => {
                if (err2) return res.status(500).json({ error: err2.message }); res.json({ message: 'ገቢው በትክክል ተስተካክሏል! ✅' });
            });
        } else {
            // ከሌለ -> አዲስ መዝግብ (Insert)
            db.query(`INSERT INTO game_sales (asset_id, daily_income, sale_date) VALUES (?, ?, ?)`, [asset_id, daily_income, targetDate], (err3) => {
                if (err3) return res.status(500).json({ error: err3.message }); res.json({ message: 'አዲሱ ገቢ ተመዝግቧል! ✅' });
            });
        }
    });
});

// 4. ወጪ በተመረጠው ቀን መመዝገብ
router.post('/expense', (req, res) => {
    const { expense_name, cost, expense_date } = req.body;
    const targetDate = expense_date || new Date().toISOString().split('T')[0];
    db.query(`INSERT INTO game_expenses (expense_name, cost, expense_date) VALUES (?, ?, ?)`, [expense_name, cost, targetDate], (err) => { 
        if (err) return res.status(500).json({ error: err.message }); res.json({ message: 'ወጪ ተመዝግቧል' }); 
    });
});

// 5. የጌም ሀውስ ሪፖርት
router.get('/report', (req, res) => {
    const query = `
        SELECT 'Daily' AS period, COALESCE((SELECT SUM(daily_income) FROM game_sales WHERE DATE(sale_date) = CURDATE()), 0) AS income, COALESCE((SELECT SUM(cost) FROM game_expenses WHERE DATE(expense_date) = CURDATE()), 0) AS expense
        UNION ALL SELECT 'Monthly', COALESCE((SELECT SUM(daily_income) FROM game_sales WHERE MONTH(sale_date) = MONTH(CURDATE()) AND YEAR(sale_date) = YEAR(CURDATE())), 0), COALESCE((SELECT SUM(cost) FROM game_expenses WHERE MONTH(expense_date) = MONTH(CURDATE()) AND YEAR(expense_date) = YEAR(CURDATE())), 0)
        UNION ALL SELECT 'Yearly', COALESCE((SELECT SUM(daily_income) FROM game_sales WHERE YEAR(sale_date) = YEAR(CURDATE())), 0), COALESCE((SELECT SUM(cost) FROM game_expenses WHERE YEAR(expense_date) = YEAR(CURDATE())), 0)
    `;
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        const report = { daily: {income:0, expense:0, profit:0}, monthly: {income:0, expense:0, profit:0}, yearly: {income:0, expense:0, profit:0} };
        results.forEach(row => { const p = row.period.toLowerCase(); report[p] = { income: row.income, expense: row.expense, profit: row.income - row.expense }; });
        res.json(report);
    });
});

module.exports = router;