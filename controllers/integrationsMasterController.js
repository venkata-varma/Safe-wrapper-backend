// const axios = require('axios');
const serviceProvidersModel = require("../models/integrationsMasterModels/integrationsMasterServiceProvidersModel");
const integrationsFieldMappingModel = require("../models/integrationsMasterModels/integrationsFieldMappingModel");
const integrationsSettingsModel = require("../models/integrationsMasterModels/integrationsSettingsModel");
const authentication = require("../utils/authentication");
const asyncWrapper = require("../middleware/asyncWrapper");
const customConstants = require("../config/constants.json");
const sessionsModel = require("../models/sessionModels/sessionsModel");
const integrationsMasterModel = require("../models/integrationsMasterModels/integrationsMasterModel");
const integrationsMasterServiceProvidersModel = require("../models/integrationsMasterModels/integrationsMasterServiceProvidersModel");
const fieldMappingsMasterModel = require("../models/integrationsMasterModels/fieldMappingsMasterModel");
const fieldMappingMasterDefaultServicesModel = require("../models/integrationsMasterModels/fieldMappingMasterDefaultServicesModel");
const serviceProviderListModel = require('../models/integrationsMasterModels/serviceProviderList')
const { encryptData, decryptData } = require('../utils/encryptionAlgorithms')
const accountsModel = require('../models/accountsModels/accountsModel')
const integrationsExceptionsModel = require("../models/integrationsMasterModels/integrationsExceptionsModel");
const integrationsCronsModel = require('../models/integrationsMasterModels/integrationsCronsModel')
const mongoose = require('mongoose')
const cpdWorkOrdersModel = require('../models/workOrdersModels/CPDWorkordersModel')
const dfWorkOrdersModel = require('../models/workOrdersModels/DFWorkOrdersModel')
const CPDOperations = require('../middleware/CPDOperations');
const DFOperations = require('../middleware/DFOperations');
const CPDWorkordersModel = require("../models/workOrdersModels/CPDWorkordersModel");
const usersModel = require("../models/usersModels/usersModel");
const DFWorkOrdersModel = require("../models/workOrdersModels/DFWorkOrdersModel");
const serviceProvidersMappingAndServicesModel = require("../models/integrationsMasterModels/serviceProvidersMappingAndServicesModel");
const { dateAsset } = require('../utils/utilsFunctions');
const { getServiceWorkOrdersAndStatus } = require("../utils/general");
const { CPDAuthentication, DFAuthentication } = require('../utils/serviceProvidersAuthentication')


/**
 * Get the static images.
 */

exports.getImages = asyncWrapper(async (req, res) => {
  // Constructing the URL based on the request object
  const baseUrl = req.protocol + '://' + req.get('host');
  const imageUrls = [
    {
      name: "TT",
      url: baseUrl + '/static/TurboTax_logo.png'
    },
    {
      name: "AM",
      url: baseUrl + '/static/Acumatica_logo.png'
    },
    {
      name: "CPD",
      url: baseUrl + '/static/CorrigoPro_logo.png'
    },
    {
      name: "DF",
      url: baseUrl + '/static/Dataforma_logo.png'
    },
    {
      name: "QB",
      url: baseUrl + '/static/Quickbooks_logo.png'
    },
    {
      name: "SC",
      url: baseUrl + '/static/ServiceChannel_logo.png'
    },
    {
      name: "SNOW",
      url: baseUrl + '/static/servicenow_logo.png'
    },
    {
      name: "MDS",
      url: baseUrl + '/static/MDS_logo2.png'
    }
  ]

  if (!baseUrl || !imageUrls) {
    return res.status(500).json({ error: "Unable to construct image URL" });
  }

  return res
    .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
    .json({
      status: customConstants.messages.MESSAGE_SUCCESS,
      message: customConstants.messages.MESSAGE_GLOBAL_IMAGES,
      imageUrls,
    });
});



/**
 * Get global constants.
 * Get default field mapping keys of serivce providers.
 * Get field mapping keys of each service provider.
 * Get service provider list includes logo, service provider type etc.,
 */

exports.getGlobalConstants = asyncWrapper(async (req, res) => {
  const fieldMappingMasterDefaultServices = await fieldMappingMasterDefaultServicesModel.find({});
  const fieldMappingsMasters = await fieldMappingsMasterModel.find({});
  const serviceproviderlists = await serviceProviderListModel.find({});
  const serviceProvidersMappingAndServices = await serviceProvidersMappingAndServicesModel.find({});

  const cronSchedulePicker = {
    eachSecond: 'each second',
    eachMinute: 'once each minute',
    eachHour: 'once each hour',
    eachDay: 'once each day',
    eachMonth: 'once each month',
    custom: "custom"
  }
  return res
    .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
    .json({
      status: customConstants.messages.MESSAGE_SUCCESS,
      message: customConstants.messages.MESSAGE_GLOBAL_CONSTANTS,
      data: {
        fieldMappingMasterDefaultServices, fieldMappingsMasters, serviceproviderlists, cronSchedulePicker,
        serviceProvidersMappingAndServices
      },
    });

});

