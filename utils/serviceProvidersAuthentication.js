const axios = require('axios')
// const sessionModel = require('../models/sessionDetailsModel')

const CPDAuthentication = async (client_id, client_secret, grant_type, baseUrl) => {
    try {
        const tokenResponse = await axios.post(
            baseUrl,
            `client_id=${client_id}&client_secret=${client_secret}&grant_type=${grant_type}`
        );

        return tokenResponse.data;
    } catch (error) {
        console.log("CPD Auth Error=", error);
        return 'error';
    }
}

const DFAuthentication = async (df_auth, df_servicecode, base_url) => {

    let createWorkOrderConfig = {
        method: 'post',
        maxBodyLength: Infinity,
        url: `${base_url}/workorders/search/?page=1&limit=1`,
        headers: {
            'df-auth': df_auth,
            'df-servicecode': df_servicecode

        },
        data: {

            "dateCreatedOnAfter": "2024-05-04",

        }
    };

    try {
        const checkDFCredentials = await axios.request(createWorkOrderConfig)
        console.log('checkDF', checkDFCredentials.status)
        return checkDFCredentials.status;
    } catch (Err) {
        console.log("err", Err)
    }
}


module.exports = {
    CPDAuthentication,
    DFAuthentication
}