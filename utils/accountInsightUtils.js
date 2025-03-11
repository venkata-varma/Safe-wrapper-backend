const mongoose = require("mongoose")
const workOrderLifeCycleModel = require("../models/workOrderLifeCycleModel")
const CPDWorkordersModel = require("../models/CPDWorkordersModel")
const DFWorkOrdersModel = require("../models/DFWorkOrdersModel")
const SNOWWorkOrdersModel = require("../models/SNOWWorkOrdersModel")
const CYSWorkordersModel = require("../models/CYSWorkordersModel")
const { sixWeekSales } = require('../utils/sixWeekSalesFunction')
const { getCPDFullWorkOrderDetails } = require("./general")
const moment = require('moment');
const integrationsMasterModel = require("../models/integrationsMasterModel")
const serviceProvidersIntegrationsModel = require('../models/serviceProviderIntegrationsModel')

/**
 * 
 * @param {*} SourceOrDestination 
 * @param {*} integrationsQuery 
 * @param {*} priorityQuery 
 * @param {*} fromDateQuery 
 * @param {*} toDateQuery 
 * @param {*} searchQuery 
 * @param {*} validPriorities 
 * @param {*} accountId 
 * @returns After applying given filters - 1. Search query, 2. Priority query 3.FromDate query 4. ToDate query  , Gives work order details populated in respetive source and destination work order life cycle records  
 */