/** 
 *Middleware to check for Active status for provided Integration Master
 *If passed, it proceeds to decrypt provided encrypted credential
*/

exports.validationForDecrypt = asyncWrapper(async (req, res, next) => {
  const { accountId, integrationMasterId, encryptedString } = req.body
  const integrationMasterDetails = await integrationsMasterModel.findOne({ _id: integrationMasterId, accountId }).lean();
  console.log('integrationMasterDetails', integrationMasterDetails)
  if (integrationMasterDetails.status !== 'active') {
    return res.status(customConstants.statusCodes.ERROR_STATUS_CODE_NOT_FOUND).json({
      status: customConstants.messages.MESSAGE_FAIL,
      message: customConstants.messages.MESSAGE_INTEGRATION_ID_NOT_ACTIVE, // to be changed now
    });

  }
  else {
    next()
  }
})

/**
 *Function to provide decrypted result when a encrypted credential is provided
 *Inputs :
    1. Account Id 
    2. Integration Id 
    3. Encrypted string (credential of service provider)
 *Returns JSON-parsed decrypted result 
*/

exports.getIntegrationCryptoService = asyncWrapper(async (req, res) => {
  const { accountId, integrationId, encryptedString } = req.body
  const encrypted = {
    iv: process.env.CRYPTO_IV,
    encryptedData: encryptedString
  };
  const decryptedResult = JSON.parse(await decryptData(encrypted, process.env.CRYPTO_KEY));
  return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
    status: customConstants.messages.MESSAGE_SUCCESS,
    message: customConstants.messages.MESSAGE_SERVICE_PROVIDERS_LISTS_DETAILS_FOUND,
    data: {
      decryptedResult
    }
  });

})

/**
  *Middleware function to check count of active integrations of respective account
  *If count is already 2 ,and Any user visits to add one more, 
     Returns Warning message with exisiting count

*/
exports.validateCreateIntegrationsCount = asyncWrapper(async (req, res, next) => {
  const integrationsCount = await integrationsMasterModel.find({ accountId: req.user.accountId, status: 'active' });

  const respectiveAccount = await accountsModel.findById(req.user.accountId);
  if (integrationsCount.length >= respectiveAccount.noOfIntegrations) {
    return res.status(customConstants.statusCodes.UNPROCESSABLE_STATUS_CODE_FAIL).json({
      status: customConstants.messages.MESSAGE_WARNING,
      message: customConstants.messages.MESSAGE_INTEGRATION_COUNT_REACHED
    });
  }
  else {
    next()
  }

})

/*
Function to create first step of initiating new integration process
Mandatory-> Title and Description
Returns newly created IntegrationMaster record 
*/
exports.createIntegrationMaster = asyncWrapper(async (req, res) => {

  console.log("req", req.user)
  const integrationsDetails = await integrationsMasterModel.create({
    ...req.body,
    createdBy: req.user._id,
    updatedBy: req.user._id,
    accountId: req.user.accountId,
    userId: req.user.userId
  });

  return res
    .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
    .json({
      status: customConstants.messages.MESSAGE_SUCCESS,
      message: customConstants.messages.MESSAGE_INTEGRATION_CREATED,
      data: { integrationsDetails },
    });

});


/**
 * Middleware function to Create Integration 
 * Validate integration master exist
 * If passed , middleware passes function call to "Create Integration"
*/

exports.validateintegrationsMasterExist = asyncWrapper(async (req, res, next) => {
  const { integrationsMasterId } = req.body;
  console.log('integrationMasterId:===', integrationsMasterId)
  const integrationMasterDetails = await integrationsMasterModel.findById(integrationsMasterId)
  if (!integrationMasterDetails) {
    return res.status(customConstants.statusCodes.ERROR_STATUS_CODE_NOT_FOUND).json({
      status: customConstants.messages.MESSAGE_FAIL,
      message: customConstants.messages.MESSAGE_INTEGRATION_DETAILS_NOT_FOUND,
    });
  }
  else {
    next()
  }
});


/**
 * Middleware function to "Create Integration service providers".
 * Function to check whether entered credentials are valid or not.
 * If invalid, throws the required error. 
 * If passed, middleware passes function call to next function that stores credentials in database
 */

exports.credentialsValidationsMiddleware = asyncWrapper(async (req, res, next) => {
  if (req.body.serviceProvider === 'CPD') {
    const checkCPDCredentials = await CPDAuthentication(req.body.credentials.client_id, req.body.credentials.client_secret, req.body.credentials.grant_type, req.body.credentials.baseUrl)

    if (checkCPDCredentials === 'error') {

      return res.status(customConstants.statusCodes.ERROR_STATUS_CODE_NOT_FOUND).json({
        status: customConstants.messages.MESSAGE_FAIL,
        message: customConstants.messages.MESSAGE_AUTHENTICATION_FAILURE,
      });
    }
  }
  if (req.body.serviceProvider === 'DF') {
    const checkDFCredentials = await DFAuthentication(req.body.credentials.df_auth, req.body.credentials.df_servicecode, req.body.credentials.baseUrl)

    if (checkDFCredentials !== 200) {
      return res.status(customConstants.statusCodes.ERROR_STATUS_CODE_NOT_FOUND).json({
        status: customConstants.messages.MESSAGE_FAIL,
        message: customConstants.messages.MESSAGE_AUTHENTICATION_FAILURE,
      });
    }
  }
  next()
})


