// const axios = require('axios');
const integrationsModel = require("../models/integrationsMasterModel");
const serviceProvidersModel = require("../models/integrationsMasterServiceProvidersModel");
const integrationsFieldMappingModel = require("../models/integrationsFieldMappingModel");
const integrationsSettingsModel = require("../models/integrationsSettingsModel");
const authentication = require("../utils/authentication");
const asyncWrapper = require("../middleware/asyncWrapper");
const customConstants = require("../config/constants.json");
const sessionsModel = require("../models/sessionsModel");
const integrationsMasterModel = require("../models/integrationsMasterModel");


exports.globalConstants = asyncWrapper(async(req,res)=>{
  hotkeys = [
    {
      serviceProvider:"CPD",
      type:"work-order",
      keys:[
        'WorkOrderNumber', 'WorkOrderId',
        'BranchId', 'Type',
        'WorkType', 'WorkType.Category',
        'WorkType.Id', 'WorkType.Name',
        'WorkType.IsVisit', 'Sla',
        'Sla.DueDate', 'Sla.OnSiteBy',
        'Sla.AcknowledgeBy', 'Sla.PriorityId',
        'Sla.PriorityName', 'Sla.IsEmergency',
        'Status', 'Customer',
        'Customer.Id', 'Customer.Name',
        'LastUpdate', 'Created'
      ]
    },
    {
      serviceProvider:"CPD",
      type:"invoice",
      keys:[
        'TotalAmount',
        'Nte',
        'IsPrebilled',
        'IsValid',
        'CustomerComment',
        'Currency',
        'LastUpdateDate',
        'SubmissionDeadline',
        'CheckNumber',
        'PaymentAmount',
        'PaymentDate',
        'HasAttachments',
        'ConcurrencyId',
        'TaxIdPrimary',
        'TaxIdSecondary',
        'InvoiceNumber',
        'InvoiceDate',
        'ServiceDate',
        'DiscountAmount',
        'LineItems',
        'LineItems.Id',
        'LineItems.Category',
        'LineItems.PriceListItemId',
        'LineItems.RequestorServiceId',
        'LineItems.PriceListItemName',
        'LineItems.Description',
        'LineItems.Quantity',
        'LineItems.Rate',
        'LineItems.Subtotal',
        'LineItems.IsRateReadOnly',
        'LineItems.TaxCode',
        'status'
    ]
    },
    {
      serviceProvider:"DF",
      type:"work-order",
      keys:[
        'assignedTo',
        'budgetAmount',
        'budgetDate',
        'budgetNotes',
        'budgetedProposedContactId',
        'budgetedProposedDateTime',
        'budgetedProposedStatus',
        'buildingId',
        'contractAmount',
        'contractDate',
        'contractNotes',
        'customId',
        'customerPurchaseOrderId',
        'departmentId',
        'divisionId',
        'doNotExceed',
        'estimatorId',
        'foremanId',
        'invoiceToCustomerId',
        'invoiceToText',
        'invoiceType',
        'locationId',
        'notes',
        'numberAlt',
        'numberClient',
        'questionsToId',
        'reportToAltId',
        'reportToId',
        'reportedById',
        'runningNotes',
        'salesmanagerId',
        'salespersonId',
        'sourceListId',
        'status',
        'statusDate',
        'subsourceListId',
        'subtypeListId',
        'typeListId',
        'workDescription'
      ]
    },
    {
      serviceProvider:"DF",
      type:"invoice",
      keys:[
        'altNum',
        'arAccountId',
        'balanceDue',
        'chargeGross',
        'chargeLabor',
        'chargeMaterial',
        'chargeOther',
        'chargeSubtotal',
        'chargeTax',
        'chargeTotal',
        'classificationListId',
        'customerPoId',
        'dateCreated',
        'dateDue',
        'dateInvoiced',
        'dateSent',
        'fromDivisionId',
        'fromText',
        'howSentListId',
        'id',
        'invoiceCharges',
        'invoiceTaxes',
        'notes',
        'overrideWithholdingAmount',
        'paymentStatus',
        'paymentStatusDate',
        'postingDate',
        'prjWoRoot',
        'prjWoRootId',
        'remitPaymentToText',
        'retention',
        'retentionAccountId',
        'retentionPercent',
        'salesManagerId',
        'salesPersonId',
        'subtotalSplits',
        'terms',
        'thirdPartyFee',
        'toCustomerId',
        'toText',
        'whoCreated',
        'whoSent',
        'withholdingAmount',
        'withholdingPercent',
        'workDescription'
    ]    
    }
  ]
});