exports.workOrderLifeCycleReports = async (SourceOrDestination, integrationsQuery, priorityQuery, fromDateQuery, toDateQuery, searchQuery, validPriorities, accountId, operationType) => {

    let workOrderReports;
    if (priorityQuery && !validPriorities.includes(priorityQuery)) {
        workOrderReports = []
        return workOrderReports
    } else {

        workOrderReports = await workOrderLifeCycleModel.aggregate([
            {
                $match: {
                    integrationsMasterId: new mongoose.Types.ObjectId(integrationsQuery),
                    accountId: new mongoose.Types.ObjectId(accountId),
                    serviceProvider: SourceOrDestination,

                }
            },

            // {
            //     $group: {
            //         _id: "$workOrderId", // Group by workOrderId
            //          doc: { $first: "$$ROOT" } // Select the first document for each workOrderId
            //     }
            // },
            // {
            //     $replaceRoot: { newRoot: "$doc" } // Replace the root with the grouped document
            // },

            { $sort: { createdAt: -1 } },
            {
                $match: {
                    ...(fromDateQuery && {
                        createdAt: { $gte: fromDateQuery, $lte: toDateQuery }
                    })
                }
            }

        ]);
        let integrationDetails = await integrationsMasterModel.findById(integrationsQuery)
        let sourceAndDestinationDataBaseNames = await serviceProvidersIntegrationsModel.findOne({ from: integrationDetails.from, to: integrationDetails.to })
        // Step 2: Fetch details from the appropriate model based on serviceProvider
        let workOrderDetailsPromises = workOrderReports.map(async (record) => {
            let workOrder = {
                workOrderDetails:{}
            };
            let priorityFilter = {}; // Empty filter by default
            let searchFilter;
            let getWorkOrderDetails
            let workOrderRecord
            // Apply priorityQuery if it exists and is not 'all'
            if (priorityQuery && priorityQuery !== 'all') {
                priorityFilter.priority = priorityQuery;
            }
            switch (record.serviceProvider) {
                case 'CPD':
                    // Define search query filter
                    searchFilter = searchQuery ? { $or: [{ "CPDWorkOrders.WorkOrderNumber": searchQuery }, { "CPDWorkOrders.WorkOrderId": searchQuery }] } : {};
                    workOrderRecord = await CPDWorkordersModel.findOne({ $expr: { $eq: [{ $toString: "$CPDWorkOrderId" }, record.workOrderId] }, ...priorityFilter, ...searchFilter }).lean();
                    getWorkOrderDetails = workOrderRecord !== null ? await getCPDFullWorkOrderDetails(integrationsQuery, workOrderRecord) :
                        await getDynamicRecordDetails(
                            integrationsQuery,
                            record.serviceProvider,
                            record.workOrderId,
                            priorityFilter,
                            searchFilter,
                            sourceAndDestinationDataBaseNames?.metrics?.sourceDataBaseName,
                            sourceAndDestinationDataBaseNames?.metrics?.destinationDataBaseName,
                            operationType
                        )
                    if (getWorkOrderDetails?.responseObject) {
                        getWorkOrderDetails = JSON.parse(getWorkOrderDetails?.responseObject)
                    }
                    workOrder.workOrderDetails = getWorkOrderDetails || {}
                    workOrder.type = getWorkOrderDetails?.Type || null
                    workOrder.category = getWorkOrderDetails?.WorkType?.Name || ""
                    workOrder.priority = getWorkOrderDetails?.priority || "high"

                    break;
                case 'DF':
                    searchFilter = searchQuery ? { $or: [{ "DFWorkOrders.id": searchQuery }, { "DFWorkOrders.numberAlt": searchQuery }] } : {};
                    workOrderRecord = await DFWorkOrdersModel.findOne({ $expr: { $eq: [{ $toString: "$DFWorkOrderId" }, record.workOrderId] }, ...priorityFilter, ...searchFilter }).lean();
                    getWorkOrderDetails = workOrderRecord === null ? await getDynamicRecordDetails(
                        integrationsQuery,
                        record.serviceProvider,
                        record.workOrderId,
                        priorityFilter,
                        searchFilter,
                        sourceAndDestinationDataBaseNames?.metrics?.sourceDataBaseName,
                        sourceAndDestinationDataBaseNames?.metrics?.destinationDataBaseName,
                        operationType
                    ) : workOrderRecord.DFWorkOrders
                    if (getWorkOrderDetails?.responseObject) {
                        getWorkOrderDetails = JSON.parse(getWorkOrderDetails?.responseObject)
                    }
                    workOrder.workOrderDetails = getWorkOrderDetails || {}
                    workOrder.priority = getWorkOrderDetails === null ? "medium" : getWorkOrderDetails.priority
                    break;
                case 'SNOW':
                    searchFilter = searchQuery ? { "SNOWWorkOrders.number": searchQuery } : {};
                    workOrderRecord = await SNOWWorkOrdersModel.findOne({ $expr: { $eq: [{ $toString: "$SNOWWorkOrderId" }, record.workOrderId] }, ...priorityFilter, ...searchFilter, }).lean();
                    getWorkOrderDetails = workOrderRecord === null ? await getDynamicRecordDetails(
                        integrationsQuery,
                        record.serviceProvider,
                        record.workOrderId,
                        priorityFilter,
                        searchFilter,
                        sourceAndDestinationDataBaseNames?.metrics?.sourceDataBaseName,
                        sourceAndDestinationDataBaseNames?.metrics?.destinationDataBaseName,
                        operationType
                    ) : workOrderRecord.SNOWWorkOrders
                    if (getWorkOrderDetails?.responseObject) {
                        getWorkOrderDetails = JSON.parse(getWorkOrderDetails?.responseObject)
                    }
                    workOrder.workOrderDetails = getWorkOrderDetails || {}
                    workOrder.priority = getWorkOrderDetails?.priority || "high"
                    break;
                case 'CYS':
                    searchFilter = searchQuery ? { CYSWorkOrderId: searchQuery } : {};
                    workOrderRecord = await CYSWorkordersModel.findOne({
                        $expr: {
                            $eq: [{
                                $convert: {
                                    input: "$CYSWorkOrderId",
                                    to: "string",
                                    onError: ""
                                }
                            }, record.workOrderId]
                        }, ...priorityFilter, ...searchFilter
                    }).lean();

                    getWorkOrderDetails = workOrderRecord !== null ? workOrderRecord.CYSWorkOrders : await getDynamicRecordDetails(
                        integrationsQuery,
                        record.serviceProvider,
                        record.workOrderId,
                        priorityFilter,
                        searchFilter,
                        sourceAndDestinationDataBaseNames?.metrics?.sourceDataBaseName,
                        sourceAndDestinationDataBaseNames?.metrics?.destinationDataBaseName,
                        operationType
                    )
                    if (getWorkOrderDetails?.responseObject) {
                        getWorkOrderDetails = JSON.parse(getWorkOrderDetails?.responseObject)
                        workOrder.workOrderDetails.estimate = getWorkOrderDetails || {}
                    }
                    else{
                        workOrder.workOrderDetails = getWorkOrderDetails || {}
                    }
                    workOrder.priority = getWorkOrderDetails === null ? "medium" : getWorkOrderDetails.priority
                    break;
                default:
                    // Handle unknown service provider
                    // searchFilter = searchQuery ? { "SNOWWorkOrders.number": searchQuery } : {};
                    getWorkOrderDetails = await getDynamicRecordDetails(
                        integrationsQuery,
                        record.serviceProvider,
                        record.workOrderId,
                        priorityFilter,
                        searchFilter,
                        sourceAndDestinationDataBaseNames?.metrics?.sourceDataBaseName,
                        sourceAndDestinationDataBaseNames?.metrics?.destinationDataBaseName,
                        operationType
                    )
                    if (getWorkOrderDetails?.responseObject) {
                        getWorkOrderDetails = JSON.parse(getWorkOrderDetails?.responseObject)
                    }
                    workOrder.workOrderDetails = getWorkOrderDetails || {}
                    workOrder.priority = getWorkOrderDetails?.priority || "high"
                // throw new Error(`Unknown service provider: ${record.serviceProvider}`);
            }
            if (workOrder !== null) {
                return {
                    ...record,
                    workOrder
                };
            } else {
                return null; // Explicitly return null for non-matching records
            }
        });

        // Step 3: Await all promises and filter out null values
        let workOrderDetails = await Promise.all(workOrderDetailsPromises);

        // Filter out null values
        workOrderDetails = workOrderDetails.filter(detail => detail !== null);

        return workOrderDetails;
    }

}