/*
Function to create second step of a initiating new integration process
Mandatory->Details of service providers
Returns newly created Service provider record (From , To ) 
*/

exports.createIntegrationMasterServiceProviderCredentials = asyncWrapper(async (req, res) => {

  const { serviceProvider, integrationsMasterId, credentials } =
    req.body;

  const encryptedObjectJson = JSON.stringify(req.body.credentials);
  const key = Buffer.from(process.env.CRYPTO_KEY, 'hex');
  let iv = Buffer.from(process.env.CRYPTO_IV, 'hex')

  // Create a new service provider
  const serviceProviderDetails = await serviceProvidersModel.create({
    ...req.body,
    credentials: encryptData(encryptedObjectJson, key, iv),
    createdBy: req.user._id,
    userId: req.user._id,
    accountId: req.user.accountId
  });


  const pastIntegrationDetails = await integrationsMasterModel.findOne({
    integrationsMasterId: req.body.integrationsMasterId,
  });
  console.log(pastIntegrationDetails, "pastIntegrationDetails");


  const updateFields = {
    stepCount: pastIntegrationDetails.stepCount + 1,
    updatedBy: req.user._id,
  };
  //From , To 's are decided ---Don't remove this comment
  if (pastIntegrationDetails.stepCount === 1) {
    updateFields.from = serviceProvider;
  } else {
    updateFields.to = serviceProvider;
  }
  delete req.body.status;
  // Perform the update
  const updatedIntegrationsDetails = await integrationsMasterModel.findByIdAndUpdate(
    integrationsMasterId,
    {
      ...req.body,
      ...updateFields
    },
    { new: true } // Options to return the updated document
  );

  return res
    .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
    .json({
      status: customConstants.messages.MESSAGE_SUCCESS,
      message: customConstants.messages.MESSAGE_SERVICE_PROVIDER_CREATED,
      data: { updatedIntegrationsDetails },
    });

});

/**
 * Verify whether the database has default keys for field mapping.
 * If not create a record.
 */
exports.fieldMappingMasterDefaultServicesList = asyncWrapper(async (req, res, next) => {
  const { integrationsMasterId } = req.params;
  let keyMapping, fromFieldMappingkeysDetails, toFieldMappingkeysDetails, dataPointURL, serviceMethod, updateDataPointURL, updateServiceMethod

  const integrationDetails = await integrationsMasterModel.findById(integrationsMasterId, { from: 1, to: 1 })
  let get_integration_field_mapping_master_default_keys = await fieldMappingMasterDefaultServicesModel.find({ $and: [{ from: integrationDetails.from }, { to: integrationDetails.to }] })
  if (get_integration_field_mapping_master_default_keys.length > 0) {

    return res
      .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
      .json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_SERVICE_PROVIDER_CREATED,
        data: { get_integration_field_mapping_master_default_keys },
      });
  }
  else {
    fromFieldMappingkeysDetails = await fieldMappingsMasterModel.find({ serviceProvider: integrationDetails.from }).lean();
    toFieldMappingkeysDetails = await fieldMappingsMasterModel.find({ serviceProvider: integrationDetails.to }).lean();
    let fieldMappingDefaultKeys = []
    let get_integration_field_mapping_master_default_keys = [];
    fieldMappingDefaultKeys.push(...fromFieldMappingkeysDetails, ...toFieldMappingkeysDetails)
    function getKeyMapping(fromProvider, toProvider) {
      const fromKeys_create = { "create-work-order-keys": [] };
      const toKeys_create = { "create-work-order-keys": [] };
      const fromKeys_update = { "update-work-order-keys": [] };
      const toKeys_update = { "update-work-order-keys": [] };
      fieldMappingDefaultKeys.forEach(hotkey => {
        if (hotkey.serviceProvider === fromProvider) {
          if (hotkey.serviceType === "work-orders" && hotkey.serviceMethod === "create") {
            dataPointURL = hotkey.dataPointURL;
            serviceMethod = hotkey.serviceMethod;
            fromKeys_create["create-work-order-keys"] = hotkey.dataPoints;
          }
        } else if (hotkey.serviceProvider === toProvider) {
          if (hotkey.serviceType === "work-order" && hotkey.serviceMethod === "get") {
            toKeys_create["create-work-order-keys"] = hotkey.dataPoints;
          }
        }
      });

      fieldMappingDefaultKeys.forEach(hotkey => {
        if (hotkey.serviceProvider === fromProvider) {
          if (hotkey.serviceType === "work-orders" && hotkey.serviceMethod === "update") {
            updateDataPointURL = hotkey.dataPointURL;
            updateServiceMethod = hotkey.serviceMethod;
            fromKeys_update["update-work-order-keys"] = hotkey.dataPoints;
          }
        } else if (hotkey.serviceProvider === toProvider) {
          if (hotkey.serviceType === "work-order" && hotkey.serviceMethod === "get") {
            toKeys_update["update-work-order-keys"] = hotkey.dataPoints;
          }
        }
      });

      const workOrderMapping = fromKeys_create["create-work-order-keys"].reduce((acc, key, index) => {
        acc[key] = toKeys_create["create-work-order-keys"][index] || null;
        return acc;
      }, {});
      const updateWorkOrderMapping = fromKeys_update["update-work-order-keys"].reduce((acc, key, index) => {
        acc[key] = toKeys_update["update-work-order-keys"][index] || null;
        return acc;
      }, {});
      return {
        work_order: workOrderMapping,
        dataPointURL: dataPointURL,
        serviceMethod: serviceMethod,

        update_work_order_keys: updateWorkOrderMapping,
        updateDataPointURL: dataPointURL,
        updateServiceMethod: serviceMethod
      }
    }

    // Mapping should be done for toProvider from fromProvider
    keyMapping = getKeyMapping(integrationDetails.to, integrationDetails.from);

    // create work order keys to updaload fieldMappingMasterDefaultServicesModel.
    let create_work_order_keys_data_to_upload_fieldMappingMasterDefaultServicesModel = {
      from: integrationDetails.from,
      to: integrationDetails.to,
      serviceMethod: keyMapping.serviceMethod,
      dataPointURL: `${keyMapping.dataPointURL}`,
      dataPoints: keyMapping.work_order
    }
    let create_work_order_field_mapping_keys = await fieldMappingMasterDefaultServicesModel.create(create_work_order_keys_data_to_upload_fieldMappingMasterDefaultServicesModel);

    // Update work order keys to updaload fieldMappingMasterDefaultServicesModel.
    let update_work_order_keys_data_to_upload_fieldMappingMasterDefaultServicesModel = {
      from: integrationDetails.from,
      to: integrationDetails.to,
      serviceMethod: keyMapping.updateServiceMethod,
      dataPointURL: `${keyMapping.updateDataPointURL}`,
      dataPoints: keyMapping.update_work_order_keys
    }
    let update_work_order_field_mapping_keys = await fieldMappingMasterDefaultServicesModel.create(update_work_order_keys_data_to_upload_fieldMappingMasterDefaultServicesModel);

    get_integration_field_mapping_master_default_keys.push({ ...create_work_order_field_mapping_keys._doc }, { ...update_work_order_field_mapping_keys._doc })

    return res
      .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
      .json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_SERVICE_PROVIDER_CREATED,
        data: { get_integration_field_mapping_master_default_keys }
      });
  }
});


