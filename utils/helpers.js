const crypto = require('crypto')

function hashPwd(pwd) {
    var hmac = crypto.createHmac('sha256', process.env.WEBSITE_SALT);
    return hmac.update(pwd).digest('hex');
};

function comparePassword(password, hashedPassword) {
    const hashedString = hashPwd(password)
    console.log(hashedString, hashedPassword ,  hashedString == hashedPassword, "opopop");
    return hashedString == hashedPassword
}


module.exports = {
    hashPwd, 
    comparePassword,
}