
const DFConfigurations = require('../config/integrationsConfiguration')
const axios = require('axios');
const CPDWorkordersModel = require('../models/CPDWorkordersModel');
const DFWorkOrdersModel = require('../models/DFWorkOrdersModel');
const integrationsExceptionsModel = require('../models/integrationsExceptionsModel');
const integrationsCronsModel = require('../models/integrationsCronsModel');
const asyncWrapper = require('./asyncWrapper');
const integrationsMasterServiceProvidersModel = require('../models/integrationsMasterServiceProvidersModel');
const { decryptData } = require('../utils/encryptionAlgorithms');
const { CPDAuthentication } = require('../utils/serviceProvidersAuthentication');
const workOrderLifeCycleModel = require('../models/workOrderLifeCycleModel');
const CPDtoDFBuildingMasterModel = require('../models/CPDtoDFBuildingMasterModel');
const integrationsSettingsModel = require('../models/integrationsSettingsModel');
const { exceptionLogs } = require('./exceptionOperation');
const { searchDFBuildingsByStateAndCountry, getAllDFBuldingsData, searchDFBuildingByNameAndStreet } = require('./findDFBuildingOperation');

/**
 * 
 * @param {*} fieldmappingkeys contains all mapping keys
 * @param {*} decryptConfigCredentials contains respected service auth credentials
 * @param {*} WorkType decides to typeListId
 * This function used to get the typeListId value and then return the updated fieldmapping keys
 */

const getDFTypeListIdFromSearchAPI = async (fieldmappingkeys, decryptConfigCredentials, WorkType, integrationObject, CPDWorkOrderId, CPDWorkOrderNumber, DFWorkOrderId) => {
    let searchTypeListId = {
        method: 'post',
        // maxBodyLength: Infinity,
        url: `${DFConfigurations.DF.searchWorkOrderType.URL}`,
        data: {},
        headers: {
            'df-auth': decryptConfigCredentials.df_auth,
            'df-servicecode': decryptConfigCredentials.df_servicecode,
            'Content-Type': 'application/json',
        }
    }
    const getTypeListIdDetails = await axios.request(searchTypeListId)
        .then((response) => {
            // console.log("getTypeListId:===", JSON.stringify(response.data));
            return response.data
        })
        .catch(async (error) => {
            // console.log("getDFTypeListIdFromSearchAPIERROR:==", error);
            await exceptionLogs(integrationObject, error.response.status, error.message, JSON.stringify(error.response.data.messages), JSON.stringify(error.config.url + " /n data: " + error.config.data), "df-typeList-search", CPDWorkOrderId, CPDWorkOrderNumber, DFWorkOrderId)
            
        });
    console.log('WorkType:==', WorkType)
    if(getTypeListIdDetails){
        if (WorkType === "PMRM") {
            const workOrderType = getTypeListIdDetails.find((item) => item.listValue === "Preventive Maintenance");
            fieldmappingkeys.typeListId = workOrderType ? workOrderType.id : 1237;
        }
        else if (WorkType !== "PMRM") {
            const workOrderType = getTypeListIdDetails.find((item) => item.listValue === "Office & Engineering");
            fieldmappingkeys.typeListId = workOrderType ? workOrderType.id : 687;
        }
    }
    else{
        fieldmappingkeys.typeListId = 687;
    }
    
    return fieldmappingkeys;
}

/**
 * Get all DataForms buildingDetails from getAllDFBuldingsData.
 * Search the buildings by country and state from searchDFBuildingByNameAndStreet.
 * Search the matched building by CPD SpaceName and Street with the DF buildingName name and street from the getFilteredDFBuildings.
 * Check wheather we have the required buildingId and salespersonId by spaceName from CPDWorkOrders.
 * If not, From the CPDWorkOrders get location name.
 * Assign the BuildingId and salesPersionId to the fieldMappingkeys object and then Insert a record into the CPDtoDFBuildingMasterModel.
 * Else assign the buildingId and salesPersonId default values from CPDtoDFBuildingMasterModel.
 * If no building in the dataForma matches the spaceName and street, assign the buildingId and salesPersonId values from the CPDWorkOrders response.
 * @returns fieldmappingKeys.
 */

