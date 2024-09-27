const { default: mongoose } = require("mongoose")
const workOrderLifeCycleModel = require("../models/workOrderLifeCycleModel")
const CPDWorkordersModel = require("../models/CPDWorkordersModel")
const DFWorkOrdersModel = require("../models/DFWorkOrdersModel")
const SNOWWorkOrdersModel = require("../models/SNOWWorkOrdersModel")
const CYSWorkordersModel = require("../models/CYSWorkordersModel")
const { sixWeekSales } = require('../utils/sixWeekSalesFunction')
const { getCPDFullWorkOrderDetails } = require("./general")

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


exports.workOrderLifeCycleReports = async (SourceOrDestination, integrationsQuery, priorityQuery, fromDateQuery, toDateQuery, searchQuery, validPriorities, accountId) => {

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

        // Step 2: Fetch details from the appropriate model based on serviceProvider
        let workOrderDetailsPromises = workOrderReports.map(async (record) => {

            let workOrder = {};
            let priorityFilter = {}; // Empty filter by default
            let searchFilter;
            let getWorkOrderDetails
            // Apply priorityQuery if it exists and is not 'all'
            if (priorityQuery && priorityQuery !== 'all') {
                priorityFilter.priority = priorityQuery;
            }            
            switch (record.serviceProvider) {
                case 'CPD':
                    // Define search query filter
                    searchFilter = searchQuery ? { $or: [{ "CPDWorkOrders.WorkOrderNumber": searchQuery }, { "CPDWorkOrders.WorkOrderId": searchQuery }] } : {};
                    const workOrderDetails = await CPDWorkordersModel.findOne({ $expr: { $eq: [{ $toString: "$CPDWorkOrderId" }, record.workOrderId] }, ...priorityFilter, ...searchFilter }).lean();
                    getWorkOrderDetails = await getCPDFullWorkOrderDetails(integrationsQuery, workOrderDetails)
                    
                    workOrder.workOrderDetails = getWorkOrderDetails
                    workOrder.type = getWorkOrderDetails.Type
                    workOrder.category = getWorkOrderDetails.WorkType.Name
                    workOrder.priority = workOrderDetails.priority

                    break;
                case 'DF':
                    searchFilter = searchQuery ? { $or: [{ "DFWorkOrders.id": searchQuery }, { "DFWorkOrders.numberAlt": searchQuery }] } : {};
                    getWorkOrderDetails = await DFWorkOrdersModel.findOne({ $expr: { $eq: [{ $toString: "$DFWorkOrderId" }, record.workOrderId] }, ...priorityFilter, ...searchFilter }).lean();
                    workOrder.workOrderDetails = getWorkOrderDetails === null ? {} : getWorkOrderDetails.DFWorkOrders
                    workOrder.priority = getWorkOrderDetails === null ? "medium" : getWorkOrderDetails.priority
                    break;
                case 'SNOW':
                    searchFilter = searchQuery ? { "SNOWWorkOrders.number": searchQuery } : {};
                    getWorkOrderDetails = await SNOWWorkOrdersModel.findOne({ $expr: { $eq: [{ $toString: "$SNOWWorkOrderId" }, record.workOrderId] }, ...priorityFilter, ...searchFilter, }).lean();
                    workOrder.workOrderDetails = getWorkOrderDetails === null ? {} : getWorkOrderDetails.SNOWWorkOrders
                    workOrder.priority = getWorkOrderDetails.priority
                    break;
                case 'CYS':
                    searchFilter = searchQuery ? { CYSWorkOrderId: searchQuery } : {};
                    getWorkOrderDetails = await CYSWorkordersModel.findOne({ $expr: { $eq: [{ 
                        $convert: { 
                          input: "$CYSWorkOrderId", 
                          to: "string", 
                          onError: ""
                        }
                      }, record.workOrderId] }, ...priorityFilter, ...searchFilter }).lean();
                    
                    workOrder.workOrderDetails = getWorkOrderDetails !== null ? getWorkOrderDetails.CYSWorkOrders : {}
                    workOrder.priority = getWorkOrderDetails === null ? "medium" : getWorkOrderDetails.priority
                    break;
                default:
                    // Handle unknown service provider
                    throw new Error(`Unknown service provider: ${record.serviceProvider}`);
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
    // console.log("statusFieldMappingKeys", statusFieldMappingKeys);

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
            serviceProviderNewStatus = "requested";
            break;
    }

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
                break;
        }

        var crucialSourceStatus, crucialDestinationStatus;
        for (let [key, value] of Object.entries(statusFieldMappingKeys)) {

            if (value.toLowerCase() === serviceProviderNewStatus) {
                console.log("value, ", value)
                crucialSourceStatus = value;
                crucialDestinationStatus = key;
            }
        }
        //  console.log("crucialSourceStatus, crucialDestinationStatus;", crucialSourceStatus, crucialDestinationStatus)
        workOrderReports.forEach((record) => {
            if (record.serviceProvider === source) {
                // console.log("button, source", record.workOrderStatus.toLowerCase())
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