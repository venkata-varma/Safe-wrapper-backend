const axios = require('axios');
const { cardConnectExceptionLogs } = require('./cardConnectExceptionOperations')

class GlobalHTTPMethods {


    static async handleGet(finalUrl, getAuthenticated, integrationsMasterDetails) {
        try {

            const invalidKeys = [null, undefined, "null", "undefined", ''];
            const hasInvalidKey = Object.keys(getAuthenticated?.responseData).some(key => invalidKeys.includes(key));
            const hasInvalidValue = Object.values(getAuthenticated?.responseData).some(key => invalidKeys.includes(key));
            let response

            if (!finalUrl) {
                throw new Error("URL and data are required.");
            }


            if (!hasInvalidKey && !hasInvalidValue) {
               
                response = await axios.get(finalUrl, {
                    headers: getAuthenticated?.responseData, // Parse headers if provided
                });
            }
            else {
                response = await axios.get(finalUrl, {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                });
            }

            return response.data
        } catch (error) {
            // console.log('GetError:===',error)
            await cardConnectExceptionLogs(integrationsMasterDetails, error.response?.status, error?.response?.data?.Message || JSON.stringify(error?.response?.data), error?.name, error?.config?.data === undefined ? error?.config?.url : error?.config?.data, finalUrl, "")
        }
    }


    static async handlePOST() {

    }

    static async handlePATCH() {

    }

    static async handlePUT() {

    }



}

module.exports = {
    GlobalHTTPMethods
}