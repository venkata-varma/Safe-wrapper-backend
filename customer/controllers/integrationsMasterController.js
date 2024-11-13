// const axios = require('axios');
const serviceProvidersModel = require("../../models/integrationsMasterServiceProvidersModel");
const integrationsFieldMappingModel = require("../../models/integrationsFieldMappingModel");
const integrationsSettingsModel = require("../../models/integrationsSettingsModel");
const authentication = require("../../utils/authentication");
const asyncWrapper = require("../../middleware/asyncWrapper");
const customConstants = require("../../config/constants.json");
const sessionsModel = require("../../models/sessionsModel");
const integrationsMasterModel = require("../../models/integrationsMasterModel");
const integrationsMasterServiceProvidersModel = require("../../models/integrationsMasterServiceProvidersModel");
const serviceProviderServicesModel = require("../../models/serviceProviderServicesModel");
const serviceProvidersIntegrationWithServicesModel = require("../../models/serviceProvidersIntegrationWithServicesModel");
const serviceProviderListModel = require('../../models/serviceProviderList')
const { encryptData, decryptData } = require('../../utils/encryptionAlgorithms')
const accountsModel = require('../../models/accountsModel')
const integrationsExceptionsModel = require("../../models/integrationsExceptionsModel");
const integrationsCronsModel = require('../../models/integrationsCronsModel')
const mongoose = require('mongoose')
const cpdWorkOrdersModel = require('../../models/CPDWorkordersModel')
const dfWorkOrdersModel = require('../../models/DFWorkOrdersModel')
const CPDOperations = require('../../middleware/CPDOperations');
const DFOperations = require('../../middleware/DFOperations');
const SNOWOperations = require('../../middleware/SNOWOperations')
const CYSOperations = require('../../middleware/CYSOperations')
const CPDWorkordersModel = require("../../models/CPDWorkordersModel");
const usersModel = require("../../models/usersModel");
const DFWorkOrdersModel = require("../../models/DFWorkOrdersModel");
const serviceProviderIntegrationsModel = require("../../models/serviceProviderIntegrationsModel");
const { dateAsset } = require('../../utils/utilsFunctions');
const { getServiceWorkOrdersAndStatus, getStatusFieldMappings, defaultSatusMappingKeys } = require("../../utils/general");
const { CPDAuthentication, DFAuthentication, SNOWAuthentication, CYSAuthentication } = require('../../utils/serviceProvidersAuthentication');
const SNOWWorkOrdersModel = require("../../models/SNOWWorkOrdersModel");
const { default: axios } = require("axios");
const DFConfigurations = require('../../config/integrationsConfiguration');
const { getAllDFBuldingsData, searchDFBuildingsByStateAndCountry, searchDFBuildingByNameAndStreet } = require("../../middleware/findDFBuildingOperation");
const accountSettingsModel=require('../../models/accountSettingsModel')
/**
 * Get the static images.
 */

