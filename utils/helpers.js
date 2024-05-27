const bcrypt = require('bcryptjs');

const { encryptData, decryptData } = require('./encryptionAlgorithms')

const key = Buffer.from(process.env.CRYPTO_KEY, 'hex');
let iv = Buffer.from(process.env.CRYPTO_IV, 'hex')
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



// let returnsEncryptedData= encryptData('b7efe625111a8610143a770f52767120',key, iv)
// console.log('returnsEncryptedData', returnsEncryptedData)    a Object 
//  let dataToBeDecrypted={
//   iv: '31ac58118bcdc9ed57f96323579ffd3e',
//   encryptedData: 'de1c371c5c33940b62f5ccb307358df4755aaae74cad2ca2772f477cb6babd598f90c9b2e7cb811e0b6d9d056f658921'
// }
//  let decryptedData=decryptData(dataToBeDecrypted, key)
//  console.log('decryptedData', decryptedData)