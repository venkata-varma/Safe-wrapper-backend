

/*
require("dotenv").config();
const { default: axios } = require("axios");
const mongooseConnect = require("./config/dbConnection");
const { default: mongoose } = require("mongoose");

const GlobalServiceModelForDynamicCollection = async (collectionName, requestObj) =>  {

  try {
    
    await initializeCollectionIfAbsent(collectionName);
    const collection = mongoose.connection.db.collection(collectionName)
    await collection.insertOne(requestObj)
    

  } catch (error) {
    console.log("Error Occurred at GlobalServiceModelForDynamicCollection::", error);
    
  }
}

async function initializeCollectionIfAbsent(collectionName) {
    
        // Access the collection
        const collection = mongoose.connection.db.collection(collectionName);

        // Get the document count
        const checkCollectionCount = await collection.find({}).limit(1).hasNext();

    
    if (!checkCollectionCount) {
        createDynamicCollection(collectionName)
    }
}

async function createDynamicCollection(targetCollectionName) {
    let sourceCollectionName = 'basesourcerequests'
    // Get the structure of the source collection
    const sourceCollection = mongoose.connection.db.collection(sourceCollectionName);

    // Fetch the schema (indexes) of the source collection
    const indexes = await sourceCollection.indexes();



    // Create the new collection
    const targetCollection = await mongoose.connection.db.createCollection(targetCollectionName);
   
    // Apply the same indexes to the target collection
    for (const index of indexes) {
        const indexKey = index.key;
        const options = { ...index, key: undefined }; // Remove the key field for options
        await targetCollection.createIndex(indexKey, options);
    }
}




module.exports = {GlobalServiceModelForDynamicCollection}

*/


require("dotenv").config();
const mongoose = require("mongoose");
const mongooseConnect = require("./config/dbConnection");
const { baseSourceRequestModelSchema } = require('./models/baseSourceRequestModel');
const workOrderLifeCycleModel = require("./models/workOrderLifeCycleModel");

/**
 * 
 * @param {*} requestObject 
 * @param {*} dynamicModel 
 * Function that takes Model and Request object; checks if record exists; or exists with same status or not; based on that, performs necessary creation / Updation 
 * @returns "String'""
 */
async function validatePayloadWithExistingAndCreateOrUpdate(requestObject, dynamicModel, operationType, updatingDataBaseName, integrationDetails) {
  let isExisting = await mongoose.connection.db.collection(dynamicModel).findOne({ referenceId: requestObject.referenceId, accountId: requestObject.accountId, integrationsMasterId: requestObject.integrationsMasterId });
  if (operationType === "source") {
    if (isExisting && (isExisting.referenceStatus === requestObject.referenceStatus)) {
      console.log('sourceUpdateExistingRecord1:===',)
      return
      'Record already exists and Rreference status is unchanged. No changes made!'
    }
    else if (!isExisting) {
      var createRecord = await mongoose.connection.db.collection(dynamicModel).insertOne(requestObject)
      await creteWOLifeCycle (requestObject.referenceId, requestObject.referenceStatus, integrationDetails.from, integrationDetails.accountId, integrationDetails.integrationsMasterId)
      return
      `Record created into dynamic model successfully`
    } else if (isExisting && (isExisting.referenceStatus !== requestObject.referenceStatus)) {
      // console.log('requestObject:==',requestObject)
      var updateExistingRecord = await mongoose.connection.db.collection(dynamicModel).updateOne({ referenceId: requestObject.referenceId, accountId: requestObject.accountId, integrationsMasterId: requestObject.integrationsMasterId },
        { $set: { referenceStatus: requestObject.referenceStatus, responseObject: requestObject.responseObject, status: "update-request" } }, { new: true, runValidators: true })
      await creteWOLifeCycle (requestObject.referenceId, requestObject.referenceStatus, integrationDetails.from, integrationDetails.accountId, integrationDetails.integrationsMasterId)
      console.log('updateExistingRecord2:===')
      return
      'Record already exists and Rreference status is changed. so, record is updated with latest status'

    }
  }
  else if (operationType === "destination") {
  console.log("dynamicModel:===",dynamicModel)

    if (isExisting && (isExisting.referenceStatus === requestObject.referenceStatus)) {
      console.log('destinationUpdateExistingRecord1:===',)
      return
      'Record already exists and Rreference status is unchanged. No changes made!'
    }
    else if (!isExisting) {
      var createRecord = await mongoose.connection.db.collection(dynamicModel).insertOne(requestObject)
      await creteWOLifeCycle (requestObject.referenceId, requestObject.referenceStatus, integrationDetails.to, integrationDetails.accountId, integrationDetails.integrationsMasterId)
      var updateSourceRecord = await mongoose.connection.db.collection(updatingDataBaseName).updateOne({ referenceId: requestObject.sourceReferenceId, accountId: requestObject.accountId, integrationsMasterId: requestObject.integrationsMasterId }, { $set: { status: "completed" } }, { new: true, runValidators: true })
      return
      `Record created into dynamic model successfully`
    } else if (isExisting && (isExisting.referenceStatus !== requestObject.referenceStatus)) {
      // var updateExistingRecord = await mongoose.connection.db.collection(dynamicModel).findOneAndUpdate({ sourceReferenceId: requestObject.sourceReferenceId, accountId: requestObject.accountId, integrationsMasterId: requestObject.integrationsMasterId },
      //   { referenceStatus: requestObject.referenceStatus, responseObject: requestObject.responseObject, status: "update-request" }, { new: true, runValidators: true })
      var updateExistingRecord = await mongoose.connection.db.collection(dynamicModel).updateOne({ destinationReferenceId: requestObject.referenceId, }, { $set: { referenceStatus: requestObject.referenceStatus, responseObject: requestObject.responseObject, status: "completed", } }, { new: true, runValidators: true });
      await creteWOLifeCycle (requestObject.referenceId, requestObject.referenceStatus, integrationDetails.to, integrationDetails.accountId, integrationDetails.integrationsMasterId)

      var updateSourceRecord = await mongoose.connection.db.collection(dynamicModel).updateOne({ referenceId: requestObject.sourceReferenceId, }, { $set: { status: "completed" } }, { new: true, runValidators: true })
      console.log('updateExistingRecord2:===')
      return
      'Record already exists and Rreference status is changed. so, record is updated with latest status'

    }
  }

}