exports.getImages = asyncWrapper(async (req, res) => {
  // Constructing the URL based on the request object
  const baseUrl = process.env.DOMAIN_NAME;
  const imageUrls = [
    {
      name: "TT",
      url: 'https://prod-isync-imgs.s3.ap-southeast-1.amazonaws.com/assets/TurboTax_logo.png'
    },
    {
      name: "AM",
      url: 'https://prod-isync-imgs.s3.ap-southeast-1.amazonaws.com/assets/Acumatica_logo.png'
    },
    {
      name: "CPD",
      url: 'https://prod-isync-imgs.s3.ap-southeast-1.amazonaws.com/assets/CorrigoPro_logo.png'
    },
    {
      name: "DF",
      url: 'https://prod-isync-imgs.s3.ap-southeast-1.amazonaws.com/assets/Dataforma_logo.png'
    },
    {
      name: "QB",
      url: 'https://prod-isync-imgs.s3.ap-southeast-1.amazonaws.com/assets/Quickbooks_logo.png'
    },
    {
      name: "SC",
      url: 'https://prod-isync-imgs.s3.ap-southeast-1.amazonaws.com/assets/ServiceChannel_logo.png'
    },
    {
      name: "SNOW",
      url: 'https://prod-isync-imgs.s3.ap-southeast-1.amazonaws.com/assets/servicenow_logo.png'
    },
    {
      name: "MDS",
      url: 'https://prod-isync-imgs.s3.ap-southeast-1.amazonaws.com/assets/MDS_logo2.png'
    },
    {
      name: "QSP",
      url: 'https://prod-isync-imgs.s3.ap-southeast-1.amazonaws.com/assets/Qsp_logo2.png'
    },
    {
      name: "CYS",
      url: 'https://prod-isync-imgs.s3.ap-southeast-1.amazonaws.com/assets/cyrious_log.png'
    },
    {
      name: "NO-INTEGRATION",
      url: 'https://prod-isync-imgs.s3.ap-southeast-1.amazonaws.com/assets/no_integration_screen.png'
    },
    {
      name: "NO-SERVICE-PROVIDER",
      url: 'https://prod-isync-imgs.s3.ap-southeast-1.amazonaws.com/assets/no_service_provider.png'
    },
    {
      name: "INTEGRATION-CONNECTION",
      url: 'https://prod-isync-imgs.s3.ap-southeast-1.amazonaws.com/assets/integration_connection.gif'
    },
    {
      name: "CROSS",
      url: 'https://prod-isync-imgs.s3.ap-southeast-1.amazonaws.com/assets/cross_icon.png'
    },
    {
      name: "CURRENT-FREQUENCY",
      url: 'https://prod-isync-imgs.s3.ap-southeast-1.amazonaws.com/assets/frequency_icon.png'
    },
    {
      name: "AUTO-DATA-SYNC",
      url: 'https://prod-isync-imgs.s3.ap-southeast-1.amazonaws.com/assets/data_sync_icon.png'
    },
    {
      name: "UPDATE-FREQUENCY",
      url: 'https://prod-isync-imgs.s3.ap-southeast-1.amazonaws.com/assets/update_frequency_icon.png'
    },
    {
      name: "DATA-DUMP-RANGE",
      url: 'https://prod-isync-imgs.s3.ap-southeast-1.amazonaws.com/assets/data_range_icon.png'
    },
    {
      name : "Super-Admin-Logo",
      url : 'https://prod-isync-imgs.s3.ap-southeast-1.amazonaws.com/assets/Super_Admin_Logo.png'
    },
    {
      name : "TEST-ACCOUNT-IMAGE",
      url : 'https://prod-isync-imgs.s3.ap-southeast-1.amazonaws.com/assets/QSP_Test.png'
    },
    {
      name : "DEVRABBIT-IMAGE",
      url : 'https://prod-isync-imgs.s3.ap-southeast-1.amazonaws.com/assets/devRabbit_logo.png'
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
 * Get the serviceProvider Credentials to authenticate the dataforma.
 * Get all DataForms buildingDetails from getAllDFBuldingsData.
 * Search the buildings by country and state from searchDFBuildingByNameAndStreet.
 * Search the matched building by CPD SpaceName and Street with the DF buildingName name and street from the getFilteredDFBuildings.
 * @returns matchedDFBuildingData and partialBuildingsMatchedData.
 */
exports.getCPDToDFMatchedBuildingDetails = asyncWrapper(async (req, res) => {
  const { ServiceLocation } = req.body

  // Find list of DF credentails (encrypted) & then decrypt. 
  let serviceProviderCredentials = await integrationsMasterServiceProvidersModel.findOne({ integrationsMasterId: new mongoose.Types.ObjectId('66699103a176298d9f79dfdd'), serviceProvider: "DF" });
  let credentailsObj = { iv: process.env.CRYPTO_IV, encryptedData: serviceProviderCredentials.credentials };
  let decryptConfigCredentials = JSON.parse(await decryptData(credentailsObj, process.env.CRYPTO_KEY))

  const getDFBuildingDetails = await getAllDFBuldingsData(decryptConfigCredentials)
  const serviceLocationCountry = ServiceLocation.Address.Country === "US" ? "USA" : "USA"
  const getFilteredDFBuildings = await searchDFBuildingsByStateAndCountry(serviceLocationCountry, ServiceLocation.Address.State, getDFBuildingDetails)
  const getMatchedDFBuilding = await searchDFBuildingByNameAndStreet(ServiceLocation, getFilteredDFBuildings)

  
  return res
    .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
    .json({
      status: customConstants.messages.MESSAGE_SUCCESS,
      message: "DF Building Details.",
      data: {
        matchedDFBuildingData:getMatchedDFBuilding.matchedDFBuildingData,
        partialBuildingsMatchedData: getMatchedDFBuilding.partialBuildingsMatchedData
      },
    });
})


/**
 * Get global constants.
 * Get default field mapping keys of serivce providers.
 * Get field mapping keys of each service provider.
 * Get service provider list includes logo, service provider type etc.,
 */

exports.getGlobalConstants = asyncWrapper(async (req, res) => {
  // const serviceProvidersIntegrationServices = await serviceProvidersIntegrationWithServicesModel.find({});
  // const serviceProviderServices = await serviceProviderServicesModel.find({});
  // const serviceproviderlists = await serviceProviderListModel.find({});
  const serviceProviderIntegrations = await serviceProviderIntegrationsModel.find({});
  const timeZones = ["GMT", "UTC", "IST", "CST", "PST", "PDT", "CAT", "ECT", "PDT"]

  const cronSchedulePicker = {
    eachSecond: 'each second',
    eachMinute: 'once each minute',
    eachHour: 'once each hour',
    eachDay: 'once each day',
    eachMonth: 'once each month',
    custom: "custom"
  }
  const dataPointsAccess = {
    "source": true,
    "destination": true,
    "activityLog": true,
    "fieldMappings": true,
    "exceptions": true
  }
  const menus = {
        "dashboard": true,
        "integrations": true,
        "fieldsmapping": true,
        "insights": true,
        "exceptions": true,
        "settings": true,
        "createintegrations": true,
        "wolifecycle":true,
        "conditions":true
  }
  return res
    .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
    .json({
      status: customConstants.messages.MESSAGE_SUCCESS,
      message: customConstants.messages.MESSAGE_GLOBAL_CONSTANTS,
      data: {
              timeZones,
              cronSchedulePicker,
              dataPointsAccess, menus,
              serviceProviderIntegrations
        // serviceProvidersIntegrationServices, serviceProviderServices, ,
        // serviceproviderlists, 
      },
    });

});

/** 
 *Middleware to check for Active status for provided Integration Master
 *If passed, it proceeds to decrypt provided encrypted credential
*/

// exports.validationForDecrypt = asyncWrapper(async (req, res, next) => {
//   const { accountId, integrationMasterId, encryptedString } = req.body
//   const integrationMasterDetails = await integrationsMasterModel.findOne({ _id: integrationMasterId, accountId }).lean();
//   console.log('integrationMasterDetails', integrationMasterDetails)
//   if (!integrationMasterDetails) {
//     return res.status(customConstants.statusCodes.ERROR_STATUS_CODE_NOT_FOUND).json({
//       status: customConstants.messages.MESSAGE_FAIL,
//       message: customConstants.messages.MESSAGE_INTEGRATION_NOT_FOUND, // to be changed now
//     });

//   }
//   else {
//     next()
//   }
// })

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
  const integrationsCount = await integrationsMasterModel.find({ accountId: req.user.accountId });

  const respectiveAccount = await accountSettingsModel.findOne({accountId: req.user.accountId});
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
 * Middleware function to Create Integration 
 * Validate integration master exist
 * If passed , middleware passes function call to "Create Integration"
*/

exports.validateintegrationsMasterExistForFieldMapping = asyncWrapper(async (req, res, next) => {
  const { integrationsMasterId } = req.params;
  console.log('integrationMasterId:===', integrationsMasterId)
  const integrationMasterDetails = await integrationsMasterModel.findById(integrationsMasterId)
  if (!integrationMasterDetails) {
    return res.status(customConstants.statusCodes.ERROR_STATUS_CODE_NOT_FOUND).json({
      status: customConstants.messages.MESSAGE_FAIL,
      message: customConstants.messages.MESSAGE_INTEGRATION_DETAILS_NOT_FOUND,
    });
  }
  else if(!integrationMasterDetails.to){
    return res.status(customConstants.statusCodes.ERROR_STATUS_CODE_NOT_FOUND).json({
      status: customConstants.messages.MESSAGE_FAIL,
      message: customConstants.messages.MESSAGE_INTEGRATION_DESTINATION_SERVICEPROVIDER_NOT_FOUND,
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

    if (checkCPDCredentials === 'error' || checkCPDCredentials === undefined) {

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
  if (req.body.serviceProvider === 'SNOW') {
    const checkDFCredentials = await SNOWAuthentication(req.body.credentials.baseUrl, req.body.credentials.username, req.body.credentials.password, req.body.credentials.client_id, req.body.credentials.client_secret, req.body.credentials.grant_type)

    if (checkDFCredentials !== 200) {
      return res.status(customConstants.statusCodes.ERROR_STATUS_CODE_NOT_FOUND).json({
        status: customConstants.messages.MESSAGE_FAIL,
        message: customConstants.messages.MESSAGE_AUTHENTICATION_FAILURE,
      });
    }
  }
  if (req.body.serviceProvider === 'CYS') {
    const checkDFCredentials = await CYSAuthentication(req.body.credentials.baseUrl, req.body.credentials.grant_type, req.body.credentials.cys_auth)

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


  // Create a new service provider
  const serviceProviderDetails = await serviceProvidersModel.create({
    ...req.body,
    credentials: encryptData(req.body.credentials),
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
  let integrationSourceServiceProviderServices
  const integrationDetails = await integrationsMasterModel.findById(integrationsMasterId)
  let integrationDefaultFieldMappings = await serviceProvidersIntegrationWithServicesModel.find({ $and: [{ from: integrationDetails.from }, { to: integrationDetails.to }] })
  if (integrationDefaultFieldMappings.length > 0) {
    for (let fromAndTo of integrationDefaultFieldMappings) {
      let integrationsFieldMappingkeysExist = await integrationsFieldMappingModel.findOne({ integrationsMasterId: integrationsMasterId, serviceMethod: fromAndTo.serviceMethod })
      if (!integrationsFieldMappingkeysExist) {
        let getRequiredKeys = await getStatusFieldMappings(integrationsMasterId)
        const integrationFieldMappingCreate = await integrationsFieldMappingModel.create({
          accountId: integrationDetails.accountId,
          userId: req.user._id,
          integrationsMasterId: integrationsMasterId,
          from: integrationDetails.from,
          to: integrationDetails.to,
          serviceMethod: fromAndTo.serviceMethod,
          serviceName: "work-order",
          createdBy: req.user._id,
          dataPoints: fromAndTo.dataPoints,
          requiredKeys: getRequiredKeys.requiredKeys || {}
        })
      } else {
        // nothing
      }
    }
    // integrationSourceServiceProviderServices = await defaultSatusMappingKeys(integrationDetails.from)
    return res
      .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
      .json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_SERVICE_PROVIDER_CREATED,
        data: {
          integrationDefaultFieldMappings : integrationDefaultFieldMappings,
          // integrationSourceServiceProviderServices
          //  integrationFieldMappingCreate
        },
      });
  }
  else {
    fromFieldMappingkeysDetails = await serviceProviderServicesModel.find({ serviceProvider: integrationDetails.from }).lean();
    toFieldMappingkeysDetails = await serviceProviderServicesModel.find({ serviceProvider: integrationDetails.to }).lean();
    let fieldMappingDefaultKeys = []
    let integrationDefaultFieldMappings = [];
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

    // create work order keys to updaload serviceProvidersIntegrationWithServicesModel.
    let create_work_order_keys_data_to_upload_fieldMappingMasterDefaultServicesModel = {
      from: integrationDetails.from,
      to: integrationDetails.to,
      serviceMethod: keyMapping.serviceMethod,
      dataPointURL: `${keyMapping.dataPointURL}`,
      dataPoints: keyMapping.work_order
    }
    let create_work_order_field_mapping_keys = await serviceProvidersIntegrationWithServicesModel.create(create_work_order_keys_data_to_upload_fieldMappingMasterDefaultServicesModel);

    // Update work order keys to updaload serviceProvidersIntegrationWithServicesModel.
    let update_work_order_keys_data_to_upload_fieldMappingMasterDefaultServicesModel = {
      from: integrationDetails.from,
      to: integrationDetails.to,
      serviceMethod: keyMapping.updateServiceMethod,
      dataPointURL: `${keyMapping.updateDataPointURL}`,
      dataPoints: keyMapping.update_work_order_keys
    }
    let update_work_order_field_mapping_keys = await serviceProvidersIntegrationWithServicesModel.create(update_work_order_keys_data_to_upload_fieldMappingMasterDefaultServicesModel);

    integrationDefaultFieldMappings.push({ ...create_work_order_field_mapping_keys._doc }, { ...update_work_order_field_mapping_keys._doc })

    return res
      .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
      .json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_SERVICE_PROVIDER_CREATED,
        data: { integrationDefaultFieldMappings }
      });
  }
});


/*
Function to create third step of initiating new integration process
Mandatory->Desired Field mappings between two service providers 
Returns committed Field mappings for either Work order or Invoices 
*/
exports.updateIntegrationMasterFieldMappings = asyncWrapper(async (req, res) => {
  // console.log(req.body, "checkkkk");

  const { integrationsMasterId, userId, serviceMethod, serviceName, dataPoints, } = req.body;
  const pastIntegrationDetails = await integrationsMasterModel.findOne({
    integrationsMasterId,
  });

  let updatedIntegrationsDetails;

  // Create or update the integrationsFieldMapping
  let integrationsFieldMapping;
  const existingFieldMapping = await integrationsFieldMappingModel.findOne({
    integrationsMasterId, serviceMethod, serviceName
  });

  let CPDtoDFIntegrationExist = await integrationsMasterModel.findOne({ integrationsMasterId: integrationsMasterId, from: "CPD", to: "DF" }).lean()
  let requiredKeys = {}
  if (CPDtoDFIntegrationExist) {
    requiredKeys = {
      numberAlt: "WorkOrderNumber",
      budgetedProposedStatus: "NONE",
      buildingId: 1715,
      invoiceToCustomerId: 2238,
      invoiceType: "EXTERNAL_CHARGE",
      reportedById: 5515,
      workDescription: "DevRabbit Testing WorkOrders (Ignore)."
    }
  }

  if (existingFieldMapping) {
    integrationsFieldMapping =
      await integrationsFieldMappingModel.findOneAndUpdate(
        { integrationsMasterId, serviceMethod, serviceName },
        { $set: { ...req.body, updatedBy: req.user._id } },
        { new: true }
      );
    updatedIntegrationsDetails = await integrationsMasterModel.findByIdAndUpdate(integrationsMasterId,{stepCount: pastIntegrationDetails.stepCount + 1},{new : true})
  } else {
    const verifyFieldmappingHasOneRecord = await integrationsFieldMappingModel.findOne({ integrationsMasterId: integrationsMasterId })
    if (!verifyFieldmappingHasOneRecord) {
      updatedIntegrationsDetails = await integrationsMasterModel.findByIdAndUpdate(
        integrationsMasterId,
        {
          stepCount: pastIntegrationDetails.stepCount + 1,
          updatedBy: req.user._id,
        },
        { new: true }
      );
    }
    integrationsFieldMapping = await integrationsFieldMappingModel.create({
      ...req.body,
      requiredKeys: requiredKeys,
      createdBy: req.user._id,
      updatedBy: req.user._id,
      userId: req.user._id,
      accountId: req.user.accountId
    });
    updatedIntegrationsDetails = await integrationsMasterModel.findById(integrationsMasterId)
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
  const existingintegrationsSettings = await integrationsSettingsModel.findOne({ integrationsMasterId });
  let statusFieldMappingKeys=await getStatusFieldMappings(integrationsMasterId)
  if (existingintegrationsSettings) {
    integrationsSettings = await integrationsSettingsModel.findOneAndUpdate(
      { integrationsMasterId },
      {
        $set: {
          ...req.body, updatedBy: req.user._id,
          statusFieldMappingKeys: statusFieldMappingKeys.statusFieldMappingKeys
        }
      },
      { new: true }
    );
    updatedIntegrationsDetails = await integrationsMasterModel.findById(integrationsMasterId)
  } else {
    integrationsSettings = await integrationsSettingsModel.create({
      ...req.body,
      createdBy: req.user._id,
      userId: req.user._id,
      accountId: req.user.accountId,
      statusFieldMappingKeys: statusFieldMappingKeys.statusFieldMappingKeys
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
    await integrationsMasterModel.findOneAndUpdate({ _id: integrationsMasterId, stepCount: 5 }, { status: "active" }, { new: true })
  }
  console.log("updatedIntegrationsDetails", updatedIntegrationsDetails)
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

exports.validateIntegrationsMaster = asyncWrapper(async (req, res, next) => {

  const integrationMasterId = req.params.integrationsMasterId;
  const integrationMasterDetails = await integrationsMasterModel.findById(integrationMasterId)
  if (!integrationMasterDetails) {
    return res.status(customConstants.statusCodes.ERROR_STATUS_CODE_NOT_FOUND).json({
      status: customConstants.messages.MESSAGE_FAIL,
      message: customConstants.messages.MESSAGE_INTEGRATION_NOT_FOUND,
    });
  }
  else if (integrationMasterDetails.status === 'deleted' || integrationMasterDetails.status === 'blocked') {
    return res.status(customConstants.statusCodes.ERROR_STATUS_CODE_NOT_FOUND).json({
      status: customConstants.messages.MESSAGE_FAIL,
      message: customConstants.messages.MESSAGE_INTEGRATION_MASTER_MIDDLEWARE,
    });
  }
  else {
    next()
  }
})

/**
 * Validate integration master exist for edit fieldMappings and settings.
 * validate integration master status. 
*/

exports.validateIntegrationsMasterForEdit = asyncWrapper(async (req, res, next) => {

  const integrationMasterId = req.params.integrationsMasterId || req.body.integrationsMasterId;
  const integrationMasterDetails = await integrationsMasterModel.findById(integrationMasterId)
  if (!integrationMasterDetails) {
    return res.status(customConstants.statusCodes.ERROR_STATUS_CODE_NOT_FOUND).json({
      status: customConstants.messages.MESSAGE_FAIL,
      message: customConstants.messages.MESSAGE_INTEGRATION_NOT_FOUND,
    });
  }
  else if(!integrationMasterDetails.from || !integrationMasterDetails.to){
    return res.status(customConstants.statusCodes.ERROR_STATUS_CODE_NOT_FOUND).json({
      status: customConstants.messages.MESSAGE_FAIL,
      message: customConstants.messages.MESSAGE_INTEGRATION_DESTINATION_SERVICEPROVIDER_NOT_FOUND,
    });
  }
  else if (integrationMasterDetails.status === 'deleted' || integrationMasterDetails.status === 'blocked') {
    return res.status(customConstants.statusCodes.ERROR_STATUS_CODE_NOT_FOUND).json({
      status: customConstants.messages.MESSAGE_FAIL,
      message: customConstants.messages.MESSAGE_INTEGRATION_MASTER_MIDDLEWARE,
    });
  }
  else {
    next()
  }
})


/**
 * Validate integration master exist. 
*/

exports.validateIntegrationsMasterExistForSingleIntegration = asyncWrapper(async (req, res, next) => {

  const integrationMasterId = req.params.integrationsMasterId;
  let integrationMasterDetails = await integrationsMasterModel.findById(integrationMasterId).lean()
  const settingsDetails = await integrationsSettingsModel.find({ integrationsMasterId: integrationMasterId }).lean();
  const integrationMasterFieldMappingDetails = await integrationsFieldMappingModel.find({ integrationsMasterId: integrationMasterId }).lean();
  const integrationMasterServiceProviders = await integrationsMasterServiceProvidersModel.find({ integrationsMasterId:integrationMasterId });
  integrationMasterDetails.services = (await serviceProviderIntegrationsModel.findOne(
    { from: integrationMasterDetails.from, to: integrationMasterDetails.to },
    { services: 1 }
  ))?.services || [];
  if (!integrationMasterDetails) {
    return res.status(customConstants.statusCodes.ERROR_STATUS_CODE_NOT_FOUND).json({
      status: customConstants.messages.MESSAGE_FAIL,
      message: customConstants.messages.MESSAGE_INTEGRATION_MASTER_MIDDLEWARE,
    });
  }
  if (integrationMasterDetails.status === "new") {
    return res.status(customConstants.statusCodes.PARTIAL_CONTENT).json({
      status: customConstants.messages.MESSAGE_SUCCESS,
      message: customConstants.messages.MESSAGE_INTEGRATION_INCOMPLETE,
      data:{
        integrationDetails:integrationMasterDetails,
        integrationsSettingsDetails: settingsDetails,
        integrationMasterFieldMappingDetails: integrationMasterFieldMappingDetails,
        integrationMasterServiceProviders,
      }
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
  // let integrationDetails = {}
  let integrationDetails = await integrationsMasterModel.findById(integrationsMasterId).lean();

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

    let fromDate = new Date(week.fromDate);
    let toDate = new Date(week.toDate);

    let presentWeekIntegrationExceptions = await integrationsExceptionsModel.find({ integrationsMasterId, createdAt: { $gte: new Date(fromDate), $lte: new Date(toDate) } });
    let presentWeekIntegrationActivityLog = await integrationsCronsModel.find({ integrationsMasterId, createdAt: { $gte: new Date(fromDate), $lte: new Date(toDate) } });

    week.integrationsExceptionsCount = presentWeekIntegrationExceptions.length > 0 ? presentWeekIntegrationExceptions.length : 0;
    week.integrationsActivityLogCount = presentWeekIntegrationActivityLog.length > 0 ? presentWeekIntegrationActivityLog.length : 0;

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

  let getIntegrationLogos = await serviceProviderListModel.aggregate([
    {
      $facet: {
        integrationFromLogo: [
          { $match: { serviceProviders: integrationDetails.from } },
          { $project: { _id: 0, logo: 1 } },
          { $limit: 1 }
        ],
        integrationToLogo: [
          { $match: { serviceProviders: integrationDetails.to } },
          { $project: { _id: 0, logo: 1 } },
          { $limit: 1 }
        ]
      }
    },
    {
      $project: {
        integrationFromLogo: { $arrayElemAt: ["$integrationFromLogo.logo", 0] },
        integrationToLogo: { $arrayElemAt: ["$integrationToLogo.logo", 0] }
      }
    }
  ]);

  let integrationLogos = {
    integrationFromLogo: getIntegrationLogos[0].integrationFromLogo,
    integrationToLogo: getIntegrationLogos[0].integrationToLogo
  };

  //Properly parses the above resulted data
  // for (let jsonParse of destinationWorkOrdersAndStatus.destinationWorkOrders) {
  //   jsonParse.DFWorkOrders = jsonParse.DFWorkOrders

  // }
  for (let week of presentWeekData) {
    delete week.fromDate;
    delete week.toDate;

  }
  
  integrationDetails.services = (await serviceProviderIntegrationsModel.findOne(
    { from: integrationDetails.from, to: integrationDetails.to },
    { services: 1 }
  ))?.services || [];
  return res
    .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
    .json({
      status: customConstants.messages.MESSAGE_SUCCESS,
      message: customConstants.messages.MESSAGE_GET_INTEGRATIONS,
      data: {
        integrationLogos,
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

  const { integrationsMasterId } = req.params
  const { serviceProviderId } = req.body;
  const integrationServiceProvider = await serviceProvidersModel.findOne({ _id: serviceProviderId });
  if (!integrationServiceProvider) {
    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_NO_CONTENT).json({
      status: customConstants.messages.MESSAGE_FAIL,
      message: customConstants.messages.MESSAGE_INTEGRATION_SERVICE_PROVIDER_DETAILS_NOT_FOUND,
    });
  }

  let encryptedString = await encryptData(req.body.credentials)

  const updatedServicerProvider = await integrationsMasterServiceProvidersModel.findOneAndUpdate({ _id: serviceProviderId }, {
    $set: {
      serviceProvider: req.body.serviceProvider,
      credentials: encryptedString,
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
  const { fieldMappingId, dataPoints, serviceMethod, from, to } = req.body;
  const integrationFieldMapping = await integrationsFieldMappingModel.findById(fieldMappingId);

  if (!integrationFieldMapping) {
    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_NO_CONTENT).json({
      status: customConstants.messages.MESSAGE_FAIL,
      message: customConstants.messages.MESSAGE_INTEGRATION_SERVICE_PROVIDER_DETAILS_NOT_FOUND,
    });
  }

  let updatedFieldMapping = await integrationsFieldMappingModel.findByIdAndUpdate(fieldMappingId, { $set: { dataPoints: dataPoints,from:from, to:to, serviceMethod:serviceMethod  } }, { new: true });
  await integrationsMasterModel.findByIdAndUpdate(
    { _id: req.params.integrationsMasterId, stepCount: { $lt: 5 } },
    [
      {
        $set: {
          stepCount: { $add: ["$stepCount", 1] },
          status: {
            $cond: {
              if: { $eq: [{ $add: ["$stepCount", 1] }, 5] }, // Check if stepcount becomes 5
              then: "active",
              else: "$status", // Keep current status if stepcount is not 5
            },
          },
        },
      },
    ],
    { new: true }
  );
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
  const { integrationsMasterId } = req.params;
  const integrationsMasterDetails = await integrationsMasterModel.findOne({ _id: integrationsMasterId, status: "active" });

  if (integrationsMasterDetails) {
      let fromCredentials, toCredentials;

      switch (integrationsMasterDetails.from) {
        case 'CPD':
          fromCredentials = await integrationsMasterServiceProvidersModel.findOne({ integrationsMasterId: integrationsMasterDetails.integrationsMasterId, serviceProvider: "CPD" }).lean();
          await CPDOperations.getCPDWorkOrders(fromCredentials, "manual");

          if (integrationsMasterDetails.to === 'DF') {
            toCredentials = await integrationsFieldMappingModel.find({ integrationsMasterId: integrationsMasterDetails.integrationsMasterId, to: "DF" }).lean();
            await DFOperations.DFCreateWorkorders(toCredentials, "manual");
          } else if (integrationsMasterDetails.to === 'CYS') { 
            toCredentials = await integrationsFieldMappingModel.find({ integrationsMasterId: integrationsMasterDetails.integrationsMasterId, to: "CYS" }).lean();
            // console.log('CYS Credentials:', toCredentials);
            // console.log('integrationsMasterDetails:===', integrationsMasterDetails)
            await CYSOperations.CYSCreateWorkorders(toCredentials, "manual");
          } else if (integrationsMasterDetails.to === 'SNOW') {
          
            toCredentials = await integrationsFieldMappingModel.find({ integrationsMasterId: integrationsMasterDetails.integrationsMasterId, to: "SNOW" }).lean();
         
             await SNOWOperations.SNOWCreateIncidents(toCredentials, "manual");
          }
          break;

        case 'SNOW':
          fromCredentials = await integrationsMasterServiceProvidersModel.findOne({ integrationsMasterId: integrationsMasterDetails.integrationsMasterId, serviceProvider: "SNOW" }).lean();
          await SNOWOperations.getSNOWWorkOrders(fromCredentials, "manual");

          if (integrationsMasterDetails.to === 'CPD') {
            toCredentials = await integrationsFieldMappingModel.find({ integrationsMasterId: integrationsMasterDetails.integrationsMasterId, to: "CPD" }).lean();

          }
          break;

        case 'DF':
          fromCredentials = await integrationsMasterServiceProvidersModel.findOne({ integrationsMasterId: integrationsMasterDetails.integrationsMasterId, serviceProvider: "DF" }).lean();
          // integrationCredentials.push(fromCredentials); // Uncomment if needed
          break;

        default:
          console.log('No matching integrationsMasterDetails type found.');
      }

    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
      status: customConstants.messages.MESSAGE_SUCCESS,
      message: customConstants.messages.MESSAGE_CRON_MANUAL,
    });
  } else {
    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
      status: customConstants.messages.MESSAGE_SUCCESS,
      message: customConstants.messages.MESSAGE_INTEGRATION_VALIDATE_STATUS
    });
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


/*
* Verify the status of integration and account.
* If status is active pass the middleware.
*/
exports.validateIntegrationStatus = asyncWrapper(async (req, res, next) => {
  const { integrationsMasterId } = req.params
  const verifyAccountStatus = await integrationsMasterModel.findById(integrationsMasterId).populate('accountId')
  console.log('verifyAccountStatus')
  if (verifyAccountStatus.accountId.status === 'deleted') {
    return res.status(customConstants.statusCodes.UNAUTHORIZED).json({
      status: customConstants.messages.MESSAGE_FAIL,
      message: customConstants.messages.MESSAGE_ACCOUNT_ALREADY_DELETED,
    });
  }
  if (verifyAccountStatus.status !== 'active') {
    return res.status(customConstants.statusCodes.UNAUTHORIZED).json({
      status: customConstants.messages.MESSAGE_FAIL,
      message: customConstants.messages.MESSAGE_INTEGRATION_VALIDATE_STATUS,
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
  const integrationExceptions = await integrationsExceptionsModel.find({ accountId: req.params.accountId }).populate('integrationsMasterId').sort({ _id: -1 })


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

  const account = await accountsModel.findOne({ _id: req.params.accountId });
  const integrationMasterDetails = await integrationsMasterModel.findById(req.query.integrationsMasterId)

  if (account.status !== 'active' || !account) {
    return res.status(customConstants.statusCodes.ERROR_STATUS_CODE_NOT_FOUND).json({
      status: customConstants.messages.MESSAGE_FAIL,
      message: customConstants.messages.MESSAGE_ACCOUNT_MIDDLEWARE,
    });
  }
  if (!integrationMasterDetails) {
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
  const integrationsMasterId = req.query.integrationsMasterId;
  const { serviceMethod, serviceName } = req.query;
  const integrationFieldMappingsService = await integrationsFieldMappingModel.findOne({ integrationsMasterId: integrationsMasterId, serviceMethod: serviceMethod, serviceName: serviceName })

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
 *  * After passing through middleware "validateIntegrationSettingsDetails" , function call is passed to this function to update status for Auto-data sync of Integration
 * Function to update status in respective Integration-Settings record which represents status for Auto-data sync
 * @params "integrationSettingsId"
 * On Success, returns updated record
 */

exports.updateAutoDataSync = asyncWrapper(async (req, res) => {
  const integrationSettingsId = req.params.integrationSettingsId;
  const updateSync = await integrationsSettingsModel.findByIdAndUpdate(integrationSettingsId, { $set: { currentStatus: req.body.currentStatus, updatedBy: req.user._id } }, { new: true });

  return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).
    json({
      status: customConstants.messages.MESSAGE_SUCCESS,
      message: req.body.currentStatus === 'start' ? customConstants.messages.MESSAGE_SETTINGS_AUTO_DATA_SYNC_STARTED : req.body.currentStatus === 'stop' ? customConstants.messages.MESSAGE_SETTINGS_AUTO_DATA_SYNC_STOPPED : "",
      data: { updateSync }
    })
})

/**
 * After passing through middleware "validateIntegrationSettingsDetails" , function call is passed to this function to update Frequency of Integration
 * Function to update respective Integration settings record's field named : "periodSettings" , which represents Frequency
 * @params "integrationSettingsId"
 * On Success, returns updated record
 */
exports.updateIntegrationSettingsFrequency = asyncWrapper(async (req, res) => {
  const integrationSettingsId = req.params.integrationSettingsId;
  const updatePeriodSetings = await integrationsSettingsModel.findByIdAndUpdate(integrationSettingsId, { $set: { periodSettings: req.body.periodSettings, periodType: req.body.periodType, updatedBy: req.user._id } }, { new: true });

  return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).
    json({
      status: customConstants.messages.MESSAGE_SUCCESS,
      message: customConstants.messages.MESSAGE_SETTINGS_FREQUENCY_UPDATED,
      data: { updatePeriodSetings }
    })
})

/**
 * After passing through middleware "validateIntegrationSettingsDetails" , function call is passed to this function to update status field mapping keys of Integration
 * Function to update respective Integration settings record's field named : "statusFieldMappingKeys"
 * @params "integrationSettingsId"
 * On Success, returns updated record
 */
exports.updateStatusFieldMappings = asyncWrapper(async (req, res) => {
  const integrationSettingsId = req.params.integrationSettingsId;
  const updateStatusFieldMappings = await integrationsSettingsModel.findByIdAndUpdate(integrationSettingsId, { $set: { statusFieldMappingKeys: req.body.statusFieldMappingKeys, updatedBy: req.user._id } }, { new: true });

  return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).
    json({
      status: customConstants.messages.MESSAGE_SUCCESS,
      message: customConstants.messages.MESSAGE_SETTINGS_STATUS_FIELD_MAPPINGS_UPDATED,
      data: { updateStatusFieldMappings }
    })
})

/**
 * After passing through middleware "", function call is passed to this function to update status of Integration master  (active <-> offline)
 * @params "integrationMasterId" 
 * On success, returns the updated record 
 */
exports.updateIntegrationMasterStatus = asyncWrapper(async (req, res) => {
  const integrationMasterId = req.params.integrationsMasterId;
  const updateStatus = await integrationsMasterModel.findByIdAndUpdate(integrationMasterId, { $set: { status: req.body.status, updatedBy: req.user._id } }, { new: true });
  return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).
    json({
      status: customConstants.messages.MESSAGE_SUCCESS,
      message: customConstants.messages.MESSAGE_INTEGRATION_MASTER_STATUS_UPDATED,
      data: { updateStatus }
    })
})

/**  
 * Middleware function to check the status of Integration master and Account record of respective "Integration Settings" record 
 * @params "integrationSettingsId"
 */
exports.validateIntegrationSettingsDetails = asyncWrapper(async (req, res, next) => {
  const integrationSettingsDetails = await integrationsSettingsModel.findOne({ _id: req.params.integrationSettingsId }).populate('accountId integrationsMasterId');

  if (!integrationSettingsDetails || integrationSettingsDetails.integrationsMasterId.status === 'deleted' || integrationSettingsDetails.integrationsMasterId.status === 'blocked') {
    return res.status(customConstants.statusCodes.ERROR_STATUS_CODE_NOT_FOUND).json({
      status: customConstants.messages.MESSAGE_FAIL,
      message: customConstants.messages.MESSAGE_INTEGRATION_MASTER_MIDDLEWARE,
    });
  }

  if (!integrationSettingsDetails || integrationSettingsDetails.accountId.status !== 'active') {
    return res.status(customConstants.statusCodes.ERROR_STATUS_CODE_NOT_FOUND).json({
      status: customConstants.messages.MESSAGE_FAIL,
      message: customConstants.messages.MESSAGE_ACCOUNT_MIDDLEWARE,
    });
  }
  next()
})

/**
 * Function to return all Service-provider lists 
 
 */

exports.getServiceProviderLists = asyncWrapper(async (req, res) => {
  const serviceProviderLists = await serviceProviderListModel.find({ status: 'active' })
  return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
    status: customConstants.messages.MESSAGE_SUCCESS,
    message: customConstants.messages.MESSAGES_GET_SERVICE_PROVIDERS,
    data: {
      serviceProviderLists
    }
  });

});

/**
 * Function to update date range.
 */

exports.updateDateRange = asyncWrapper(async (req,res) => {
  const {integrationSettingsId} = req.params
  await integrationsSettingsModel.findByIdAndUpdate(integrationSettingsId,{dataDumpRange:req.body.dataDumpRange},{new : true});
  return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
    status: customConstants.messages.MESSAGE_SUCCESS,
    message: customConstants.messages.MESSAGES_UPDATE_DATE_RANGE,
  });

})