
exports.generateDateRange = (days) => {
    const dates = [];
    const today = new Date();

    for (let i = 0; i < days; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);

        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');

        dates.push(`${yyyy}${mm}${dd}`);
    }

    return dates;
}

// utils/helpers.js
exports.generateDateArray = (fromDate, toDate) => {
    const parseUTC = (s) => new Date(`${s}T00:00:00.000Z`);
    let start = parseUTC(fromDate);   // earliest
    let end = parseUTC(toDate);     // latest

    const out = [];
    while (end >= start) {
        const y = end.getUTCFullYear();
        const m = String(end.getUTCMonth() + 1).padStart(2, '0');
        const d = String(end.getUTCDate()).padStart(2, '0');
        out.push(`${y}${m}${d}`);
        end.setUTCDate(end.getUTCDate() - 1); // step back one day
    }
    return out;
};




exports.statusMappings = async (statusGroupBy, possibleTransactionStatusKeys) => {
    let statusMap = statusGroupBy.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
    }, {});

    // Step 3: Ensure all possible statuses are included
    let finalStatusCounts = possibleTransactionStatusKeys.reduce((acc, status) => {
        if (!acc[status]) {
            acc[status] = 0;  // If status doesn't exist in statusM, set count to 0
        }
        return acc;
    }, statusMap); // Start with the existing status counts

    return finalStatusCounts
}

function normalizeDate(value) {
    if (value == null) return value;
    const s = String(value).trim();
    if (!/^\d+$/.test(s)) return value; // not pure digits → leave it

    let date;
    switch (s.length) {
        case 10: // epoch seconds
            date = new Date(parseInt(s, 10) * 1000);
            break;
        case 13: // epoch millis
            date = new Date(parseInt(s, 10));
            break;
        case 14: // YYYYMMDDHHmmss
            date = new Date(
                `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(8, 10)}:${s.slice(10, 12)}:${s.slice(12, 14)}Z`
            );
            break;
        case 8: // YYYYMMDD
            date = new Date(`${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T00:00:00Z`);
            break;
        default:
            return value;
    }

    return isNaN(date) ? value : date.toISOString();
}


async function getNestedValue(obj, path) {
    if (!path || typeof path !== "string") return "";
    if (!path.includes(".") && obj[path] === undefined) return "";
    if (!path.includes(".") && obj[path] !== undefined) return obj[path];

    const result = path.split(".").reduce((acc, part) => {
        if (acc === undefined || acc === null) return undefined;
        const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
        if (arrayMatch) {
            const arrayName = arrayMatch[1];
            const index = parseInt(arrayMatch[2], 10);
            return Array.isArray(acc[arrayName]) ? acc[arrayName][index] : undefined;
        } else {
            return acc[part];
        }
    }, obj);

    return result === undefined ? "" : result;
}



const getRequiredWODetailsTODisplay = async (responseObject, requiredDatapoints) => {

    let prePareResult = {}
    for (const [mappedKey, value] of Object.entries(requiredDatapoints)) {

        let result = await getNestedValue(responseObject, value)

        // 👉 Convert numeric UNIX timestamp (seconds) to Date
        if (mappedKey.toLowerCase().includes("date")) {

            result = normalizeDate(result);

        }
        prePareResult[`${mappedKey}`] = result
    }


    return prePareResult
}









exports.getProcessedDisplayPoints = async (getAllTransactions, requiredDataPoints) => {


    let WOData = []
    await Promise.all(
        getAllTransactions.map(async record => {
            let rawMetaData = record?.responseObject


            let parsedMetaData = {
                ...record,
                ...rawMetaData,
            }

            let processedRecord = await getRequiredWODetailsTODisplay(
                parsedMetaData,
                requiredDataPoints
            );
            processedRecord = {
                ...processedRecord,
                customerDetails: record?.customerDetails
            }
            WOData.push(processedRecord)
        })
    )
    return WOData;


}




/**
 * 
 * 
 */
exports.transactionTypeMappings = async (transactionTypesGroup, possibleTransactionTypeKeys) => {
    let typesMap = transactionTypesGroup.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
    }, {});

    // Step 3: Ensure all possible statuses are included
    let finalTypeCounts = possibleTransactionTypeKeys.reduce((acc, status) => {
        if (!acc[status]) {
            acc[status] = 0;  // If status doesn't exist in statusM, set count to 0
        }
        return acc;
    }, typesMap); // Start with the existing status counts

    return finalTypeCounts
}