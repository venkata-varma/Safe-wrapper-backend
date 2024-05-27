// const axios = require('axios');
const serviceProvidersModel = require("../models/integrationsMasterServiceProvidersModel");
const integrationsFieldMappingModel = require("../models/integrationsFieldMappingModel");
const integrationsSettingsModel = require("../models/integrationsSettingsModel");
const authentication = require("../utils/authentication");
const asyncWrapper = require("../middleware/asyncWrapper");
const customConstants = require("../config/constants.json");
const sessionsModel = require("../models/sessionsModel");
const integrationsMasterModel = require("../models/integrationsMasterModel");
const integrationsMasterServiceProvidersModel = require("../models/integrationsMasterServiceProvidersModel");




/*
Function to create first step of initiating new integration process
Mandatory-> Title and Description
Returns newly created IntegrationMaster record 
*/
exports.createIntegrationMaster = asyncWrapper(async (req, res) => {
  try {
    console.log("req", req.user)
    const integrationsDetails = await integrationsMasterModel.create({
      ...req.body,
      createdBy: req.user._id,
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
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      status: customConstants.statusCodes.INTERNAL_SERVER_ERROR,
      message: customConstants.messages.MESSAGE_INTERNAL_SERVER_ERROR,
      error: error.message,
    });
  }
});


/*
Function to create second step of a initiating new integration process
Mandatory->Details of service providers
Returns newly created Service provider record (From , To ) 
*/

