

// Function to format date as local ISO string without converting to UTC
function toLocalISOString(date) {
    const tzOffset = date.getTimezoneOffset() * 60000; // Timezone offset in milliseconds
    const localTime = new Date(date - tzOffset);
    return localTime.toISOString().slice(0, -1); // Remove 'Z' at the end
}

// Function to set time of a date to the start of the day (12:00 AM)
function setStartOfDay(date) {
    date.setHours(0, 0, 0, 0);
    return date;
}

// Function to set time of a date to the end of the day (11:59:59 PM)
function setEndOfDay(date) {
    date.setHours(23, 59, 59, 999);
    return date;
}

// Function to get the start and end date of a week, formatted as local ISO string
function getWeekRange(toDate) {
    const endDate = setEndOfDay(new Date(toDate));
    const startDate = setStartOfDay(new Date(endDate));
    startDate.setDate(endDate.getDate() - 6);
    return {
        fromDate: toLocalISOString(startDate),
        toDate: toLocalISOString(endDate)
    };
}

// Array to store the week ranges
const sixWeekSales = [];

// Start with the current date and time as the end of the last week
let currentEndDate = new Date();

// Populate the array with data representing the last twelve weeks
for (let i = 0; i < 6; i++) {
    const weekRange = getWeekRange(currentEndDate);
    sixWeekSales.unshift(weekRange); // Insert at the beginning of the array
    currentEndDate = new Date(weekRange.fromDate);
    currentEndDate.setMilliseconds(currentEndDate.getMilliseconds() - 1); // Set up for the next week's end date
}

// Constructing the end of the day for a given date
function convertStrToDate(date) {
    console.log('strDate', date )
    const convert = new Date(date);
    console.log('convertFirstInstance', convert)
    convert.setHours(convert.getHours() + 5);
    convert.setMinutes(convert.getMinutes() + 30);
    console.log('finalUnsa', convert)
    return convert;
}



module.exports = {
    sixWeekSales,
    convertStrToDate
}