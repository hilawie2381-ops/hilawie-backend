// ፋይል: routes/hr.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// 1. አዲስ ሰራተኛ መመዝገብ
router.post('/add-staff', (req, res) => {
    const { first_name, last_name, address, hire_date, position, monthly_salary, photo_id_info } = req.body;
    const query = `INSERT INTO staff (first_name, last_name, address, hire_date, position, monthly_salary, photo_id_info) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    db.query(query, [first_name, last_name, address, hire_date, position, monthly_salary, photo_id_info || ''], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'ሰራተኛው በተሳካ ሁኔታ ተመዝግቧል!', id: result.insertId });
    });
});

// 2. የሰራተኞች ዝርዝር እና የተጣራ ሒሳባቸው (Net Balance)
router.get('/staff-list', (req, res) => {
    const query = `
        SELECT s.*, 
               COALESCE(SUM(CASE WHEN l.transaction_type = 'Salary' THEN l.amount ELSE 0 END), 0) as total_salary, 
               COALESCE(SUM(CASE WHEN l.transaction_type IN ('Advance', 'Expense') THEN l.amount ELSE 0 END), 0) as total_taken,
               (COALESCE(SUM(CASE WHEN l.transaction_type = 'Salary' THEN l.amount ELSE 0 END), 0) - 
                COALESCE(SUM(CASE WHEN l.transaction_type IN ('Advance', 'Expense') THEN l.amount ELSE 0 END), 0)) as net_balance
        FROM staff s
        LEFT JOIN staff_ledger l ON s.id = l.staff_id
        WHERE s.status = 'Active'
        GROUP BY s.id
    `;
    db.query(query, (err, results) => { 
        if (err) return res.status(500).json({ error: err.message }); 
        res.json(results); 
    });
});

// 3. የአንድ ሰራተኛ ዝርዝር መረጃ እና ያወጣቸው ብሮች (Ledger) ማምጫ
router.get('/staff-detail/:id', (req, res) => {
    const staffId = req.params.id;
    db.query(`SELECT * FROM staff WHERE id = ?`, [staffId], (err, staffResult) => {
        if (err || staffResult.length === 0) return res.status(404).json({ error: 'ሰራተኛው አልተገኘም' });
        
        db.query(`SELECT * FROM staff_ledger WHERE staff_id = ? ORDER BY id DESC`, [staffId], (err2, ledgerResult) => {
            if (err2) return res.status(500).json({ error: err2.message });
            res.json({ staff: staffResult[0], ledger: ledgerResult });
        });
    });
});

// 4. ለሰራተኛው ገንዘብ መመዝገብ (ወጪ/ብድር/ቅድመ ክፍያ ከምክንያት ጋር)
router.post('/add-expense', (req, res) => {
    const { staff_id, amount, description, transaction_date } = req.body;
    const targetDate = transaction_date || new Date().toISOString().split('T')[0];
    
    const query = `INSERT INTO staff_ledger (staff_id, transaction_type, amount, description, transaction_date) VALUES (?, 'Expense', ?, ?, ?)`;
    db.query(query, [staff_id, amount, description, targetDate], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'ወጪው/ብድሩ ተመዝግቧል' });
    });
});

// 5. ደመወዝ መቁረጥ/መክፈል
router.post('/pay-salary', (req, res) => {
    const { staff_id } = req.body;
    db.query(`SELECT monthly_salary FROM staff WHERE id = ?`, [staff_id], (err, results) => {
        if (err || results.length === 0) return res.status(500).json({ error: 'ሰራተኛው አልተገኘም' });
        const salaryAmount = results[0].monthly_salary;
        
        db.query(`INSERT INTO staff_ledger (staff_id, transaction_type, amount, description, transaction_date) VALUES (?, 'Salary', ?, 'የወር ደመወዝ', CURDATE())`, [staff_id, salaryAmount], (err2) => {
            if (err2) return res.status(500).json({ error: err2.message });
            res.json({ message: 'የወር ደመወዝ ተቀናብሯል' });
        });
    });
});

module.exports = router;