exports.createIntegrationMasterServiceProviderCredentials = asyncWrapper(async (req, res) => {
  try {
    const { userId, accountId, serviceProvider, integrationsMasterId } =
      req.body;

    // Create a new service provider
    const serviceProviderDetails = await serviceProvidersModel.create({
      ...req.body,
      createdBy: req.user._id,
      userId: req.user._id,
      accountId: req.user.accountId
    });

    // Find the past integration details
    const pastIntegrationDetails = await integrationsMasterModel.findOne({
      integrationsMasterId: req.body.integrationsMasterId,
    });
    console.log(pastIntegrationDetails, "pastIntegrationDetails");

    // Determine the update fields
    const updateFields = {
      stepCount: pastIntegrationDetails.stepCount + 1,
      updatedBy: req.user._id,
    };
    //From , To 's are decided 
    if (pastIntegrationDetails.stepCount === 1) {
      updateFields.from = serviceProvider;
    } else {
      updateFields.to = serviceProvider;
    }

    // Perform the update
    const updatedIntegrationsDetails = await integrationsMasterModel.findOneAndUpdate(
      { integrationsMasterId },
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
  } catch (error) {
    // Handle errors
    console.error("Error:", error);
    return res.status(500).json({
      status: customConstants.statusCodes.INTERNAL_SERVER_ERROR,
      message: customConstants.messages.MESSAGE_INTERNAL_SERVER_ERROR,
      error: error.message,
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
  try {
    const { integrationsMasterId, userId } = req.body;
    const pastIntegrationDetails = await integrationsMasterModel.findOne({
      integrationsMasterId,
    });

    let updatedIntegrationsDetails;
    if (!pastIntegrationDetails) {
      return res.status(404).json({
        status: customConstants.statusCodes.NOT_FOUND,
        message: "Integration details not found.",
      });
    }

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
    } else {
      integrationsFieldMapping = await integrationsFieldMappingModel.create({
        ...req.body,
        createdBy: req.user._id,
        userId: req.user._id,
        accountId: req.user.accountId
      });
      // Perform the update
      updatedIntegrationsDetails = await integrationsMasterModel.findByIdAndUpdate(
        integrationsMasterId,
        {
          $set: {
            stepCount: pastIntegrationDetails.stepCount + 1,
            updatedBy: req.user._id,
          }

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
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      status: customConstants.statusCodes.INTERNAL_SERVER_ERROR,
      message: customConstants.messages.MESSAGE_INTERNAL_SERVER_ERROR,
      error: error.message,
    });
  }
});


/*
Function to create Fourth step of initiating new integration process
Mandatory->Desired Frequency of data integration
Returns committed cron-job frequency model -Days, Month etc;
*/
exports.updateIntegrationMasterSettings = asyncWrapper(async (req, res) => {
  console.log(req.body, "checkkkk");
  try {
    const { integrationsMasterId, userId } = req.body;
    const pastIntegrationDetails = await integrationsMasterModel.findOne({
      integrationsMasterId,
    });

    let updatedIntegrationsDetails;
    if (!pastIntegrationDetails) {
      return res.status(404).json({
        status: customConstants.statusCodes.NOT_FOUND,
        message: "Integration details not found.",
      });
    }

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
    } else {
      integrationsSettings = await integrationsSettingsModel.create({
        ...req.body,
        createdBy: req.user._id,
        userId: req.user._id,
        accountId: req.user.accountId
      });
      // Perform the update
      updatedIntegrationsDetails = await integrationsMasterModel.findOneAndUpdate(
        { integrationsMasterId },
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
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      status: customConstants.statusCodes.INTERNAL_SERVER_ERROR,
      message: customConstants.messages.MESSAGE_INTERNAL_SERVER_ERROR,
      error: error.message,
    });
  }
});


/*
Function to return datails of a specific Integration master table record by "Params"

*/
exports.getSingleIntegrationMasterDetails = asyncWrapper(async (req, res) => {
  const { integrationMasterId } = req.params;
  const integrationDetails = await integrationsMasterModel.findById(integrationMasterId).lean();

  console.log(integrationMasterId, "integrationMasterId");

  const settingsDetails = await integrationsSettingsModel
    .findOne({ integrationsMasterId: integrationMasterId })
    .lean();
  return res
    .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
    .json({
      status: customConstants.messages.MESSAGE_SUCCESS,
      message: customConstants.messages.MESSAGE_GET_INTEGRATIONS,
      data: {
        // totalCorrigoProWorkOrders: CPDWorkOrders.length, totalServiceProvidersWorkOrders: serviceProvidersWorkOrderslength,
        // totalCorrigoProInvoices: CPDInvoices.length, totalServiceProvidersInvoices: serviceprovidersInvoiceslength,
        // totalQuickBooksInvoices: QBInvoices.length,
        // cronjobsCount: cronjobDetails.length,
        integrationDetails,
        // configDetails,
        // cronjobDetails,
        integrationsSettingsDetails: settingsDetails,
        // corrigoWorkOrders: CPDWorkOrders,
        // ServiceProvidersWorkOrders: ServiceProvidersWorkOrders,
        // corrigoProInvoices: CPDInvoices,
        // serviceprovidersInvoices: ServiceProvidersInvoices
      },
    });
});

/*
Function to Edit a specific initiated Integration master record
Oppurtunity to edit Title, description etc;
Returns Updated record with new values 
*/
exports.editIntegrationMaster = asyncWrapper(async (req, res) => {

  // Find the past integration details
  const pastIntegrationDetails = await integrationsMasterModel.findOne({
    integrationsMasterId: req.params.integrationMasterId
  });
  if (!pastIntegrationDetails) {
    return res.status(404).json({
      status: customConstants.statusCodes.NOT_FOUND,
      message: customConstants.statusCodes.MESSAGE_INTEGRATION_DETAILS_NOT_FOUND,
    });
  }
  const updatedIntegrationMaster = await integrationsMasterModel.findByIdAndUpdate(req.params.integrationMasterId, { $set: { ...req.body, updatedBy: req.user.userId } }, { new: true })
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

  const pastIntegrationDetails = await integrationsMasterModel.findOne({
    integrationsMasterId: req.params.integrationMasterId,
  });
  if (!pastIntegrationDetails) {
    return res.status(404).json({
      status: customConstants.statusCodes.NOT_FOUND,
      message: customConstants.messages.MESSAGE_INTEGRATION_DETAILS_NOT_FOUND,
    });
  }
  const { serviceProviderId } = req.body;
  const integrationServiceProvider = await serviceProvidersModel.findOne({ _id: serviceProviderId });
  if (!integrationServiceProvider) {
    return res.status(404).json({
      status: customConstants.statusCodes.NOT_FOUND,
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

  const pastIntegrationDetails = await integrationsMasterModel.findById(req.params.integrationMasterId)

  if (!pastIntegrationDetails) {
    return res.status(404).json({
      status: customConstants.statusCodes.NOT_FOUND,
      message: "Integration details not found.",
    });
  }
  const { fieldMappingId } = req.body;
  const integrationFieldMapping = await integrationsFieldMappingModel.findById(fieldMappingId);
  if (!integrationFieldMapping) {
    return res.status(404).json({
      status: customConstants.statusCodes.NOT_FOUND,
      message: customConstants.messages.MESSAGE_INTEGRATION_DETAILS_NOT_FOUND,
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
  const pastIntegrationDetails = await integrationsMasterModel.findById(req.params.integrationMasterId)
  if (!pastIntegrationDetails) {
    return res.status(404).json({
      status: customConstants.statusCodes.NOT_FOUND,
      message: "Integration details not found.",
    });
  }
  const { integrationSettingsId } = req.body;
  const integrationMasterSettings = await integrationsSettingsModel.findById(integrationSettingsId);
  if (!integrationMasterSettings) {
    return res.status(404).json({
      status: customConstants.statusCodes.NOT_FOUND,
      message: customConstants.messages.MESSAGE_INTEGRATION_DETAILS_NOT_FOUND,
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
  console.log("req.body.integrationMasterId", req.body.integrationMasterId)
  const integrationMaster = await integrationsMasterModel.findByIdAndUpdate(req.params.integrationMasterId, { $set: { status: 'deleted' } }, { new: true });
  return res
    .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
    .json({
      status: customConstants.messages.MESSAGE_SUCCESS,
      message: customConstants.messages.MESSAGE_INTEGRATION_DELETED,
      data: { integrationMaster }
    });

})