const getDynamicRecordDetails = async (integrationsMasterId, serviceProvider, workOrderId, priorityFilter, searchFilter, sourceDataBaseName, destinationDataBaseName, operationType) => {
    let workOrderDetails
    console.log('operationType:==',operationType)
    console.log('destinationDataBaseName:==',destinationDataBaseName)

    workOrderDetails = operationType === "source" ?
        await mongoose.connection.db.collection(sourceDataBaseName).findOne({ referenceId: workOrderId, ...priorityFilter, ...searchFilter })
        : await mongoose.connection.db.collection(destinationDataBaseName).findOne({ referenceId: workOrderId, ...priorityFilter, ...searchFilter });

    return workOrderDetails
}

/**
 * 
 * @param {*} source 
 * @param {*} destination 
 * @param {*} integrationsQuery 
 * @param {*} accountId 
 * @param {*} statusFieldMappingKeys 
 * @param {*} integrationExceptions 
 * @returns Source & Destination work order life cycle records, Integration exception records per each week for last six weeks and their respective count.
 */
exports.sixWeeksSalesDetails = async (source, destination, integrationsQuery, accountId, statusFieldMappingKeys, integrationExceptions) => {
    var sixWeekSalesData = sixWeekSales
    // console.log("sixWeekSalesData", sixWeekSalesData)
    const workOrderLifeCycleDetails = await workOrderLifeCycleModel.aggregate([
        {
            $match: {
                integrationsMasterId: new mongoose.Types.ObjectId(integrationsQuery),
                accountId: new mongoose.Types.ObjectId(accountId),
                $or: [{ serviceProvider: source }, { serviceProvider: destination }]
            }
        }
    ])


    const processSalesData = (source, destination, sixWeeksSalesData, integrationExceptions) => {
        return sixWeeksSalesData.map(week => {
            var { fromDate, toDate } = week;
            var sourceWorkOrderLifeCycleRecords = [];
            var destinationWorkOrderLifeCycleRecords = [];
            var integrationExceptionsRecordsPerWeek = []

            var integrationExceptionsCount = 0;
            workOrderLifeCycleDetails.forEach(record => {
                const createdAt = new Date(record.createdAt);
                if (createdAt >= new Date(fromDate) && createdAt <= new Date(toDate)) {
                    if (record.serviceProvider === source) {
                        sourceWorkOrderLifeCycleRecords.push(record);
                    }
                    if (record.serviceProvider === destination) {
                        destinationWorkOrderLifeCycleRecords.push(record);
                    }
                }
            });

            integrationExceptions.forEach(exception => {
                const exceptionCreatedAt = new Date(exception.createdAt);
                if (exceptionCreatedAt >= new Date(fromDate) && exceptionCreatedAt <= new Date(toDate)) {
                    integrationExceptionsRecordsPerWeek.push(exception);
                }
            });

            integrationExceptionsCount = integrationExceptionsRecordsPerWeek.length;




            return {
                fromDate,
                toDate,
                sourceWorkOrderLifeCycleRecords,
                destinationWorkOrderLifeCycleRecords,
                integrationExceptionsRecordsPerWeek,
                integrationExceptionsCount
            };
        });
    };

    // Example usage
    const result = processSalesData(source, destination, sixWeekSalesData, integrationExceptions);
    //console.log(result);



    return result
}