/*
Function to create third step of initiating new integration process
Mandatory->Desired Field mappings between two service providers 
Returns committed Field mappings for either Work order or Invoices 
*/
exports.updateIntegrationMasterFieldMappings = asyncWrapper(async (req, res) => {
  console.log(req.body, "checkkkk");

  const { integrationsMasterId, userId } = req.body;
  const pastIntegrationDetails = await integrationsMasterModel.findOne({
    integrationsMasterId,
  });

  let updatedIntegrationsDetails;

  // Create or update the integrationsFieldMapping
  let integrationsFieldMapping;
  const existingFieldMapping = await integrationsFieldMappingModel.findOne({
    integrationsMasterId,
  });

  let CPDtoDFIntegrationExist = await integrationsMasterModel.findOne({integrationsMasterId:integrationsMasterId,from:"CPD",to:"DF"}).lean()
  let requiredKeys = {}
  if(CPDtoDFIntegrationExist){
    requiredKeys = {
      numberAlt : "WorkOrderNumber",
      budgetedProposedStatus : "NONE",
      buildingId : 1715,
      invoiceToCustomerId : 2238,
      invoiceType : "EXTERNAL_CHARGE",
      reportedById : 5515,
      workDescription : "DevRabbit Testing WorkOrders (Ignore)."
    }
  }

  if (existingFieldMapping) {
    integrationsFieldMapping =
      await integrationsFieldMappingModel.findOneAndUpdate(
        { integrationsMasterId },
        { $set: { ...req.body, updatedBy: req.user._id } },
        { new: true }
      );
    updatedIntegrationsDetails = await integrationsMasterModel.findById(integrationsMasterId)
  } else {
    integrationsFieldMapping = await integrationsFieldMappingModel.create({
      ...req.body,
      requiredKeys : requiredKeys,
      createdBy: req.user._id,
      updatedBy: req.user._id,
      userId: req.user._id,
      accountId: req.user.accountId
    });
    updatedIntegrationsDetails = await integrationsMasterModel.findByIdAndUpdate(
      integrationsMasterId,
      {
        stepCount: pastIntegrationDetails.stepCount + 1,
        updatedBy: req.user._id,
      },
      { new: true } // Options to return the updated document
    );
  }

  return res
    .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
    .json({
      status: customConstants.messages.MESSAGE_SUCCESS,
      message: customConstants.messages.MESSAGE_INTEGRATION_FIELDS_MAPPINGS_UPDATED,
      data: { updatedIntegrationsDetails },
    });

});


