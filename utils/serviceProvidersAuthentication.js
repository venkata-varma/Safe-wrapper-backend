const axios = require('axios')
const querystring = require('querystring');

// const sessionModel = require('../models/sessionDetailsModel')

const CPDAuthentication = async (client_id, client_secret, grant_type, baseUrl) => {
    try {
        // console.log('baseUrl:==',baseUrl)
        const tokenResponse = await axios.post(
            `${baseUrl}`,
            `client_id=${client_id}&client_secret=${client_secret}&grant_type=${grant_type}`
        );
        // console.log('tokenResponse.data:==',tokenResponse.data.access_token)
        return tokenResponse.data.access_token;
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


const SNOWAuthentication = async (baseUrl, username, password, client_id, client_secret, grant_type) => {
    try {
        const data = querystring.stringify({
            username: username,
            password: password,
            client_id: client_id,
            client_secret: client_secret,
            grant_type: grant_type
        });

        const ValidateSNOWCredentials = await axios.post(
            baseUrl,
            data,
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        console.log('ValidateSNOWCredentials:==', ValidateSNOWCredentials.data);
        return ValidateSNOWCredentials.status;
    } catch (error) {
        console.log("SNOWAuthError:==", error.response ? error.response.data : error.message);
        return 'error';
    }
};

const CYSAuthentication = async(baseUrl,grant_type,cys_auth) => {
    try{
        const CYSResponseStatus = await axios.post(`${baseUrl}/auth/token`,
            {
                cys_auth : cys_auth,
                grant_type : grant_type
            },
            {
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        )
        console.log('CYSResponseStatus:==', CYSResponseStatus.status);
        return CYSResponseStatus.status;
    }catch(error){
        console.log('CYS-Auth-Error',error);
        return 'error'
    }

}


const SNOWAuthToken = async (baseUrl, username, password, client_id, client_secret, grant_type) => {
    try {
        const data = querystring.stringify({
            username: username,
            password: password,
            client_id: client_id,
            client_secret: client_secret,
            grant_type: grant_type
        });

        const ValidateSNOWCredentials = await axios.post(
            baseUrl,
            data,
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );


        return ValidateSNOWCredentials.data;
    } catch (error) {

        return error.response.data;
    }
};



module.exports = {
    CPDAuthentication,
    DFAuthentication,
    SNOWAuthentication,
    CYSAuthentication,
    SNOWAuthToken
}