exports.createIntegrationMaster = asyncWrapper(async (req, res) => {
  try {
    const integrationsDetails = await integrationsModel.create(req.body);

    return res
      .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
      .json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_INTEGRATIONS,
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

exports.createIntegrationMasterServiceProviderCredentials = asyncWrapper(async (req, res) => {
  try {
    const { userId, accountId, serviceProvider, integrationsMasterId } =
      req.body;

    // Create a new service provider
    const serviceProviderDetails = await serviceProvidersModel.create(req.body);

    // Find the past integration details
    const pastIntegrationDetails = await integrationsModel.findOne({
      integrationsMasterId: req.body.integrationsMasterId,
    });
    console.log(pastIntegrationDetails, "pastIntegrationDetails");

    // Determine the update fields
    const updateFields = {
      stepCount: pastIntegrationDetails.stepCount + 1,
      updatedBy: userId,
    };

    if (pastIntegrationDetails.stepCount === 1) {
      updateFields.from = serviceProvider;
    } else {
      updateFields.to = serviceProvider;
    }

    // Perform the update
    const updatedIntegrationsDetails = await integrationsModel.findOneAndUpdate(
      { integrationsMasterId },
      { ...req.body, ...updateFields },
      { new: true } // Options to return the updated document
    );

    return res
      .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
      .json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_INTEGRATIONS,
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

exports.updateIntegrationMasterFieldMappings = asyncWrapper(async (req, res) => {
  console.log(req.body, "checkkkk");
  try {
    const { integrationsMasterId, userId } = req.body;
    const pastIntegrationDetails = await integrationsModel.findOne({
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
          req.body,
          { new: true }
        );
    } else {
      integrationsFieldMapping = await integrationsFieldMappingModel.create({
        ...req.body,
      });
      // Perform the update
      updatedIntegrationsDetails = await integrationsModel.findOneAndUpdate(
        { integrationsMasterId },
        {
          stepCount: pastIntegrationDetails.stepCount + 1,
          updatedBy: userId,
        },
        { new: true } // Options to return the updated document
      );
    }

    return res
      .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
      .json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_INTEGRATIONS,
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

exports.updateIntegrationMasterSettings = asyncWrapper(async (req, res) => {
  console.log(req.body, "checkkkk");
  try {
    const { integrationsMasterId, userId } = req.body;
    const pastIntegrationDetails = await integrationsModel.findOne({
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
        req.body,
        { new: true }
      );
    } else {
      integrationsSettings = await integrationsSettingsModel.create({
        ...req.body,
      });
      // Perform the update
      updatedIntegrationsDetails = await integrationsModel.findOneAndUpdate(
        { integrationsMasterId },
        {
          stepCount: pastIntegrationDetails.stepCount + 1,
          updatedBy: userId,
        },
        { new: true } // Options to return the updated document
      );
    }

    return res
      .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
      .json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_INTEGRATIONS,
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


exports.getDefaultIntegrationMasterFieldMappingHotKeys = asyncWrapper(async(req,res)=>{
  const {from,to} = req.params
  const hotkeys = [
    {
      serviceProvider: "CPD",
      type: "work-order",
      keys: [
        'WorkOrderNumber', 'WorkOrderId', 'BranchId', 'Type',
        'WorkType', 'WorkType.Category', 'WorkType.Id', 'WorkType.Name',
        'WorkType.IsVisit', 'Sla', 'Sla.DueDate', 'Sla.OnSiteBy',
        'Sla.AcknowledgeBy', 'Sla.PriorityId', 'Sla.PriorityName',
        'Sla.IsEmergency', 'Status', 'Customer', 'Customer.Id',
        'Customer.Name', 'LastUpdate', 'Created'
      ]
    },
    {
      serviceProvider: "CPD",
      type: "invoice",
      keys: [
        'TotalAmount', 'Nte', 'IsPrebilled', 'IsValid',
        'CustomerComment', 'Currency', 'LastUpdateDate',
        'SubmissionDeadline', 'CheckNumber', 'PaymentAmount',
        'PaymentDate', 'HasAttachments', 'ConcurrencyId',
        'TaxIdPrimary', 'TaxIdSecondary', 'InvoiceNumber',
        'InvoiceDate', 'ServiceDate', 'DiscountAmount', 'LineItems',
        'LineItems.Id', 'LineItems.Category', 'LineItems.PriceListItemId',
        'LineItems.RequestorServiceId', 'LineItems.PriceListItemName',
        'LineItems.Description', 'LineItems.Quantity', 'LineItems.Rate',
        'LineItems.Subtotal', 'LineItems.IsRateReadOnly', 'LineItems.TaxCode',
        'status'
      ]
    },
    {
      serviceProvider: "DF",
      type: "work-order",
      keys: [
        'assignedTo', 'budgetAmount', 'budgetDate', 'budgetNotes',
        'budgetedProposedContactId', 'budgetedProposedDateTime',
        'budgetedProposedStatus', 'buildingId', 'contractAmount',
        'contractDate', 'contractNotes', 'customId',
        'customerPurchaseOrderId', 'departmentId', 'divisionId',
        'doNotExceed', 'estimatorId', 'foremanId', 'invoiceToCustomerId',
        'invoiceToText', 'invoiceType', 'locationId', 'notes', 'numberAlt',
        'numberClient', 'questionsToId', 'reportToAltId', 'reportToId',
        'reportedById', 'runningNotes', 'salesmanagerId', 'salespersonId',
        'sourceListId', 'status', 'statusDate', 'subsourceListId',
        'subtypeListId', 'typeListId', 'workDescription'
      ]
    },
    {
      serviceProvider: "DF",
      type: "invoice",
      keys: [
        'altNum', 'arAccountId', 'balanceDue', 'chargeGross',
        'chargeLabor', 'chargeMaterial', 'chargeOther', 'chargeSubtotal',
        'chargeTax', 'chargeTotal', 'classificationListId', 'customerPoId',
        'dateCreated', 'dateDue', 'dateInvoiced', 'dateSent', 'fromDivisionId',
        'fromText', 'howSentListId', 'id', 'invoiceCharges', 'invoiceTaxes',
        'notes', 'overrideWithholdingAmount', 'paymentStatus', 'paymentStatusDate',
        'postingDate', 'prjWoRoot', 'prjWoRootId', 'remitPaymentToText',
        'retention', 'retentionAccountId', 'retentionPercent', 'salesManagerId',
        'salesPersonId', 'subtotalSplits', 'terms', 'thirdPartyFee', 'toCustomerId',
        'toText', 'whoCreated', 'whoSent', 'withholdingAmount', 'withholdingPercent',
        'workDescription'
      ]
    }
  ];
  
  function getKeyMapping(fromProvider, toProvider) {
    const fromKeys = { "work-order": [], "invoice": [] };
    const toKeys = { "work-order": [], "invoice": [] };
  
    hotkeys.forEach(hotkey => {
      if (hotkey.serviceProvider === fromProvider) {
        if (hotkey.type === "work-order") {
          fromKeys["work-order"] = hotkey.keys;
        } else if (hotkey.type === "invoice") {
          fromKeys["invoice"] = hotkey.keys;
        }
      } else if (hotkey.serviceProvider === toProvider) {
        if (hotkey.type === "work-order") {
          toKeys["work-order"] = hotkey.keys;
        } else if (hotkey.type === "invoice") {
          toKeys["invoice"] = hotkey.keys;
        }
      }
    });
  
    const workOrderMapping = fromKeys["work-order"].reduce((acc, key, index) => {
      acc[key] = toKeys["work-order"][index] || null;
      return acc;
    }, {});
  
    const invoiceMapping = fromKeys["invoice"].reduce((acc, key, index) => {
      acc[key] = toKeys["invoice"][index] || null;
      return acc;
    }, {}); 
  
    return {
      "work-order": workOrderMapping,
      "invoice": invoiceMapping,
      toKeys
    };
  }
  
  // Example
  const fromProvider = from;
  const toProvider = to;

  // Mapping should be done for toProvider from fromProvider
  const keyMapping = getKeyMapping(toProvider, fromProvider);
  
  console.log("Work Order Mapping:");
  console.log(keyMapping["work-order"]);
  console.log("\nInvoice Mapping:");
  console.log(keyMapping["invoice"]);
  return res.status(200).json({keyMapping});
})