const mongoose = require('mongoose');

async function copyCollectionStructure(sourceCollectionName, targetCollectionName) {
    try {
        // Connect to MongoDB
        await mongoose.connect('mongodb+srv://svc_cdi_apps_user:rFsEyXa6axKPzdWH@drcdidb-cluster.1tti08w.mongodb.net/dr-integrations-dev?w=majority&readPreference=primary&retryWrites=true&ssl=true');

        console.log("Connected to MongoDB");

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

        console.log(`Indexes copied to '${targetCollectionName}'.`);
    } catch (error) {
        console.error("Error copying collection structure:", error);
    } finally {
        // Disconnect from MongoDB
        await mongoose.disconnect();
    }
}

// Example Usage
const sourceCollectionName = "dfworkorders";
const targetCollectionName = "plangridworkorders";

copyCollectionStructure(sourceCollectionName, targetCollectionName);
