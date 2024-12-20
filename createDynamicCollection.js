require("dotenv").config();
const { default: axios } = require("axios");
const mongooseConnect = require("./config/dbConnection");
const { default: mongoose } = require("mongoose");

exports.GlobalServiceModelForDynamicCollection = async (collectionName, requestObj) =>  {

  
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