const getDFBuildingId = async (CPDWorkOrders, fieldmappingkeys, decryptConfigCredentials, integrationObject, CPDWorkOrderId, CPDWorkOrderNumber, DFWorkOrderId) => {
   const getDFBuildingData = await getAllDFBuldingsData(decryptConfigCredentials, integrationObject, CPDWorkOrderId, CPDWorkOrderNumber, DFWorkOrderId)
        if (getDFBuildingData !== undefined) {
            const serviceLocationCountry = CPDWorkOrders.ServiceLocation.Address.Country === "US" ? "USA" : "USA"
            const getFilteredDFBuildings = await searchDFBuildingsByStateAndCountry(serviceLocationCountry, CPDWorkOrders.ServiceLocation.Address.State, getDFBuildingData)
            const getMatchedDFBuilding = await searchDFBuildingByNameAndStreet(CPDWorkOrders.ServiceLocation, getFilteredDFBuildings)
            const searchBuildingData = await CPDtoDFBuildingMasterModel.find({integrationsMasterId: integrationObject.integrationsMasterId,
                accountId: integrationObject.accountId, CPDBuildingName: CPDWorkOrders.ServiceLocation.SpaceName.toLowerCase(), DFBuildingName: getMatchedDFBuilding.matchedDFBuildingData.name.toLowerCase() })

            if(searchBuildingData.length <= 0){  
                fieldmappingkeys.buildingId = getMatchedDFBuilding.matchedDFBuildingData.id;
                fieldmappingkeys.salespersonId = getMatchedDFBuilding.matchedDFBuildingData.defaultSalesPersonId         
                await CPDtoDFBuildingMasterModel.create({
                    integrationsMasterId: integrationObject.integrationsMasterId,
                    accountId: integrationObject.accountId,
                    DFBuildingId: getMatchedDFBuilding.matchedDFBuildingData.id,
                    DFSalesPersonId: getMatchedDFBuilding.matchedDFBuildingData.defaultSalesPersonId,
                    DFInvoiceRootId: getMatchedDFBuilding.matchedDFBuildingData.defaultInvoiceToRootId,
                    DFBuildingName: getMatchedDFBuilding.matchedDFBuildingData.name.toLowerCase(),
                    DFBuildingObject: getMatchedDFBuilding.matchedDFBuildingData,
                    CPDBuildingName: CPDWorkOrders.ServiceLocation.SpaceName.toLowerCase(),
                    CPDOccupantId: CPDWorkOrders.ServiceLocation.OccupantID,
                    CPDOccupantSpaceId: CPDWorkOrders.ServiceLocation.SpaceId,
                    CPDBuildingObject: CPDWorkOrders.ServiceLocation
                })                
            }
            else {
                fieldmappingkeys.buildingId = searchBuildingData[0].DFBuildingId
                fieldmappingkeys.salespersonId = searchBuildingData[0].DFSalesPersonId
            }            
        } else {
            fieldmappingkeys.buildingId = CPDWorkOrders.ServiceLocation.OccupantID
            fieldmappingkeys.salespersonId = ""
        }  
   
    return fieldmappingkeys;
}

// Function to get nested property value
const getNestedValue = (obj, path) => {
    if (!path) return '';
    if (typeof path !== 'string') return '';
    return path.split('.').reduce((acc, part) => {
        const arrayMatch = part.match(/(\w+)\[(\d+)\]/);
        if (arrayMatch) {
            const arrayKey = arrayMatch[1];
            const index = parseInt(arrayMatch[2], 10);
            return acc && acc[arrayKey] && acc[arrayKey][index];
        }
        return acc && acc[part];
    }, obj) || '';
};

// Map the CPD values from response to DF fieldMapping keys
const mapCPDValuesToDFFieldMappingKeys = async (response, dataPoints) => {
    const workOrder = response;
    const mappedDataPoints = {};

    Object.keys(dataPoints).forEach((key) => {
        const modelKey = dataPoints[key];
        if (typeof modelKey === 'string') {
            mappedDataPoints[key] = modelKey ? getNestedValue(workOrder, modelKey) : '';
        }
        else{
            mappedDataPoints[key] = modelKey;
        }
    });

    return mappedDataPoints;
};


