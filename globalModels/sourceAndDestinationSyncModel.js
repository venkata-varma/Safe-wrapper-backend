const { response } = require("express");
const axios = require('axios');
const { GlobalServiceModelForDynamicCollection } = require("../createDynamicCollection");
const { addRecordIntoDataBase } = require("./dataBaseOperations");
const { exceptionLogs } = require("../middleware/exceptionOperation");
let sourceWOId = "", sourceWONumber = "", runnigWorkOrderId = "", destinationWONumber = ""
class GlobalHTTPMethods {
    // Generic GET request handler with headers
    static async handleGet(integrationsServiceObject, authToken, dataPointUrl, integrationDetails, settingsData) {
        try {
            let dataMappingPathKey = integrationsServiceObject.dataMappingPath[0]
            let primaryKeyColumn = integrationsServiceObject.primaryKeyColumn[0]
            // const { dataPointUrl, primaryKeyColumn } = serviceObject
            if (!dataPointUrl) {
                throw new Error("URL and data are required.");
            }

            const response = await axios.get(dataPointUrl, {
                // params,
                headers: authToken, // Parse headers if provided
            });
           return response.data
        } catch (error) {

            // console.log('GetError:===',error)
            // console.log('error.response.status:===',error.response.status)
            // console.log('error.response.data:===',error.response.data?.Message)
            // console.log('error.name:===',error.name)
            // console.log('error.config.data:===',error.config.data)
            // console.log('integrationsServiceObject.category:===',integrationsServiceObject)
            await exceptionLogs(integrationDetails, error.response.status, error.response.data?.Message || "Request failed", error.name, error.config.data === undefined ? error.config.url : error.config.data  , integrationsServiceObject?.category, sourceWOId = integrationsServiceObject?.sourceReferenceId || "", sourceWONumber = "", runnigWorkOrderId = integrationsServiceObject?.destinationReferenceId || "", destinationWONumber = "")
            // return error
        }
    }

    // Generic POST request handler with headers
    static async handlePost(integrationsServiceObject, authRequest, requestObject, integrationDetails) {
        try {

            const { dataPointUrl, serviceMethod } = integrationsServiceObject;
            // console.log('integrationsServiceObject:===',integrationsServiceObject)
            if (!dataPointUrl || !requestObject) {
                throw new Error("URL and data are required.");
            }

            const response = await axios.post(dataPointUrl, requestObject, {
                headers: authRequest, // Parse headers if provided
            });
            // console.log("response:===",response.data)
            return response.data
        } catch (error) {
            // console.log("CreateError:===", error)
            console.log("CreateError:===", error)
            // console.log('error.response.status:===',error.response.status)
            // console.log('error.response.data:===',error.response.data?.Message)
            // console.log('error.name:===',error.name)
            // console.log('error.config.data:===',error.config.data)
            // console.log('integrationsServiceObject.category:===',integrationsServiceObject)
            
            await exceptionLogs(integrationDetails, error.response.status, error.response.data?.Message || JSON.stringify(error.response.data), error.name, error.config.data, integrationsServiceObject?.category, sourceWOId = integrationsServiceObject?.sourceReferenceId || "", sourceWONumber = "", runnigWorkOrderId = "", destinationWONumber = "")
            // return error
        }
    }

    // Generic PUT request handler with headers
    static async handlePut(req, res) {
        try {
            const { url, data, headers } = req.body;
            if (!url || !data) {
                return res.status(400).json({ message: "URL and data are required" });
            }

            const response = await axios.put(url, data, {
                headers: JSON.parse(headers || '{}'), // Parse headers if provided
            });

            res.status(response.status).json(response.data);
        } catch (error) {
            return error
            res.status(error.response?.status || 500).json({ error: error.message });
        }
    }

    // Generic PATCH request handler with headers
    static async handlePatch(serviceObject, authToken, dataPointUrl, integrationDetails, dataBaseName, requestObject) {
        try {
            let dataMappingPathKey = serviceObject.dataMappingPath[0]

            if (!dataPointUrl || !requestObject) {
                throw new Error("URL and data are required.");
            }
            const response = await axios.patch(dataPointUrl, requestObject, {
                headers: authToken, // Parse headers if provided
            });
            return response.data
        } catch (error) {
            // console.log('PatchError:===',error)
            await exceptionLogs(integrationDetails, error.response.status, error.response.data?.Message || JSON.stringify(error.response.data), error.name, error.config.data, integrationsServiceObject?.category, sourceWOId = integrationsServiceObject?.sourceReferenceId || "", sourceWONumber = "", runnigWorkOrderId = "", destinationWONumber = "")
            return error
        }
    }

    // Generic DELETE request handler with headers
    static async handleDelete(req, res) {
        try {
            const { url, data, headers } = req.body;
            if (!url) {
                return res.status(400).json({ message: "URL is required" });
            }

            const response = await axios.delete(url, {
                data,
                headers: JSON.parse(headers || '{}'), // Parse headers if provided
            });

            res.status(response.status).json(response.data);
        } catch (error) {
            res.status(error.response?.status || 500).json({ error: error.message });
        }
    }

    // Generic HEAD request handler with headers
    static async handleHead(req, res) {
        try {
            const { url, headers } = req.query;
            if (!url) {
                return res.status(400).json({ message: "URL is required" });
            }

            const response = await axios.head(url, {
                headers: JSON.parse(headers || '{}'), // Parse headers if provided
            });

            res.status(response.status).send();
        } catch (error) {
            res.status(error.response?.status || 500).json({ error: error.message });
        }
    }

    // Generic OPTIONS request handler with headers
    static async handleOptions(req, res) {
        try {
            const { url, headers } = req.query;
            if (!url) {
                return res.status(400).json({ message: "URL is required" });
            }

            const response = await axios.options(url, {
                headers: JSON.parse(headers || '{}'), // Parse headers if provided
            });

            res.status(response.status).json(response.data);
        } catch (error) {
            res.status(error.response?.status || 500).json({ error: error.message });
        }
    }
}

module.exports = {
    GlobalHTTPMethods
}