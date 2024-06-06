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
      data: { fieldMappingMasterDefaultServices, fieldMappingsMasters, serviceproviderlists, cronSchedulePicker },
    });

});

/** 
 *Middleware to check for Active status for provided Integration Master
 *If passed, it proceeds to decrypt provided encrypted credential
*/

exports.validationForDecrypt = asyncWrapper(async (req, res) => {
  const { accountId, integrationMasterId, encryptedString } = req.body
  const integrationMasterDetails = await integrationsMasterModel.findOne({ _id: integrationMasterId, accountId }).lean();
  if (integrationMasterDetails.status !== 'active') {
    return res.status(customConstants.statusCodes.ERROR_STATUS_CODE_NOT_FOUND).json({
      status: customConstants.messages.MESSAGE_FAIL,
      message: customConstants.messages.MESSAGE_INTEGRATION_ID_NOT_ACTIVE, // to be changed now
    });

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
const decryptedResult=JSON.parse(decryptData(encrypted,process.env.CRYPTO_KEY));
  return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
    status: customConstants.messages.MESSAGE_SUCCESS,
    message: customConstants.messages.MESSAGE_SERVICE_PROVIDERS_LISTS_DETAILS_FOUND, 
    data:{
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
 * Validate integration master exist
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
  if (!integrationMasterDetails || integrationMasterDetails.status === 'deleted') {
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
  const { integrationsMasterId } = req.params;
  const integrationDetails = await integrationsMasterModel.findById(integrationsMasterId).lean();

  console.log(integrationsMasterId, "integrationsMasterId");

  const settingsDetails = await integrationsSettingsModel.find({ integrationsMasterId: integrationsMasterId }).lean();
  const integrationMasterFieldMappingDetails = await integrationsFieldMappingModel.find({ integrationsMasterId: integrationsMasterId }).lean();
  const integrationMasterServiceProviders = await integrationsMasterServiceProvidersModel.find({ integrationsMasterId });
  return res
    .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
    .json({
      status: customConstants.messages.MESSAGE_SUCCESS,
      message: customConstants.messages.MESSAGE_GET_INTEGRATIONS,
      data: {
        integrationDetails,
        integrationsSettingsDetails: settingsDetails,
        integrationMasterFieldMappingDetails: integrationMasterFieldMappingDetails,
        integrationMasterServiceProviders
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

  const { fieldMappingId } = req.body;
  const integrationFieldMapping = await integrationsFieldMappingModel.findById(fieldMappingId);
  if (!integrationFieldMapping) {
    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_NO_CONTENT).json({
      status: customConstants.messages.MESSAGE_FAIL,
      message: customConstants.messages.MESSAGE_INTEGRATION_SERVICE_PROVIDER_DETAILS_NOT_FOUND,
    });
  }
  //save fields
  let updatedFieldMapping = await integrationsFieldMappingModel.findByIdAndUpdate(fieldMappingId, { $set: { ...req.body, updatedBy: req.user.userId } }, { new: true })
  //Later, Token authentication and status =verified or rejected to be done
  return res
    .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
    .json({
      status: customConstants.messages.MESSAGE_SUCCESS,
      message: customConstants.messages.MESSAGE_INTEGRATION_SERVICE_FIELD_MAPPINGS_UPDATED,
      data: { updatedFieldMapping }
    });
})


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

})