/*
Function to create Fourth step of initiating new integration process
Mandatory->Desired Frequency of data integration
Returns committed cron-job frequency model -Days, Month etc;
*/
exports.updateIntegrationMasterSettings = asyncWrapper(async (req, res) => {
  console.log(req.body, "checkkkk");

  const { integrationsMasterId, userId } = req.body;
  const pastIntegrationDetails = await integrationsMasterModel.findOne({
    integrationsMasterId,
  });

  let updatedIntegrationsDetails;
  let integrationsSettings;
  const existingintegrationsSettings =
    await integrationsSettingsModel.findOne({
      integrationsMasterId,
    });

  if (existingintegrationsSettings) {
    integrationsSettings = await integrationsSettingsModel.findOneAndUpdate(
      { integrationsMasterId },
      { $set: { ...req.body, updatedBy: req.user._id } },
      { new: true }
    );
    updatedIntegrationsDetails = await integrationsMasterModel.findById(integrationsMasterId)
  } else {
    integrationsSettings = await integrationsSettingsModel.create({
      ...req.body,
      createdBy: req.user._id,
      userId: req.user._id,
      accountId: req.user.accountId
    });
    // Perform the update
    updatedIntegrationsDetails = await integrationsMasterModel.findByIdAndUpdate(
      integrationsMasterId,
      {
        stepCount: pastIntegrationDetails.stepCount + 1,
        updatedBy: req.user._id,
      },
      { new: true } // Options to return the updated document
    );
  }

  return res
    .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
    .json({
      status: customConstants.messages.MESSAGE_SUCCESS,
      message: customConstants.messages.MESSAGE_INTEGRATIONS_SETTINGS,
      data: { updatedIntegrationsDetails },
    });

});


/**
 * Validate integration master exist.
 * validate integration master status. 
*/

exports.validateintegrationsMaster = asyncWrapper(async (req, res, next) => {
  const { integrationsMasterId } = req.params;
  const integrationMasterDetails = await integrationsMasterModel.findById(integrationsMasterId)
  if (!integrationMasterDetails) {
    return res.status(customConstants.statusCodes.ERROR_STATUS_CODE_NOT_FOUND).json({
      status: customConstants.messages.MESSAGE_FAIL,
      message: customConstants.messages.MESSAGE_INTEGRATION_DETAILS_NOT_FOUND,
    });
  }
  else {
    next()
  }
})


/*
Function to return datails of a specific Integration master table record by "Params"

*/
exports.getSingleIntegrationMasterDetails = asyncWrapper(async (req, res) => {
  const integrationsMasterId = req.params.integrationsMasterId;
  const integrationDetails = await integrationsMasterModel.findById(integrationsMasterId).lean();

  console.log(integrationsMasterId, "integrationsMasterId");

  const settingsDetails = await integrationsSettingsModel.find({ integrationsMasterId: integrationsMasterId }).lean();
  const integrationMasterFieldMappingDetails = await integrationsFieldMappingModel.find({ integrationsMasterId: integrationsMasterId }).lean();
  const integrationMasterServiceProviders = await integrationsMasterServiceProvidersModel.find({ integrationsMasterId });
  const integrationExceptions = await integrationsExceptionsModel.find({ integrationsMasterId }).lean();
  let presentWeekData = dateAsset();

  const activityLogOfIndividualIntegration = await integrationsCronsModel.find({ integrationsMasterId }).sort({ _id: -1 }).limit(20).lean();

  //Integration exception count for last 7 days 
  const integrationsExceptionsDetails = await integrationsExceptionsModel.find({ integrationsMasterId: integrationsMasterId })
  for (let week of presentWeekData) {
    console.log("FromDate:==", new Date(week.fromDate))
    console.log("toDate:==", new Date(week.toDate))
    let fromDate = new Date(week.fromDate);
    let toDate = new Date(week.toDate);

    let presentWeekIntegrationExceptions = await integrationsExceptionsModel.find({ integrationsMasterId, createdAt: { $gte: new Date(fromDate), $lte: new Date(toDate) } });
    week.integrationsExceptionsCount = presentWeekIntegrationExceptions.length > 0 ? presentWeekIntegrationExceptions.length : 0;
  }

  /**
   * sourceWorkOrdersAndStatus used to get the source work orders, status mapping keys of work orders.
   * destinationWorkOrdersAndStatus used to get the destination work orders, status mapping keys of work orders.
   */

  let sourceWorkOrdersAndStatus = await getServiceWorkOrdersAndStatus(integrationsMasterId, integrationDetails.from, presentWeekData)
  let destinationWorkOrdersAndStatus = await getServiceWorkOrdersAndStatus(integrationsMasterId, integrationDetails.to, presentWeekData)

  let autoDataSync = await integrationsCronsModel.aggregate([
    {
      $match: {
        integrationsMasterId: new mongoose.Types.ObjectId(integrationsMasterId),
      }
    },
    {
      $group: {
        _id: null,
        pulledCount: { $sum: "$pulledCount" },
        pushedCount: { $sum: "$pushedCount" },
        newWOCount: { $sum: "$newWOCount" }
      }
    },
    {
      $project: {
        _id: 0,
        pulledCount: 1,
        pushedCount: 1,
        newWOCount: 1
      }
    }
  ]);

  //Properly parses the above resulted data
  // for (let jsonParse of destinationWorkOrdersAndStatus.destinationWorkOrders) {
  //   jsonParse.DFWorkOrders = jsonParse.DFWorkOrders

  // }
  for (let week of presentWeekData) {
    delete week.fromDate;
    delete week.toDate;

  }
  return res
    .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
    .json({
      status: customConstants.messages.MESSAGE_SUCCESS,
      message: customConstants.messages.MESSAGE_GET_INTEGRATIONS,
      data: {
        integrationDetails,
        integrationsSettingsDetails: settingsDetails,
        integrationMasterFieldMappingDetails: integrationMasterFieldMappingDetails,
        integrationMasterServiceProviders,
        integrationExceptions,
        oneWeekCountStatistics: sourceWorkOrdersAndStatus.presentWeekData.reverse(),
        activityLog: activityLogOfIndividualIntegration,
        sourceWorkOrders: sourceWorkOrdersAndStatus.sourceWorkOrders,
        destinationWorkOrders: destinationWorkOrdersAndStatus.destinationWorkOrders,
        statusMapping: { source: sourceWorkOrdersAndStatus.statuses, destination: destinationWorkOrdersAndStatus.statuses },
        autoDataSync
      },
    });
});
/*
Function to Edit a specific initiated Integration master record
Oppurtunity to edit Title, description etc;
Returns Updated record with new values 
*/
exports.editIntegrationMaster = asyncWrapper(async (req, res) => {
  const { integrationsMasterId } = req.params
  const updatedIntegrationMaster = await integrationsMasterModel.findByIdAndUpdate(integrationsMasterId, { $set: { ...req.body, updatedBy: req.user.userId } }, { new: true })
  console.log('updatedIntegrationMaster:==', integrationsMasterId)
  return res
    .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
    .json({
      status: customConstants.messages.MESSAGE_SUCCESS,
      message: customConstants.messages.MESSAGE_INTEGRATION_UPDATED,
      data: { updatedIntegrationMaster },
    });
})


