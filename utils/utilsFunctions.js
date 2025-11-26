const onePosLogsModel = require("../models/onePosLogsModel");

function formatDate(date, isEndOfDay = false) {
  const pad = (num) => String(num).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const time = isEndOfDay ? '23:59:59.999' : '00:00:00.000';
  return `${year}-${month}-${day}T${time}`;
}

// // Get current date and time
// const now = new Date();

// // Array to hold the 7 objects
// const dateAsset = Array.from({ length: 7 }, (_, i) => {
//   const currentDate = new Date(now);
//   currentDate.setDate(now.getDate() - i);
//   const fromDate = new Date(currentDate);
//   const toDate = new Date(currentDate);
//   toDate.setHours(23, 59, 59, 999);
//   return {
//       fromDate: formatDate(fromDate),
//       toDate: formatDate(toDate, true),
//       day: formatDate(fromDate).split('T')[0]
//   };
// });


function dateAsset() {
  // Get current date and time
  const now = new Date();

  // Array to hold the 7 objects
  return Array.from({ length: 7 }, (_, i) => {
    const currentDate = new Date(now);
    currentDate.setDate(now.getDate() - i);
    const fromDate = new Date(currentDate);
    const toDate = new Date(currentDate);
    toDate.setHours(23, 59, 59, 999);
    return {
      fromDate: formatDate(fromDate),
      toDate: formatDate(toDate, true),
      day: formatDate(fromDate).split('T')[0]
    };
  });
}

function EmailDateAsset(currentDateAndTime) {
  const now = currentDateAndTime;

  // Array to hold the 7 objects
  return Array.from({ length: 7 }, (_, i) => {
    const currentDate = new Date(now);
    currentDate.setDate(now.getDate() - i);
    const fromDate = new Date(currentDate);
    const toDate = new Date(currentDate);
    toDate.setHours(23, 59, 59, 999);
    return {
      fromDate: formatDate(fromDate),
      toDate: formatDate(toDate, true),
      day: formatDate(fromDate).split('T')[0]
    };
  });
}

function returnIndianDate(currentTime) {

  var currentOffset = currentTime.getTimezoneOffset();

  var ISTOffset = 330;   // IST offset UTC +5:30 

  var ISTTime = new Date(currentTime.getTime() + (ISTOffset + currentOffset) * 60000);
  return ISTTime
}


const insertPosLogs = async (accountId, userId, url, serialNumbers,
  transactionTypes,
  fromDate,
  toDate) => {
  await onePosLogsModel.create({
    accountId: accountId,
    userId: userId,
    apiCalled: url,
    serialNumbers: serialNumbers,
    transactionTypes:transactionTypes,
    transactionDateAndTimes:[fromDate,toDate]
  })
}


module.exports = { dateAsset, EmailDateAsset, returnIndianDate, insertPosLogs }