// ፋይል: routes/dashboard.js
const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/summary', (req, res) => {
    // የሁሉንም ዘርፍ ገቢ እና ወጪ በአንድ ላይ ማምጫ ሎጂክ
    const query = `
        SELECT 'Pension' as department, 
               COALESCE((SELECT SUM(amount_paid) FROM room_sales WHERE DATE(sale_date) = CURDATE()), 0) as income, 
               0 as expense
        UNION ALL
        SELECT 'Game_House' as department, 
               COALESCE((SELECT SUM(daily_income) FROM game_sales WHERE DATE(sale_date) = CURDATE()), 0) as income, 
               COALESCE((SELECT SUM(cost) FROM game_expenses WHERE DATE(expense_date) = CURDATE()), 0) as expense
        UNION ALL
        SELECT 'Cafe_and_Bakery' as department, 
               COALESCE((SELECT SUM(total_sales) FROM cafe_daily_summary WHERE summary_date = CURDATE()), 0) as income, 
               COALESCE((SELECT SUM(total_material_cost + total_other_expense) FROM cafe_daily_summary WHERE summary_date = CURDATE()), 0) as expense
    `;
    
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        
        let totalIncome = 0;
        let totalExpense = 0;
        
        const breakdown = results.map(row => {
            const inc = parseFloat(row.income);
            const exp = parseFloat(row.expense);
            totalIncome += inc;
            totalExpense += exp;
            return { department: row.department, income: inc, expense: exp, profit: inc - exp };
        });

        res.json({
            breakdown: breakdown,
            totals: { income: totalIncome, expense: totalExpense, profit: totalIncome - totalExpense }
        });
    });
});

module.exports = router;