/*
Function to Edit a specific initiated Integration master service-provider record of respective Integration master 
Oppurtunity to edit credentials of a service provider - From/To;
Returns Updated record with new values

*/
exports.editIntegrationMasterServiceProviderCredentials = asyncWrapper(async (req, res) => {
  console.log("Bot oworking")
  const { integrationsMasterId } = req.params
  const { serviceProviderId } = req.body;
  const integrationServiceProvider = await serviceProvidersModel.findOne({ _id: serviceProviderId });
  if (!integrationServiceProvider) {
    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_NO_CONTENT).json({
      status: customConstants.messages.MESSAGE_FAIL,
      message: customConstants.messages.MESSAGE_INTEGRATION_SERVICE_PROVIDER_DETAILS_NOT_FOUND,
    });
  }
  const updatedServicerProvider = await integrationsMasterServiceProvidersModel.findOneAndUpdate({ _id: serviceProviderId }, {
    $set: {
      serviceProvider: req.body.serviceProvider,
      credentials: req.body.credentials,
      updatedBy: req.user.userId
    }
  },
    { new: true, }
  )

  //Later, Token authentication and status =verified or rejected to be done
  return res
    .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
    .json({
      status: customConstants.messages.MESSAGE_SUCCESS,
      message: customConstants.messages.MESSAGE_INTEGRATION_SERVICE_PROVIDER_DETAILS_UPDATED,
      data: { updatedServicerProvider }
    });
})


/*
Function to Edit a specific initiated Integration field mappings record of respective Integration master 
Oppurtunity to field mappings ;
Returns Updated record with new values 

*/
exports.editIntegrationMasterFieldMappings = asyncWrapper(async (req, res) => {
  const { fieldMappingId, dataPoints, serviceMethod } = req.body;
  const integrationFieldMapping = await integrationsFieldMappingModel.findById(fieldMappingId);

  if (!integrationFieldMapping) {
    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_NO_CONTENT).json({
      status: customConstants.messages.MESSAGE_FAIL,
      message: customConstants.messages.MESSAGE_INTEGRATION_SERVICE_PROVIDER_DETAILS_NOT_FOUND,
    });
  }

  const integrationsFieldMappingDetails = await integrationsFieldMappingModel.findById(fieldMappingId);
  let updatedFieldMapping;

  for (let fieldMapping of integrationsFieldMappingDetails.mappedKeys.get_integration_field_mapping_master_default_keys) {
    if (fieldMapping.serviceMethod === serviceMethod) {
      updatedFieldMapping = await integrationsFieldMappingModel.findByIdAndUpdate(
        fieldMappingId, 
        { 
          $set: { 
            [`mappedKeys.get_integration_field_mapping_master_default_keys.$[elem].dataPoints`]: dataPoints, 
            updatedBy: req.user.userId 
          } 
        }, 
        { 
          new: true,
          arrayFilters: [{ "elem._id": fieldMapping._id }]
        }
      );
      break;
    }
  }

  return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
    status: customConstants.messages.MESSAGE_SUCCESS,
    message: customConstants.messages.MESSAGE_INTEGRATION_SERVICE_FIELD_MAPPINGS_UPDATED,
    data: { updatedFieldMapping }
  });
});


