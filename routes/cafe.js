// ፋይል: routes/cafe.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// 1. ወጪ መመዝገቢያ (Material / Other) 
router.post('/expense', (req, res) => {
    const { expense_type, item_name, quantity, unit_price, cost, expense_date } = req.body;
    const targetDate = expense_date || new Date().toISOString().split('T')[0];
    const total_cost = expense_type === 'Material' ? (parseFloat(quantity) * parseFloat(unit_price)) : parseFloat(cost);
    
    // 1. ወጪውን በካፌ መዝገብ ላይ ማስገባት
    db.query(`INSERT INTO cafe_expenses (expense_type, item_name, quantity, unit_price, total_cost, expense_date) VALUES (?, ?, ?, ?, ?, ?)`, 
    [expense_type, item_name, quantity || 1, unit_price || 0, total_cost, targetDate], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        
        const matCost = expense_type === 'Material' ? total_cost : 0;
        const othCost = expense_type === 'Other' ? total_cost : 0;
        
        // 2. የዕለቱን ሒሳብ ማጠቃለያ ማዘመን
        db.query(`
            INSERT INTO cafe_daily_summary (summary_date, total_sales, total_material_cost, total_other_expense, net_profit) 
            VALUES (?, 0, ?, ?, -?) 
            ON DUPLICATE KEY UPDATE 
                total_material_cost = total_material_cost + VALUES(total_material_cost),
                total_other_expense = total_other_expense + VALUES(total_other_expense),
                net_profit = total_sales - (total_material_cost + total_other_expense)
        `, [targetDate, matCost, othCost, total_cost], (err2) => {
            if(err2) console.error(err2);
            
            // 3. አዲሱ አሰራር:- ዕቃው 'Material' ከሆነ እና ከዕቃ ማከማቻው ስም ጋር ከተመሳሰለ አውቶማቲክ ይቀንሰዋል
            if (expense_type === 'Material' && item_name && quantity) {
                db.query(`UPDATE inventory SET stock_quantity = stock_quantity - ? WHERE item_name = ?`, [parseFloat(quantity), item_name], (err3) => {
                    if(err3) console.error(err3);
                    res.json({ message: 'ወጪው ተመዝግቦ፣ ከዕቃ ማከማቻውም ላይ ተቀንሷል! ✅' });
                });
            } else {
                res.json({ message: 'ወጪው ተመዝግቧል! ✅' });
            }
        });
    });
});

// 2. ገቢ መመዝገቢያ በተመረጠው ቀን
router.post('/sales', (req, res) => {
    const { total_sales, sale_date } = req.body;
    const targetDate = sale_date || new Date().toISOString().split('T')[0];

    db.query(`
        INSERT INTO cafe_daily_summary (summary_date, total_sales, total_material_cost, total_other_expense, net_profit) 
        VALUES (?, ?, 0, 0, ?) 
        ON DUPLICATE KEY UPDATE 
            total_sales = total_sales + VALUES(total_sales), 
            net_profit = total_sales - (total_material_cost + total_other_expense)
    `, [targetDate, total_sales, total_sales], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: `የዕለቱ ገቢ ተመዝግቧል!` });
    });
});

// 3. በተመረጠው ቀን ያለውን መረጃ ማምጫ
router.get('/data-by-date', (req, res) => {
    const { date } = req.query;
    db.query(`SELECT * FROM cafe_expenses WHERE expense_date = ? ORDER BY id DESC`, [date], (err, expenses) => {
        if (err) return res.status(500).json({ error: err.message });
        db.query(`SELECT * FROM cafe_daily_summary WHERE summary_date = ?`, [date], (err2, summary) => {
            if (err2) return res.status(500).json({ error: err2.message });
            res.json({
                expenses: expenses,
                summary: summary.length > 0 ? summary[0] : { total_sales: 0, total_material_cost: 0, total_other_expense: 0, net_profit: 0 }
            });
        });
    });
});

module.exports = router;