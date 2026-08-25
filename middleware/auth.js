// ፋይል: middleware/auth.js
const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
    // ከፊት-ገፁ የሚመጣውን ቁልፍ (Token) መቀበል
    const token = req.header('Authorization');
    
    // ቁልፍ ከሌለው መከልከል
    if (!token) return res.status(401).json({ error: 'ይቅርታ! ይህንን መረጃ ለማየት ሎጊን ማድረግ አለቦት።' });

    try {
        // ቁልፉ ትክክለኛ መሆኑን ማረጋገጥ
        const verified = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET);
        req.user = verified;
        next(); // ቁልፉ ትክክል ከሆነ ወደ ፈለገው መረጃ እንዲያልፍ ይፈቀድለታል
    } catch (err) {
        res.status(400).json({ error: 'የተሳሳተ የሴኪውሪቲ ቁልፍ (Invalid Token)' });
    }
};