/**
 * 
 * This function is used to map the buildingId which gets from the individual work order details of CPD API.
 * If encounters any error during the service call it creates an exception.
 * @returns updated fieldmappingkeys
 */

const getCPDFieldMappingkeys = async (CPDWorkOrderId, MessageId, fieldmappingkeys, corrigoToken, integrationObject, decryptConfigCredentials, CPDWorkOrderNumber, DFWorkOrderId) => {
    
    let getCPDWorkOrderDetails = await axios.get(`${DFConfigurations.CPD.getWorkOrder.URL}messageId=${MessageId}&ids=${CPDWorkOrderId}`,
        {
            headers: { Authorization: `bearer ${corrigoToken}` }
        })
        .then(res => {
            // console.log('response:==',res.data)
            return res.data.WorkOrders[0]
        })
        .catch(async (error) => {
            console.log("ERROR:==", error)
            await exceptionLogs(integrationObject, error.response.status, error.response.data.Message, error.name, error.config.data, "cpd-get-workorder", CPDWorkOrderId, CPDWorkOrderNumber, DFWorkOrderId)
        });
    if (getCPDWorkOrderDetails) {
        fieldmappingkeys = await getDFBuildingId(getCPDWorkOrderDetails,fieldmappingkeys, decryptConfigCredentials, integrationObject, CPDWorkOrderId, CPDWorkOrderNumber, DFWorkOrderId)
        fieldmappingkeys = await mapCPDValuesToDFFieldMappingKeys(getCPDWorkOrderDetails, fieldmappingkeys);
        fieldmappingkeys.workDescription = getCPDWorkOrderDetails.WorkDetails.Assets[0].Comment === '' ? "(DR) - No Comment" : getCPDWorkOrderDetails.WorkDetails.Assets[0].Comment;
    }
    return fieldmappingkeys

}

/**
 * Prepare the fieldmappingkeys object as per the requirement
 */
const getDefaultFieldMappingKeys = async (fieldmappingkeys) => {
    // Customize field mapping keys of DF - create API request. 
    for (const property in fieldmappingkeys) {
 
        if (property === "budgetedProposedStatus")
            fieldmappingkeys.budgetedProposedStatus = "NONE";

        else if (property === "divisionId")
            fieldmappingkeys.divisionId = 1;

        else if (property === "invoiceToCustomerId")
            fieldmappingkeys.invoiceToCustomerId = 2238;

        else if (property === "invoiceType")
            fieldmappingkeys.invoiceType = 'EXTERNAL_CHARGE';

        else if (property === "reportedById")
            fieldmappingkeys.reportedById = 5515;
        
        else if (property === "invoiceToText")
            fieldmappingkeys.invoiceToText = "CBRE/T-Mobile"

        }
    return fieldmappingkeys
}

/**
 * 
 * @param {*} fieldmappingkeys 
 * @param {*} WorkOrderNumber used to assign the value to numberAlt of DF.
 * @param {*} CPDWorkOrderStatus is used to change the status key of DF as per the CPD work order status.
 * @param {*} WorkType 
 * @returns updated fieldmappingkeys
 */
const getWorkOrderStatusFieldMappingkeys = async (integrationFieldMappingkeys, CPDWorkOrderStatus, IntegrationStatusMappingKeys) => {
    let statusMappingValue = Object.keys(IntegrationStatusMappingKeys).find(key => IntegrationStatusMappingKeys[key] === CPDWorkOrderStatus) || "IN_PROGRESS";
    integrationFieldMappingkeys.status = statusMappingValue.split('-').length > 1 ? statusMappingValue.split('-').join('_') : statusMappingValue
        
    return integrationFieldMappingkeys;
}