/**
 * 
 * @param {*} sixWeekLifeCycleDocs 
 * @param {*} statusFieldMappingKeys 
 * @param {*} source 
 * @param {*} destination 
 * @returns Above sixWeekLifeCycleDocs contans Source & Destination work order life cycle records, Integration exception records per each week for last six weeks and their respective count,  this function loops over 
 * souce and destination records and creates new variables for every week 
 */
exports.mapNewUpdatedCounts = async (sixWeekLifeCycleDocs, statusFieldMappingKeys, source, destination) => {

    var serviceProviderNewStatus;
    switch (source) {
        case 'CPD':
                serviceProviderNewStatus = "new";
                break;
            case 'DF':
                serviceProviderNewStatus = "reported";
                break;
            case 'SNOW':
                serviceProviderNewStatus = "1";
                break;
            case 'CYS':
                serviceProviderNewStatus = "Hot";
            case 'Sage':
                serviceProviderNewStatus = "PendingWoComplete";
                break;
                case "nuvolo":
                    serviceProviderNewStatus = "new";
                    break;
                    case "infor":
                        serviceProviderNewStatus = "1";
                        break;
                        case "NS":
                            serviceProviderNewStatus = "1";
                            break;
                            
                            
    }

    // let [crucialDestinationStatus,crucialSourceStatus ]=Object.entries(statusFieldMappingKeys)[0];


    var crucialSourceStatus, crucialDestinationStatus;
    for (let [key, value] of Object.entries(statusFieldMappingKeys)) {
        if (value.toLowerCase() === serviceProviderNewStatus) {
            crucialSourceStatus = value;
            crucialDestinationStatus = key;
        }
    }

    // console.log("crucialSourceStatus, crucialDestinationStatus", crucialSourceStatus, crucialDestinationStatus);

    // Loop through each week in workOrderLifeCycleDocs
    sixWeekLifeCycleDocs = sixWeekLifeCycleDocs.map((week) => {
        let sourceNewWorkOrdersCount = 0;
        let sourceUpdatedWorkOrdersCount = 0;
        let destinationNewWorkOrdersCount = 0;
        let destinationUpdatedWorkOrdersCount = 0;

        // Count new and updated orders for source
        week.sourceWorkOrderLifeCycleRecords.forEach(order => {
            if (order.workOrderStatus.toLowerCase() === crucialSourceStatus.toLowerCase()) {
                sourceNewWorkOrdersCount++;
            } else {
                sourceUpdatedWorkOrdersCount++;
            }
        });

        // Count new and updated orders for destination
        week.destinationWorkOrderLifeCycleRecords.forEach(order => {
            if (order.workOrderStatus.toLowerCase() === crucialDestinationStatus.toLowerCase()) {
                destinationNewWorkOrdersCount++;
            } else {
                destinationUpdatedWorkOrdersCount++;
            }
        });
        delete week.sourceWorkOrderLifeCycleRecords;
        delete week.destinationWorkOrderLifeCycleRecords;
        delete week.integrationExceptionsRecordsPerWeek;


        // Add the new fields to each week
        return {
            ...week,
            sourceNewWorkOrdersCount,
            sourceUpdatedWorkOrdersCount,
            destinationNewWorkOrdersCount,
            destinationUpdatedWorkOrdersCount
        };
    });

    return sixWeekLifeCycleDocs;
}


/**
 * 
 * 
 */