/*
Function to Edit a specific initiated Integration master settings record of respective Integration master 
Oppurtunity to Data integration Frequency for running cron-jobs; 
Returns Updated record with new values 

*/
exports.editIntegrationMasterSettings = asyncWrapper(async (req, res) => {
  //const { intergationMasterId } = req.params;
  const { integrationSettingsId } = req.body;
  const integrationMasterSettings = await integrationsSettingsModel.findById(integrationSettingsId);
  if (!integrationMasterSettings) {
    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_NO_CONTENT).json({
      status: customConstants.messages.MESSAGE_FAIL,
      message: customConstants.messages.MESSAGE_INTEGRATION_SERVICE_PROVIDER_DETAILS_NOT_FOUND,
    });
  }
  let updatedIntegrationMasterSettings = await integrationsSettingsModel.findByIdAndUpdate(integrationSettingsId, { $set: { ...req.body, updatedBy: req.user.userId } }, { new: true })
  return res
    .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
    .json({
      status: customConstants.messages.MESSAGE_SUCCESS,
      message: customConstants.messages.MESSAGE_INTEGRATION_SERVICE_SETTINGS_UPDATED,
      data: { updatedIntegrationMasterSettings }
    });
})


/*
Fucntion to deactivate a specific integration master
Status is updated to deleted
Returns updated record
*/
exports.deactivateInteragtionMasterCrons = asyncWrapper(async (req, res) => {
  console.log("req.body.integrationsMasterId", req.body.integrationsMasterId)
  const integrationsMasterDetails = await integrationsMasterModel.findByIdAndUpdate(req.params.integrationsMasterId, { $set: { status: 'deleted' } }, { new: true });
  return res
    .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
    .json({
      status: customConstants.messages.MESSAGE_SUCCESS,
      message: customConstants.messages.MESSAGE_INTEGRATION_DELETED,
      data: { integrationsMasterDetails }
    });

});

/**
 * Pull latest work orders.
 * Find all integrations by accountId.
 * Then validate that integration is in active or deleted and validate the source and destination of work order.
 * Then find the service provider credentials using integrationId.
 * Then Pass the Credentials and type of cron job to the CPDOperations and DFOperations middleware.
 * CPDOperations and DFOperations will makes the pull and push the work orders.
*/

exports.pullLatestWorkOrders = asyncWrapper(async (req, res) => {
  const { accountId } = req.params;
  const integrationsMasterDetails = await integrationsMasterModel.find({ accountId: accountId });

  if (integrationsMasterDetails.length > 0) {
    for (const integration of integrationsMasterDetails) {
      if (integration.status === 'active' && integration.from === 'CPD' && integration.to === 'DF') {
        const CPDCredentials = await integrationsMasterServiceProvidersModel.findOne({ integrationsMasterId: integration.integrationsMasterId, serviceProvider: "CPD" }).lean();

        await CPDOperations.getCPDWorkOrders(CPDCredentials, typeOfCron = "manual");
        const DFCredentials = await integrationsFieldMappingModel.findOne({ integrationsMasterId: integration.integrationsMasterId, to: "DF" }).lean();

        await DFOperations.DFCreateWorkorders(DFCredentials, typeOfCron = "manual");

        return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
          status: customConstants.messages.MESSAGE_SUCCESS,
          message: customConstants.messages.MESSAGE_CRON_MANUAL
        });
      }
      else if (integration.integrationsMasterId.status === 'active' && integration.integrationsMasterId.from === 'DF') {
        const credentials = await integrationsMasterServiceProvidersModel.findOne({ integrationsMasterId: integration.integrationsMasterId, serviceProvider: "DF" }).lean();
        // integrationCredentials.push(credentials)
      }
      else {
        // nothing
      }
    }
  }
});


/*
* Verify the status of account.
* If status is active pass the middleware.
*/
exports.validateAccountStatus = asyncWrapper(async (req, res, next) => {
  const { accountId } = req.params
  const verifyAccountStatus = await accountsModel.findById(accountId)
  console.log('verifyAccountStatus')
  if (verifyAccountStatus.status === 'deleted') {
    return res.status(customConstants.statusCodes.UNAUTHORIZED).json({
      status: customConstants.messages.MESSAGE_FAIL,
      message: customConstants.messages.MESSAGE_ACCOUNT_ALREADY_DELETED,
    });
  }
  else {
    next()
  }
})

/**
 * Function to provide Integration exceptions of respective account with populated Integration master record
 * @params "accountId"
 * 
 */
exports.getAllIntegrationExceptions = asyncWrapper(async (req, res) => {
  const integrationExceptions = await integrationsExceptionsModel.find({ accountId: req.params.accountId }).populate('integrationsMasterId')


  return res
    .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
    .json({
      status: customConstants.messages.MESSAGE_SUCCESS,
      message: customConstants.messages.MESSAGE_INTEGRATION_EXCEPTIONS_PROVIDED,
      data: {
        integrationExceptions
      }
    });
})