/**
 * 
 * @param {*} integrationObject getting the field mapping record object from the scheduler controller.
 * Find the Work order from the CPDWorkOrderModel using integraton id and account id.
 * Then map the fieldmapping keys which are matched with the CPD Work orders.
 * Post the work order to the dataforma.
 * Get the work order details using the id from the post request.
 * Save the record which work order pushed to the dataforma.
 * Then update the status of CPD work order as completed once successfully pushed the code to dataforma. 
 * If we encountered any error while post or get the work order to the dataforma. We have integrations exceptions log which stores the error log for specific work order.
 * Also update the Dataforma work orders when the status of CPD work order changed.
 */

exports.DFCreateWorkorders = async (integrationFieldObject, typeOfCron) => {
    if (integrationFieldObject !== undefined) {
        let fieldmappingkeys = {}
        for (let integrationObject of integrationFieldObject) {
            // find initiated count of WO to push to DF. 
            const CPDWorkOrderDetails = await CPDWorkordersModel.find({ integrationsMasterId: integrationObject.integrationsMasterId, accountId: integrationObject.accountId, status: "initiated" }).lean();
            
            if (integrationObject.serviceMethod === "post") {
               
                // Now loop the CPDWO and then push to DF by API.
                for (let workOrder of CPDWorkOrderDetails) {
                    fieldmappingkeys = integrationObject.mappedDataPoints
                    const getWorkOrderStatusDefaultMappingKeys = await integrationsSettingsModel.findOne({ integrationsMasterId: integrationObject.integrationsMasterId, accountId: integrationObject.accountId })
                    
                    // Find list of DF credentails (encrypted) & then decrypt. 
                    let serviceProviderCredentials = await integrationsMasterServiceProvidersModel.findOne({ integrationsMasterId: integrationObject.integrationsMasterId, serviceProvider: "DF" });
                    let credentailsObj = { iv: process.env.CRYPTO_IV, encryptedData: serviceProviderCredentials.credentials };
                    let decryptConfigCredentials = JSON.parse(await decryptData(credentailsObj, process.env.CRYPTO_KEY))

                    // Find integration credentails and then decrypt and pull CPD calls.
                    let CPDAuthCredentials = await integrationsMasterServiceProvidersModel.findOne({ integrationsMasterId: integrationObject.integrationsMasterId, serviceProvider: "CPD" })
                    let encryptedDetails = { iv: process.env.CRYPTO_IV, encryptedData: CPDAuthCredentials.credentials };
                    let CPDdecryptConfigCredentials = JSON.parse(await decryptData(encryptedDetails, process.env.CRYPTO_KEY));
                    const corrigoToken = await CPDAuthentication(CPDdecryptConfigCredentials.client_id, CPDdecryptConfigCredentials.client_secret, CPDdecryptConfigCredentials.grant_type, CPDdecryptConfigCredentials.baseUrl);
                    fieldmappingkeys = await getCPDFieldMappingkeys(workOrder.CPDWorkOrderId, workOrder.MessageId, fieldmappingkeys, corrigoToken, integrationObject,decryptConfigCredentials, workOrder.CPDWorkOrders.WorkOrderNumber, "")

                    fieldmappingkeys = await getWorkOrderStatusFieldMappingkeys(fieldmappingkeys, workOrder.CPDWorkOrderStatus, getWorkOrderStatusDefaultMappingKeys.statusFieldMappingKeys)
                    fieldmappingkeys = await getDefaultFieldMappingKeys(fieldmappingkeys)
                    fieldmappingkeys = await getDFTypeListIdFromSearchAPI(fieldmappingkeys, decryptConfigCredentials, workOrder.CPDWorkOrders.Type, integrationObject, workOrder.CPDWorkOrderId, workOrder.CPDWorkOrders.WorkOrderNumber, "")
                    fieldmappingkeys.statusDate = new Date().toJSON()
                    console.log('Createfieldmappingkeys:===',fieldmappingkeys)

                    let DFWorkOrderId; let DFWorkorderList = {};
                    let createWorkOrderConfig = {
                        method: 'post',
                        maxBodyLength: Infinity,
                        url: `${decryptConfigCredentials.baseUrl}/workorders`,
                        headers: {
                            'df-auth': decryptConfigCredentials.df_auth,
                            'df-servicecode': decryptConfigCredentials.df_servicecode,
                            'Content-Type': 'application/json',
                        },
                        data: JSON.stringify(fieldmappingkeys)
                    };

                    DFWorkOrderId = await axios.request(createWorkOrderConfig)
                        .then((response) => {
                            console.log("created DFWO ID:===", response.data.id);
                            return response.data.id
                        })
                        .catch(async (error) => {
                            console.log("ERRORSS create DF:==", error.response.data);
                            await exceptionLogs(integrationObject, error.response.status, error.message, JSON.stringify(error.response.data.messages), JSON.stringify(error.config.data), "df-create-workorder", workOrder.CPDWorkOrderId, workOrder.CPDWorkOrders.WorkOrderNumber, "")
                        });
                    console.log("DFWorkOrderId:===", DFWorkOrderId);
                    if (DFWorkOrderId !== undefined) {
                        let getWorkOrderConfig = {
                            method: 'get',
                            maxBodyLength: Infinity,
                            url: `${DFConfigurations.DF.getWorkOrderById.URL}${DFWorkOrderId}`,
                            headers: {
                                'df-auth': decryptConfigCredentials.df_auth,
                                'df-servicecode': decryptConfigCredentials.df_servicecode,
                                'Content-Type': 'application/json',
                            },
                        };
                        const getDFWorkOrderList = await axios.request(getWorkOrderConfig)
                            .then((response) => {
                                DFWorkorderList = JSON.stringify(response.data)
                                console.log("DFWorkorderListresponse:===", JSON.stringify(response.data));
                                return response.data
                            })
                            .catch(async (error) => {
                                console.log("DF Create Get ERROR:==", error.response.data);
                                await exceptionLogs(integrationObject, error.response.status, error.message, JSON.stringify(error.response.data.messages), JSON.stringify(error.config.url + " \n Invalid Request"), "df-get-workorder", workOrder.CPDWorkOrderId, workOrder.CPDWorkOrders.WorkOrderNumber, DFWorkOrderId)
                            });
                            
                        if (getDFWorkOrderList !== undefined) {
                            DFWorkOrderId = JSON.parse(DFWorkorderList).id
                            const listOfDFWorkorderDetails = await DFWorkOrdersModel.findOne({ DFWorkOrderId: DFWorkOrderId, }).lean();
                            if (listOfDFWorkorderDetails) {
                                await DFWorkOrdersModel.findOneAndUpdate({
                                    DFWorkOrderId: DFWorkOrderId, integrationsMasterId: integrationObject.integrationsMasterId,
                                    accountId: integrationObject.accountId,
                                }, { DFWorkOrderStatus: JSON.parse(DFWorkorderList).status, status: "completed", DFWorkOrders: JSON.parse(DFWorkorderList) }, { new: true }).lean()
                            }
                            else {
                                let updatedDFWorkOrderStatus = JSON.parse(DFWorkorderList).status.split(' ').length > 1 ? JSON.parse(DFWorkorderList).status.split(' ').join('-') : JSON.parse(DFWorkorderList).status
                                const DFWorkOrderDetails = await DFWorkOrdersModel.create({
                                    integrationsMasterId: integrationObject.integrationsMasterId,
                                    accountId: integrationObject.accountId,
                                    integrationsCronId: workOrder.integrationsCronId,
                                    DFWorkOrderId: DFWorkOrderId,
                                    DFWorkOrders: JSON.parse(DFWorkorderList),
                                    DFWorkOrderStatus: updatedDFWorkOrderStatus,
                                    status: "completed",
                                });
                                await CPDWorkordersModel.findOneAndUpdate({ CPDWorkOrderId: workOrder.CPDWorkOrderId, integrationsMasterId: integrationObject.integrationsMasterId, accountId: integrationObject.accountId }, { status: "completed" }, { new: true })
                                // workOrderPushedCount++
                                await integrationsCronsModel.findByIdAndUpdate(workOrder.integrationsCronId, { $inc:{pushedCount: 1} }, { new: true });
                                // insert work order life cycle.
                                await workOrderLifeCycleModel.create({
                                    workOrderId: DFWorkOrderId,
                                    WorkOrderNumber:JSON.parse(DFWorkorderList).numberAlt,
                                    workOrderStatus: updatedDFWorkOrderStatus,
                                    accountId: integrationObject.accountId,
                                    integrationsMasterId: integrationObject.integrationsMasterId,
                                    serviceProvider: "DF",
                                    date_created: new Date()
                                });
                            }
                        }
                    }
                }
            }            
            else if (integrationObject.serviceMethod === "patch") {

                // Update work orders to the Dataforma.
                const updateRequestDFWorkorders = await DFWorkOrdersModel.find({ integrationsMasterId: integrationObject.integrationsMasterId, accountId: integrationObject.accountId, status: "update-request" })

                for (let DFWorkOrder of updateRequestDFWorkorders) {
                    fieldmappingkeys = integrationObject.mappedDataPoints
                    const getCPDWorkOrderStatus = await CPDWorkordersModel.findOne({ integrationsMasterId: integrationObject.integrationsMasterId, accountId: integrationObject.accountId, "CPDWorkOrders.WorkOrderNumber": DFWorkOrder.DFWorkOrders.numberAlt })
                    const getWorkOrderStatusDefaultMappingKeys = await integrationsSettingsModel.findOne({ integrationsMasterId: integrationObject.integrationsMasterId, accountId: integrationObject.accountId })

                    // Find integration credentails and then decrypt and pull CPD calls.
                    let CPDAuthCredentials = await integrationsMasterServiceProvidersModel.findOne({ integrationsMasterId: integrationObject.integrationsMasterId, serviceProvider: "CPD" })
                    let encryptedDetails = { iv: process.env.CRYPTO_IV, encryptedData: CPDAuthCredentials.credentials };
                    let CPDdecryptConfigCredentials = JSON.parse(await decryptData(encryptedDetails, process.env.CRYPTO_KEY));
                    const corrigoToken = await CPDAuthentication(CPDdecryptConfigCredentials.client_id, CPDdecryptConfigCredentials.client_secret, CPDdecryptConfigCredentials.grant_type, CPDdecryptConfigCredentials.baseUrl);
                    
                    
                    let serviceProviderCredentials = await integrationsMasterServiceProvidersModel.findOne({ integrationsMasterId: integrationObject.integrationsMasterId, serviceProvider: "DF" });
                    let encrypted = { iv: process.env.CRYPTO_IV, encryptedData: serviceProviderCredentials.credentials };
                    // console.log("Step-1 called");

                    let decryptConfigCredentials = JSON.parse(await decryptData(encrypted, process.env.CRYPTO_KEY))
                    fieldmappingkeys = await getCPDFieldMappingkeys(getCPDWorkOrderStatus.CPDWorkOrderId, getCPDWorkOrderStatus.MessageId, fieldmappingkeys, corrigoToken, integrationObject, decryptConfigCredentials, getCPDWorkOrderStatus.CPDWorkOrders.WorkOrderNumber, DFWorkOrder.DFWorkOrderId)

                    fieldmappingkeys = await getDefaultFieldMappingKeys(fieldmappingkeys)
                    fieldmappingkeys = await getWorkOrderStatusFieldMappingkeys(fieldmappingkeys, getCPDWorkOrderStatus.CPDWorkOrderStatus, getWorkOrderStatusDefaultMappingKeys.statusFieldMappingKeys)
                    fieldmappingkeys.statusDate = new Date().toJSON()
                    
                    // Find and map the typeListId value
                    fieldmappingkeys = await getDFTypeListIdFromSearchAPI(fieldmappingkeys, decryptConfigCredentials, getCPDWorkOrderStatus.CPDWorkOrders.Type, integrationObject, getCPDWorkOrderStatus.CPDWorkOrderId, getCPDWorkOrderStatus.CPDWorkOrders.WorkOrderNumber, DFWorkOrder.DFWorkOrderId)
                    console.log('Updatefieldmappingkeys:===',fieldmappingkeys);
                    let DFWorkorderList = {}
                    let DFWorkOrderId
                    let updateWorkOrderConfig = {
                        method: 'put',
                        maxBodyLength: Infinity,
                        url: `${DFConfigurations.DF.updateWorkOrder.URL}${DFWorkOrder.DFWorkOrderId}`,
                        headers: {
                            'df-auth': decryptConfigCredentials.df_auth,
                            'df-servicecode': decryptConfigCredentials.df_servicecode,
                            'Content-Type': 'application/json',
                        },
                        data: JSON.stringify(fieldmappingkeys)
                    }
                    const DFUpdatedWorkOrderId = await axios.request(updateWorkOrderConfig)
                        .then((response) => {
                            DFWorkorderList = JSON.stringify(response.data)
                            console.log("DFUpdateWorkorderListresponse:===", JSON.stringify(response.data));
                            return response.data.id
                        })
                        .catch(async (error) => {
                            console.log("UpdateERROR:==", error);
                            await exceptionLogs(integrationObject, error.response.status, error.message, JSON.stringify(error.response.data), JSON.stringify(error.config.data), "df-update-workorder", getCPDWorkOrderStatus.CPDWorkOrderId, getCPDWorkOrderStatus.CPDWorkOrders.WorkOrderNumber, DFWorkOrder.DFWorkOrderId)
                        });
                        console.log('DFUpdatedWorkOrderId:==',DFUpdatedWorkOrderId)
                    let getWorkOrderConfig = {
                        method: 'get',
                        maxBodyLength: Infinity,
                        url: `${DFConfigurations.DF.getWorkOrderById.URL}${DFUpdatedWorkOrderId}`,
                        headers: {
                            'df-auth': decryptConfigCredentials.df_auth,
                            'df-servicecode': decryptConfigCredentials.df_servicecode,
                            'Content-Type': 'application/json',
                        },
                    };
                    const getDFWorkOrderList = await axios.request(getWorkOrderConfig)
                        .then((response) => {
                            DFWorkorderList = JSON.stringify(response.data)
                            return response.data
                            // console.log("DFWorkorderListresponse:===", JSON.stringify(response.data));
                        })
                        .catch(async (error) => {
                            console.log("DF Update Get ERROR:==", error.response.data);
                            await exceptionLogs(integrationObject, error.response.status, error.message, JSON.stringify(error.response.data), JSON.stringify(error.config.url + " \n Invalid Request"), "df-get-workorder", getCPDWorkOrderStatus.CPDWorkOrderId, getCPDWorkOrderStatus.CPDWorkOrders.WorkOrderNumber, DFWorkOrder.DFWorkOrderId)
                        });
                        console.log('getDFWorkOrderList:==',getDFWorkOrderList)
                    if (getDFWorkOrderList !== undefined) {
                        DFWorkOrderId = DFWorkorderList.id
                        const listOfDFWorkorderDetails = await DFWorkOrdersModel.findOne({ DFWorkOrderId: DFUpdatedWorkOrderId }).lean();
                        if (listOfDFWorkorderDetails) {
                            let updatedDFWorkOrderStatus = JSON.parse(DFWorkorderList).status.split(' ').length > 1 ? JSON.parse(DFWorkorderList).status.split(' ').join('-') : JSON.parse(DFWorkorderList).status
                            await DFWorkOrdersModel.findOneAndUpdate({
                                DFWorkOrderId: DFWorkOrder.DFWorkOrderId, integrationsMasterId: integrationObject.integrationsMasterId,
                                accountId: integrationObject.accountId,
                            }, {
                                DFWorkOrders: JSON.parse(DFWorkorderList),
                                DFWorkOrderStatus: updatedDFWorkOrderStatus,
                                status: "completed"
                            }, { new: true }).lean()

                            // insert work order life cycle.
                            await workOrderLifeCycleModel.create({
                                workOrderId: DFWorkOrder.DFWorkOrderId,
                                WorkOrderNumber:JSON.parse(DFWorkorderList).numberAlt,
                                workOrderStatus: updatedDFWorkOrderStatus,
                                accountId: integrationObject.accountId,
                                integrationsMasterId: integrationObject.integrationsMasterId,
                                serviceProvider: "DF",
                                date_created: new Date()
                            });
                        }
                        else {
                            //nothing
                        }
                    }
                }
            }
        }
    }
};