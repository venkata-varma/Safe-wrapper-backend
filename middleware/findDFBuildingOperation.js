const asyncWrapper = require("./asyncWrapper");
const DFConfigurations = require("../config/integrationsConfiguration");
const { default: axios } = require("axios");
const { exceptionLogs } = require("./exceptionOperation");

/**
 * Get all dataforma building details.
 */
exports.getAllDFBuldingsData = (async (decryptConfigCredentials, integrationObject, CPDWorkOrderId, CPDWorkOrderNumber, DFWorkOrderId) => {
    let getBuildingConfig = {
        method: 'get',
        maxBodyLength: Infinity,
        url: `${DFConfigurations.DF.searchbuildings.URL}`,
        headers: {
            'df-auth': decryptConfigCredentials.df_auth,
            'df-servicecode': decryptConfigCredentials.df_servicecode,
            'Content-Type': 'application/json',
        }
    }
    const getDFBuildingData = await axios.request(getBuildingConfig)
        .then((response) => {
            // console.log("getDFBuildingData:===", JSON.stringify(response.data));
            return response.data
        })
        .catch(async (error) => {
            console.log("getDFBuildingIdERROR:==", error);
            if (integrationObject)
                await exceptionLogs(integrationObject, error.response.status, error.message, JSON.stringify(error.response.data.messages), JSON.stringify(error.config.url + " /n data: No building data available."), "df-search-buildings", CPDWorkOrderId, CPDWorkOrderNumber, DFWorkOrderId)
        });
    return getDFBuildingData;
});

/**
 * Search dataforma buildings which are matched with country and state.
 * @returns getFilteredBuildingDetails
 */

exports.searchDFBuildingsByStateAndCountry = async (Country, State, getDFBuildingData) => {
    let getFilteredBuildingDetails = getDFBuildingData !== undefined ? getDFBuildingData.filter((item) => {
        return (item.state === State && item.country === Country)
    }) : []
    return getFilteredBuildingDetails
}
/**
 * Filter and get the exact matched building from dataForma.
 * @returns reward.
 */
async function levenshteinAlgorithm(str1, str2) {

    // Calculate Levenshtein distance
    function levenshtein(a, b) {
        const matrix = [];
        // console.log('a:==',a)

        // Increment along the first column of each row
        for (let i = 0; i <= b.length; i++) {
            matrix[i] = [i];
        }

        // Increment each column in the first row
        for (let j = 0; j <= a.length; j++) {
            matrix[0][j] = j;
        }

        // Fill in the rest of the matrix
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1, // substitution
                        Math.min(
                            matrix[i][j - 1] + 1, // insertion
                            matrix[i - 1][j] + 1 // deletion
                        )
                    );
                }
            }
        }
        return matrix[b.length][a.length];
    }
    const distance = levenshtein(str1, str2);

    // Define the maximum possible distance (the length of the longer string)
    const maxDistance = Math.max(str1.length, str2.length);

    // Map the distance to a reward value between 0 and 1
    const reward = 1 - (distance / maxDistance);

    return reward;
}
/**
 * 
 * @param {*} ServiceLocation it has the building details of CoriigoPro.
 * @param {*} getFilteredDFBuildings it has the building detais of dataForma.
 * Verifies the spaceName from ServiceLocation and buildingName from getFilteredDFBuildings are equal return matchedDFBuildingData.
 * Verifies the Street1 from ServiceLocation and buildingstreet from getFilteredDFBuildings are equal return matchedDFBuildingData.  
 * Else it moves to partial matching using building name and street and get reward from levenshteinAlgorithm and return the best matching building.
 * @returns matchedDFBuildingData, partialBuildingsMatchedData
 */

exports.searchDFBuildingByNameAndStreet = async (ServiceLocation, getFilteredDFBuildings) => {
    let matchedDFBuildingData = {}
    let TotalRewards = 0
    let findBestReward = 0
    let partialBuildingsMatchedData = []
    for (let building of getFilteredDFBuildings) {
        if (ServiceLocation.SpaceName.toLowerCase() === building.name.toLowerCase()) {
            console.log('SpaceName:=====')
            matchedDFBuildingData = building
            break
        }
        else if (ServiceLocation.Address.Street1.toLowerCase() === building.street1.toLowerCase()) {
            console.log('Street1:=====')
            matchedDFBuildingData = building
            break
        }
        else {
            // console.log('ELSE:==')
            let SpaceNameRewards = await levenshteinAlgorithm(ServiceLocation.SpaceName, building.name)
            let streetRewars = await levenshteinAlgorithm(ServiceLocation.Address.Street1, building.street1)
            TotalRewards = SpaceNameRewards + streetRewars
            if (TotalRewards > findBestReward) {
                partialBuildingsMatchedData.push(building)
                findBestReward = TotalRewards
                matchedDFBuildingData = building
            }

        }
    }
    // console.log('matchedDFBuildingData:==',matchedDFBuildingData)
    return { matchedDFBuildingData, partialBuildingsMatchedData }
}