/**
 * Middleware function to GET Field mappings by service type. 
 * @params "accountId" 
 * If passed , middleware passes function call to "getFieldMappingsByServiceType"
*/

exports.middlewareForAccountIntegrationExist = asyncWrapper(async (req, res, next) => {
  
const account=await accountsModel.findOne({_id:req.params.accountId});
  const integrationMasterDetails = await integrationsMasterModel.findById(req.query.integration)

  if(account.status!=='active'||!account){
    return res.status(customConstants.statusCodes.ERROR_STATUS_CODE_NOT_FOUND).json({
      status: customConstants.messages.MESSAGE_FAIL,
      message: customConstants.messages.MESSAGE_ACCOUNT_MIDDLEWARE,
    });
  }
  if (!integrationMasterDetails||integrationMasterDetails.status!=='active') {
    return res.status(customConstants.statusCodes.ERROR_STATUS_CODE_NOT_FOUND).json({
      status: customConstants.messages.MESSAGE_FAIL,
      message: customConstants.messages.MESSAGE_INTEGRATION_MASTER_MIDDLEWARE,
    });
  }
  else {
    next()
  }
});


/**
 * Function to provide Integration specific field-mapping key-values based on service type
 * @params   "accountId"
 */

exports.getFieldMappingsByServiceType = asyncWrapper(async (req, res) => {
  const integerationMaster = req.query.integration;
  const service = req.query.service;
  const integrationFieldMappingsService = await integrationsFieldMappingModel.aggregate([
    {
      $match: {
        integrationsMasterId: new mongoose.Types.ObjectId(integerationMaster),
        accountId: new mongoose.Types.ObjectId(req.params.accountId),

      }
    },
    {
      $addFields: {
        fieldMappinsByService: {
          $filter: {
            input: "$mappedKeys.get_integration_field_mapping_master_default_keys",
            as: "key",
            cond: { $eq: ["$$key.serviceMethod", service] }
          }
        }
      }
    },
    {
      $project: {
        mappedKeys: 0
      }
    }
  ])
  // const fieldMappingDefaultServicesFilter = await fieldMappingMasterDefaultServicesModel.aggregate([
  //   {
  //     $match: {
  //       from: integrationFieldMappingsService[0].from,
  //       to: integrationFieldMappingsService[0].to,
  //       serviceMethod: service
  //     }
  //   }
  // ])


  return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).
    json({
      status: customConstants.messages.MESSAGE_SUCCESS,
      message: customConstants.messages.MESSAGE_FIELD_MAPPINGS_BY_SERVICE,
      data: {
        integrationFieldMappingsService,
        // fieldMappingDefaultServicesFilter
      }
    })
})

/**
 * Middlweare function to check for existence & status of account and integraiton 
 * If passed, function call is passed to "updateIntegrationFieldMappingsByServiceType"
 */

exports.middlewareForIntegrationExist = asyncWrapper(async (req, res, next) => {
  

    const integrationFieldDetails = await integrationsFieldMappingModel.findById(req.body.integrationFieldMappingId);
    const integrationMaster=await integrationsMasterModel.findOne({_id:integrationFieldDetails.integrationsMasterId});
    const account=await accountsModel.findOne({_id:integrationFieldDetails.accountId});
    if(account.status!=='active'||!account){
      return res.status(customConstants.statusCodes.ERROR_STATUS_CODE_NOT_FOUND).json({
        status: customConstants.messages.MESSAGE_FAIL,
        message: customConstants.messages.MESSAGE_ACCOUNT_MIDDLEWARE,
      });
    }
    if (!integrationMaster||integrationMaster.status!=='active') {
      return res.status(customConstants.statusCodes.ERROR_STATUS_CODE_NOT_FOUND).json({
        status: customConstants.messages.MESSAGE_FAIL,
        message: customConstants.messages.MESSAGE_INTEGRATION_MASTER_MIDDLEWARE,
      });
    }
    else {
      next()
    }
  });
  
  


/**
 * Function to Find  Integration field mapping record of respective integration 
    and update Field mapping record based on "Service method"
 * 
 */
exports.updateIntegrationFieldMappingsByServiceType = asyncWrapper(async (req, res) => {
  const updateFieldMapping = await integrationsFieldMappingModel.findOne({ _id: req.body.integrationFieldMappingId });
  console.log('UpdateField', updateFieldMapping)
 
  for (let mapping of updateFieldMapping.mappedKeys.get_integration_field_mapping_master_default_keys) {
    if (mapping.fieldMappingMasterDefaultServicesId.toString() === req.body.fieldMappingMasterDefaultServicesId) {
      mapping.dataPoints = req.body.integrationFieldMappings
   
    }
  }
  await updateFieldMapping.save()

  return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).
    json({
      status: customConstants.messages.MESSAGE_SUCCESS,
      message: customConstants.messages.MESSAGE_UPDATE_FIELD_MAPPINGS_BY_SERVICE,
      data: {

        updateFieldMapping
      }
    })
})