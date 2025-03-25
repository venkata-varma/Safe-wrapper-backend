const mongoose = require("mongoose")
const { sixWeekSales } = require('../utils/sixWeekSalesFunction')

exports.getWebHooksLogsSixWeekSalesData = async (getWebHookLogs) => {
    const sixWeekSalesData = sixWeekSales
    const statusesEnum = ['received','in-progress','executed','execution-failed','deleted'];

    const processSalesData = (sixWeeksSalesData, getWebHookLogs) => {
        return sixWeeksSalesData.map(week => {
            const { fromDate, toDate } = week;
            const statusCounts = statusesEnum.map(status => ({ status, count: 0 }));

            getWebHookLogs.forEach(hookLogs => {
                hookLogs.webhookLogsDetails.forEach(item => {
                    const exceptionCreatedAt = new Date(item.createdAt);
                    if (exceptionCreatedAt >= new Date(fromDate) && exceptionCreatedAt <= new Date(toDate)) {
                        const statusIndex = statusCounts.findIndex(statusItem => statusItem.status === item.status);
                        if (statusIndex !== -1) {
                            statusCounts[statusIndex].count += 1;
                        } else {
                            console.warn(`Unknown status: ${item.status} in logs.`);
                        }
                    }
                });
            });

            return {
                weekStart: fromDate,
                weekEnd: toDate,
                statuses: statusCounts
            };
        });
    };


    const result = processSalesData(sixWeekSalesData, getWebHookLogs);

    return result
};

