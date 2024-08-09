const crypto = require('crypto');
// const key = crypto.randomBytes(32); // 32 bytes = 256 bits
// const iv = crypto.randomBytes(16);  // 16 bytes = 128 bits

// console.log('ENCRYPTION_KEY:', key.toString('hex'));
// console.log('ENCRYPTION_IV:', iv.toString('hex'));


// Algorithm, key, and IV setup

/*
Function to Encrypt credentials
Returns Encrypted string
*/
function encryptData(text) {

    const key = Buffer.from(process.env.CRYPTO_KEY, 'hex');
    let iv = Buffer.from(process.env.CRYPTO_IV, 'hex')
    let jsonText = JSON.stringify(text)
    const cipher = crypto.createCipheriv(process.env.CRYPTO_ALGORITHM, key, iv);
    let encrypted = cipher.update(jsonText, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    // console.log("encrypted", encrypted)
    return encrypted;
}




/*
Function to Decrypt to original value
Takes an object with two key-value pairs => iv,Encrypted string  and required key
Retuns original value 
*/
async function decryptData(encrypted, key) {
    const ivBuffer = Buffer.from(encrypted.iv, 'hex');
    const keyBuffer = Buffer.from(key, 'hex');
    const decipher = crypto.createDecipheriv(process.env.CRYPTO_ALGORITHM, keyBuffer, ivBuffer);
    let decrypted = decipher.update(encrypted.encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}

module.exports = {
    encryptData,
    decryptData
}