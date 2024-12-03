const bcrypt = require('bcryptjs');

const { encryptData, decryptData } = require('./encryptionAlgorithms')

const key = Buffer.from(process.env.CRYPTO_KEY, 'hex');
let iv = Buffer.from(process.env.CRYPTO_IV, 'hex')
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
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

/*
Function returns the last twelve weeks of times.
*/
// Function to format date as local ISO string without converting to UTC
function toLocalISOString(date) {
    const tzOffset = date.getTimezoneOffset() * 60000; // Timezone offset in milliseconds
    const localTime = new Date(date - tzOffset);
    return localTime.toISOString().slice(0, -1); // Remove 'Z' at the end
}

// Function to get the start and end date of a week, formatted as local ISO string
function getWeekRange(toDate) {
    const endDate = new Date(toDate);
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - 7);
    startDate.setMilliseconds(startDate.getMilliseconds() + 1); // Ensure non-overlapping by adding 1 millisecond
    return {
        fromDate: toLocalISOString(startDate),
        toDate: toLocalISOString(endDate)
    };
}

// Array to store the week ranges
const twelveWeeksSales = [];

// Start with the current date and time as the end of the last week
let currentEndDate = new Date();

// Populate the array with data representing the last twelve weeks
for (let i = 0; i < 12; i++) {
    const weekRange = getWeekRange(currentEndDate);
    twelveWeeksSales.unshift(weekRange); // Insert at the beginning of the array
    currentEndDate = new Date(weekRange.fromDate);
    currentEndDate.setMilliseconds(currentEndDate.getMilliseconds() - 1); // Set up for the next week's end date
}

const AWS_REGION = 'us-west-1'
const S3_BUCKET = 'dev-isync-images'
const client = new S3Client({
  region: AWS_REGION,
});
async function preSignedUrlToUpload(key) {
    try {
      const command = new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        ACL: "public-read",
      });
      const url = await getSignedUrl(client, command, { expiresIn: 3600 })
      // const url = await presignedUrl(command);
      return url;
    } catch (err) {
      throw err;
    }
  }

module.exports = {
    hashPwd, 
    comparePassword,
    twelveWeeksSales,
    preSignedUrlToUpload   
}