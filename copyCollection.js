require("dotenv").config();
const { default: axios } = require("axios");
const mongooseConnect = require("./config/dbConnection");
const { default: mongoose } = require("mongoose");

exports.GSMS = async (collectionName, requestObj) =>  {

    try {
        await mongooseConnect.DbConnect();

        await initializeCollectionIfAbsent(collectionName);
        const collection = mongoose.connection.db.collection(collectionName)
        await collection.insertOne(requestObj)
    }
    catch(error){
        console.log("error@GSMS:==",error)
    }
    
}

async function initializeCollectionIfAbsent(collectionName) {
    try {
        // Access the collection
        const collection = mongoose.connection.db.collection(collectionName);

        // Get the document count
        const checkCollectionCount = await collection.find({}).limit(1).hasNext();

        console.log('HASNEXT CONTAINS', checkCollectionCount);

        if (!checkCollectionCount) {
            createDynamicCollection(collectionName)
        }
    } catch (error) {
        console.error("Error getting collection length:", error);
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

    console.log(`Collection '${targetCollectionName}' created successfully.`);

    // Apply the same indexes to the target collection
    for (const index of indexes) {
        const indexKey = index.key;
        const options = { ...index, key: undefined }; // Remove the key field for options
        await targetCollection.createIndex(indexKey, options);
    }
}

// // Example Usage
// const sourceCollectionName = "dfworkorders";
// const targetCollectionName = "plangridworkorders";
/*
GSMS(targetCollectionName, {
  accountId: new mongoose.Types.ObjectId("667d4177bc77277e43bc1e2f"),
  integrationsCronId: new mongoose.Types.ObjectId("667d468e4d9212bd8e72b988"),
  integrationsMasterId: new mongoose.Types.ObjectId("676140c001979eab3b11c7ad"),
  refId: 1234,
  refWorkOrderStatus: "status",
  responseObject: JSON.stringify({
    firstName: "Dev Rabbit",
    lastName: "Dev Rabbit",
    phone: "7095294217",
  }),
  customFields: JSON.stringify({
    messageId: "1234",
  }),
  status: "completed",
  priority: "high"
});
*/
// module.exports = {GSMS}
