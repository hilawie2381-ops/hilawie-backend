// ፋይል: middleware/sanitize.js

module.exports = function (req, res, next) {
    if (req.body && Object.keys(req.body).length > 0) {
        for (let key in req.body) {
            let value = req.body[key];

            // 1. የገንዘብ መጠን ወይም ብዛት ከ 0 በታች (Negative) እንዳይሆን መከልከል
            const financialFields = [
                'amount', 'cost', 'quantity', 'unit_price', 'total_sales', 
                'monthly_salary', 'flour_amount_kg', 'quantity_sold', 'total_price', 'quantity_to_add'
            ];
            
            if (financialFields.includes(key) && value !== '') {
                if (parseFloat(value) < 0) {
                    return res.status(400).json({ error: 'የተሳሳተ መረጃ! የገንዘብ መጠን ወይም ብዛት ከ 0 በታች መሆን አይችልም።' });
                }
            }

            // 2. የሀከር ኮዶችን (HTML/Script Tags) ማፅዳት - (XSS Protection)
            if (typeof value === 'string') {
                req.body[key] = value.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            }
        }
    }
    
    // ዳታው ንፁህ መሆኑ ከተረጋገጠ በኋላ ወደ ሚፈለገው ቦታ እንዲያልፍ ይፈቀዳል
    next();
};