/**
 * 
 * @param {*} collectionName 
 * @param {*} requestObj 
 * This funtion is Main funtion for all other nested functions in this file . 
 */
exports.GlobalServiceModelForDynamicCollection = async (collectionName, requestObj, operationType, updatingDataBaseName, integrationDetails) => {
  try {

    const dynamicModel = await initializeCollectionIfAbsent(collectionName);

    if (requestObj !== undefined) {
      const validatePayload = await validatePayloadWithExistingAndCreateOrUpdate(requestObj, dynamicModel, operationType, updatingDataBaseName, integrationDetails);
      console.log(validatePayload);
    }
  } catch (error) {

    console.log("Error Occurred at GlobalServiceModelForDynamicCollection::", error);
  }
};

/**
 * 
 * @param {*} collectionName 
 * Function to get Cached list from mongoose.models and then check if collection nane exists or not . 
 * If not exists, calls nested function "createDynamicCollection" to creare Mongoose model dynamically.
 * @returns "CollectionName"
 */
/*
async function initializeCollectionIfAbsent(collectionName) {
  // console.log("mognoose models", mongoose.models)
  const existingModel = mongoose.models[collectionName]; // Check if the model already exists
  if (existingModel) {
    // console.log(`Model ${existingModel} already exists`)
    return existingModel;
  }

  return createDynamicCollection(collectionName); // Create a new model if it doesn't exist
}
*/

async function initializeCollectionIfAbsent(collectionName) {

  if (await mongoose.connection.db.listCollections({ name: collectionName }).hasNext()) {
    console.log(`Collection name ${collectionName} already exists`)
    return collectionName;
  } else {
    return createDynamicCollection(collectionName); // Create a new model if it doesn't exist
  }


}

/**
 * 
 * @param {*} targetCollectionName 
 * Function to create mongoose model dynamically
 * @returns 
 */
async function createDynamicCollection(targetCollectionName) {
  console.log("Creating dynamic collection...");

  // Clone the base schema and add the timestamps option
  const dynamicSchema = baseSourceRequestModelSchema.clone();
  dynamicSchema.set('timestamps', true); // Enable timestamps for `createdAt` and `updatedAt`

  // Create the model using the schema with timestamps
  const DynamicModel = mongoose.model(
    targetCollectionName, // Model name
    dynamicSchema, // Schema with timestamps
    targetCollectionName // Collection name
  );

  // console.log(`Dynamic collection ${targetCollectionName} initialized.`);
  return DynamicModel;
}

const creteWOLifeCycle = async (referenceId, status, serviceProvider, accountId, integrationsMasterId) => {
  // insert work order life cycle.
  await workOrderLifeCycleModel.create({
    workOrderId: referenceId,
    // WorkOrderNumber: work.WorkOrderNumber,
    workOrderStatus: status,
    accountId: accountId,
    integrationsMasterId: integrationsMasterId,
    serviceProvider: serviceProvider,
    date_created: new Date()
  });
}


// // Ensure the database connection is established before calling any functions
// const connectAndRun = async () => {
//   try {
//     await mongooseConnect.DbConnect(); // Wait for the database connection to complete
//     const sampleRequestObject = {
//       accountId:new mongoose.Types.ObjectId('66699187a176298d9f79e09b'),
//       integrationsMasterId:new mongoose.Types.ObjectId('666ab15f1525c0cde795e48b'),
//       referenceStatus: "VOID",
//       responseObject: "responseObject",
//       status: "completed",
//       priority: "high",
//       refId: 18
//     };

//     console.log("sampleRequestObject", sampleRequestObject);
//     await GlobalServiceModelForDynamicCollection("sampleModel", sampleRequestObject); // Now the connection is established
//   } catch (error) {
//     console.log("Error during the execution:", error);
//   }
// };

// // Call the connectAndRun function
// connectAndRun();