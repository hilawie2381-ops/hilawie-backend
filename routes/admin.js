// ፋይል: routes/admin.js
const express = require('express');
const router = express.Router();
const db = require('../db');

router.post('/global-expense', (req, res) => {
    const { expense_name, amount, expense_type, expense_date } = req.body;
    const targetDate = expense_date || new Date().toISOString().split('T')[0];
    db.query(`INSERT INTO global_expenses (expense_name, amount, expense_type, expense_date) VALUES (?, ?, ?, ?)`, [expense_name, amount, expense_type, targetDate], (err) => {
        if(err) return res.status(500).json({error: err.message}); res.json({message: 'ወጪው ተመዝግቧል'});
    });
});

router.get('/full-report', (req, res) => {
    const month = req.query.month || new Date().getMonth() + 1;
    const year = req.query.year || new Date().getFullYear();
    
    const query = `
        SELECT
            (SELECT COALESCE(SUM(total_sales),0) FROM cafe_daily_summary WHERE MONTH(summary_date) = ? AND YEAR(summary_date) = ?) as cafe_in,
            (SELECT COALESCE(SUM(total_material_cost + total_other_expense),0) FROM cafe_daily_summary WHERE MONTH(summary_date) = ? AND YEAR(summary_date) = ?) as cafe_out,
            (SELECT COALESCE(SUM(daily_income),0) FROM game_sales WHERE MONTH(sale_date) = ? AND YEAR(sale_date) = ?) as game_in,
            (SELECT COALESCE(SUM(cost),0) FROM game_expenses WHERE MONTH(expense_date) = ? AND YEAR(expense_date) = ?) as game_out,
            (SELECT COALESCE(SUM(amount_paid),0) FROM room_sales WHERE MONTH(sale_date) = ? AND YEAR(sale_date) = ?) +
            (SELECT COALESCE(SUM(amount),0) FROM pension_extra_income WHERE MONTH(income_date) = ? AND YEAR(income_date) = ?) as pension_in,
            (SELECT COALESCE(SUM(cost),0) FROM pension_expenses WHERE MONTH(expense_date) = ? AND YEAR(expense_date) = ?) as pension_out,
            (SELECT COALESCE(SUM(total_price),0) FROM donut_sales WHERE MONTH(sale_date) = ? AND YEAR(sale_date) = ?) as donut_in,
            (SELECT COALESCE(SUM(amount),0) FROM staff_ledger WHERE transaction_type = 'Salary' AND MONTH(transaction_date) = ? AND YEAR(transaction_date) = ?) as total_salary_paid,
            (SELECT COALESCE(SUM(amount),0) FROM global_expenses WHERE MONTH(expense_date) = ? AND YEAR(expense_date) = ?) as global_expenses
    `;
    
    db.query(query, [month, year, month, year, month, year, month, year, month, year, month, year, month, year, month, year, month, year, month, year], (err, results) => {
        if(err) return res.status(500).json({error: err.message});
        
        const d = results[0];
        const cafe_in = parseFloat(d.cafe_in || 0), game_in = parseFloat(d.game_in || 0), pension_in = parseFloat(d.pension_in || 0), donut_in = parseFloat(d.donut_in || 0);
        const cafe_out = parseFloat(d.cafe_out || 0), game_out = parseFloat(d.game_out || 0), pension_out = parseFloat(d.pension_out || 0);
        const total_salary_paid = parseFloat(d.total_salary_paid || 0), global_expenses = parseFloat(d.global_expenses || 0);

        const gross_income = cafe_in + game_in + pension_in + donut_in;
        const operational_expense = cafe_out + game_out + pension_out;
        const net_profit = gross_income - operational_expense - total_salary_paid - global_expenses;

        // የዚህን ወር ቋሚ ወጪዎች ዝርዝር ማምጣት
        db.query(`SELECT * FROM global_expenses WHERE MONTH(expense_date) = ? AND YEAR(expense_date) = ? ORDER BY id DESC`, [month, year], (err2, expList) => {
            res.json({ 
                gross_income, operational_expense, total_salary_paid, global_expenses, net_profit, details: d,
                expense_list: err2 ? [] : expList 
            });
        });
    });
});
module.exports = router;