exports.mapNewUpdatedWorkOrdersCounts = async (statusFieldMappingKeys, source, destination, fromDateQuery, toDateQuery, integrationsQuery, accountId, sourceWorkOrderLifeCycleRecordsCount, destinationWorkOrderLifeCycleRecordsCount) => {

    let sourceNewWorkOrdersCount = 0;
    let sourceUpdatedWorkOrdersCount = 0;
    let destinationNewWorkOrdersCount = 0;
    let destinationUpdatedWorkOrdersCount = 0;

    let workOrderReports = await workOrderLifeCycleModel.aggregate([
        {
            $match: {
                integrationsMasterId: new mongoose.Types.ObjectId(integrationsQuery),
                accountId: new mongoose.Types.ObjectId(accountId),
                $or: [{ serviceProvider: source }, { serviceProvider: destination }]

            }
        },



        { $sort: { createdAt: 1 } },
        {
            $match: {
                ...(fromDateQuery && {
                    createdAt: { $gte: fromDateQuery, $lte: toDateQuery }
                })
            }
        }

    ]);

    async function returnCounts(serviceProvider, workOrderReports) {

        var serviceProviderNewStatus;
        switch (serviceProvider) {
            case 'CPD':
                serviceProviderNewStatus = "new";
                break;
            case 'DF':
                serviceProviderNewStatus = "reported";
                break;
            case 'SNOW':
                serviceProviderNewStatus = "1";
                break;
            case 'CYS':
                serviceProviderNewStatus = "Hot";
            case 'Sage':
                serviceProviderNewStatus = "PendingWoComplete";
                break;
                case "nuvolo":
                    serviceProviderNewStatus = "new";
                    break;
                    case "infor":
                        serviceProviderNewStatus = "1";
                        break;
                        case "NS":
                            serviceProviderNewStatus = "1";
                            break;

        }

        var crucialSourceStatus, crucialDestinationStatus;
        // let [crucialDestinationStatus,crucialSourceStatus ]=Object.entries(statusFieldMappingKeys)[0];
        
        for (let [key, value] of Object.entries(statusFieldMappingKeys)) {
    
            if (value.toLowerCase() === serviceProviderNewStatus) {
             
                crucialSourceStatus = value;
                crucialDestinationStatus = key;
            }
        }

        //  console.log("crucialSourceStatus, crucialDestinationStatus;", crucialSourceStatus, crucialDestinationStatus)
        workOrderReports.forEach((record) => {
            if (record.serviceProvider === source) {


                if (record.workOrderStatus.toLowerCase() === crucialSourceStatus.toLowerCase()) {
                    sourceNewWorkOrdersCount++;
                } else {
                    sourceUpdatedWorkOrdersCount++
                }
            } else if (record.serviceProvider === destination) {
                // console.log("button,destination", record.workOrderStatus)
                if (record.workOrderStatus.toLowerCase() === crucialDestinationStatus.toLowerCase()) {
                    destinationNewWorkOrdersCount++;
                } else {
                    destinationUpdatedWorkOrdersCount++
                }
            }


        })
        //Sending New & updated counts based on results obtained from its above filters
        if (sourceWorkOrderLifeCycleRecordsCount === 0 && destinationWorkOrderLifeCycleRecordsCount === 0) {
            sourceNewWorkOrdersCount = 0,
                sourceUpdatedWorkOrdersCount = 0,
                destinationNewWorkOrdersCount = 0,
                destinationUpdatedWorkOrdersCount = 0
        } else if (sourceWorkOrderLifeCycleRecordsCount !== 0 && destinationWorkOrderLifeCycleRecordsCount === 0) {
            sourceNewWorkOrdersCount,
                sourceUpdatedWorkOrdersCount,
                destinationNewWorkOrdersCount = 0,
                destinationUpdatedWorkOrdersCount = 0
        } else if (sourceWorkOrderLifeCycleRecordsCount === 0 && destinationWorkOrderLifeCycleRecordsCount !== 0) {
            sourceNewWorkOrdersCount = 0,
                sourceUpdatedWorkOrdersCount = 0,
                destinationNewWorkOrdersCount,
                destinationUpdatedWorkOrdersCount
        } else if (sourceWorkOrderLifeCycleRecordsCount !== 0 && destinationWorkOrderLifeCycleRecordsCount !== 0) {
            sourceNewWorkOrdersCount,
                sourceUpdatedWorkOrdersCount,
                destinationNewWorkOrdersCount,
                destinationUpdatedWorkOrdersCount
        }



        return {
            sourceNewWorkOrdersCount,
            sourceUpdatedWorkOrdersCount,
            destinationNewWorkOrdersCount,
            destinationUpdatedWorkOrdersCount

        }
    }
    const newUpdatedCounts = await returnCounts(source, workOrderReports)
    //   console.log("sourceWorkOrderCounts", newUpdatedCounts)
    return newUpdatedCounts



}

exports.getWebHooksLogsSixWeekSalesData = async (getWebHookLogs) => {
    const sixWeekSalesData = sixWeekSales
    const statusesEnum = ['received', 'initiated', 'sent', 'delivered', 'failed', 'deleted'];

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

