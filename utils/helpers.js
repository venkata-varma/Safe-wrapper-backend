const bcrypt=require('bcryptjs');
async function hashPwd(pwd) {

    var hmac = await bcrypt.hash(pwd, Number(process.env.WEBSITE_SALT));
    console.log('hmac', hmac)
    return hmac;
};

async function comparePassword(password, hashedPassword) {
    const hashedString =await  bcrypt.compare(password, hashedPassword)
    console.log("hashed", hashedString)
    return hashedString;
    //if(hashedString)
}


module.exports = {
    hashPwd, 
    comparePassword,
}