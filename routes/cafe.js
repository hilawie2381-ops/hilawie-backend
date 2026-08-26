// ፋይል: routes/cafe.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// 1. ወጪ መመዝገቢያ (የጥሬ እቃ እና ልዩ ልዩ)
router.post('/expense', (req, res) => {
    const { expense_type, item_name, quantity, unit_price, cost, expense_date } = req.body;
    const targetDate = expense_date || new Date().toISOString().split('T')[0];

    // የወጪውን ጠቅላላ ዋጋ ማስላት
    let total_cost = 0;
    if (expense_type === 'Material') {
        total_cost = parseFloat(quantity) * parseFloat(unit_price);
    } else {
        total_cost = parseFloat(cost);
    }

    const query = `INSERT INTO cafe_expenses (expense_type, item_name, quantity, unit_price, cost, total_cost, expense_date) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    
    db.query(query, [expense_type, item_name, quantity || null, unit_price || null, cost || null, total_cost, targetDate], (err) => {
        if (err) return res.status(500).json({ error: err.message });

        // ጥሬ እቃ ከሆነ ከዕቃ ማከማቻው (Inventory) ላይ በቀጥታ ይቀንሳል
        if (expense_type === 'Material') {
            db.query(`UPDATE inventory SET stock_quantity = stock_quantity - ? WHERE item_name = ?`, [quantity, item_name], () => {
                res.json({ message: 'ወጪ ተመዝግቧል እና ከስቶክ ተቀንሷል' });
            });
        } else {
            res.json({ message: 'ወጪ ተመዝግቧል' });
        }
    });
});

// 2. የዕለቱ ገቢ መመዝገቢያ
router.post('/sales', (req, res) => {
    const { total_sales, sale_date } = req.body;
    const targetDate = sale_date || new Date().toISOString().split('T')[0];

    // የድሮ ገቢ ካለ አፕዴት ያደርገዋል፣ ከሌለ አዲስ ይመዘግባል
    db.query(`SELECT id FROM cafe_sales WHERE sale_date = ?`, [targetDate], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });

        if (results.length > 0) {
            db.query(`UPDATE cafe_sales SET total_sales = ? WHERE sale_date = ?`, [total_sales, targetDate], (err2) => {
                if (err2) return res.status(500).json({ error: err2.message });
                res.json({ message: 'የካፌ ገቢ ተስተካክሏል' });
            });
        } else {
            db.query(`INSERT INTO cafe_sales (total_sales, sale_date) VALUES (?, ?)`, [total_sales, targetDate], (err2) => {
                if (err2) return res.status(500).json({ error: err2.message });
                res.json({ message: 'የካፌ ገቢ ተመዝግቧል' });
            });
        }
    });
});

// 3. በተመረጠው ቀን የተመዘገቡትን ማምጫ (🚀 አዲሱ የሳምንት/ወር/ዓመት ስሌት የተጨመረበት)
router.get('/data-by-date', (req, res) => {
    const { date } = req.query;

    // የዕለቱ ወጪዎች
    db.query(`SELECT * FROM cafe_expenses WHERE expense_date = ? ORDER BY id DESC`, [date], (err1, expenses) => {
        if (err1) return res.status(500).json({ error: err1.message });

        // የዕለቱ ገቢ
        db.query(`SELECT COALESCE(SUM(total_sales), 0) as total_sales FROM cafe_sales WHERE sale_date = ?`, [date], (err2, salesResult) => {
            if (err2) return res.status(500).json({ error: err2.message });

            // የዕለቱ ጠቅላላ ወጪ ስሌት
            db.query(`SELECT expense_type, COALESCE(SUM(total_cost), 0) as type_total FROM cafe_expenses WHERE expense_date = ? GROUP BY expense_type`, [date], (err3, expenseTotals) => {
                if (err3) return res.status(500).json({ error: err3.message });

                let total_material = 0;
                let total_other = 0;

                expenseTotals.forEach(row => {
                    if (row.expense_type === 'Material') total_material = parseFloat(row.type_total);
                    if (row.expense_type === 'Other') total_other = parseFloat(row.type_total);
                });

                const total_sales = parseFloat(salesResult[0]?.total_sales || 0);
                const net_profit = total_sales - (total_material + total_other);

                // === 🚀 አዲሱ የሳምንት፣ የወር እና የዓመት ትርፍ ስሌት (Period Summary) ===
                const summaryQuery = `
                  SELECT
                    -- የሳምንት ትርፍ (ጠቅላላ ሳምንታዊ ገቢ ሲቀነስ ጠቅላላ ሳምንታዊ ወጪ)
                    (SELECT COALESCE(SUM(total_sales), 0) FROM cafe_sales WHERE YEARWEEK(sale_date, 1) = YEARWEEK(?, 1)) -
                    (SELECT COALESCE(SUM(total_cost), 0) FROM cafe_expenses WHERE YEARWEEK(expense_date, 1) = YEARWEEK(?, 1)) AS weekly,

                    -- የወር ትርፍ
                    (SELECT COALESCE(SUM(total_sales), 0) FROM cafe_sales WHERE MONTH(sale_date) = MONTH(?) AND YEAR(sale_date) = YEAR(?)) -
                    (SELECT COALESCE(SUM(total_cost), 0) FROM cafe_expenses WHERE MONTH(expense_date) = MONTH(?) AND YEAR(expense_date) = YEAR(?)) AS monthly,

                    -- የዓመት ትርፍ
                    (SELECT COALESCE(SUM(total_sales), 0) FROM cafe_sales WHERE YEAR(sale_date) = YEAR(?)) -
                    (SELECT COALESCE(SUM(total_cost), 0) FROM cafe_expenses WHERE YEAR(expense_date) = YEAR(?)) AS yearly
                `;

                // ቀኑን 8 ጊዜ ለ SQL እናቀብለዋለን
                const d = date;
                const params = [d, d, d, d, d, d, d, d];

                db.query(summaryQuery, params, (err4, summaryResult) => {
                    if (err4) return res.status(500).json({ error: err4.message });

                    res.json({
                        expenses: expenses,
                        summary: {
                            total_sales: total_sales,
                            total_material_cost: total_material,
                            total_other_expense: total_other,
                            net_profit: net_profit
                        },
                        // ስሌቱን ሰርቶ ወደ ፊት አፕሊኬሽኑ ይልካል
                        period_summary: summaryResult[0] || { weekly: 0, monthly: 0, yearly: 0 }
                    });
                });
            });
        });
    });
});

module.exports = router;
