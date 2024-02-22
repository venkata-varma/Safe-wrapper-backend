const axios = require('axios')
// const sessionModel = require('../models/sessionDetailsModel')

const authentication = async (client_id, client_secret, grant_type, baseUrl) => {
    try {
        const tokenResponse = await axios.post(
            'https://oauth-pro-v2.corrigo.com/OAuth/Token',
            `client_id=${client_id}&client_secret=${client_secret}&grant_type=${grant_type}`
        );
        return tokenResponse.data;
    } catch (error) {
        console.log("CPD Auth Error=", error);
        return 'error';
    }
}

const serviceChannelAuth = async (username, password, grant_type, baseUrl, Authorization) => {
    try{
    const tokenRes = await axios.post( baseUrl, `username=${username}&password=${password}&grant_type=${grant_type}`,
        {
            headers: {
                Authorization: Authorization,
                'Content-Type': "application/x-www-form-urlencoded"
            }
        });
        return tokenRes.data;
    } catch (error) {
        console.log("SC Auth Error=", error);
        return 'error';
    }
    
}


const quickbooksAuth = async (baseUrl, refresh_token, grant_type, Authorization) =>{
    try{
        const tokenRes = await axios.post(baseUrl,{refresh_token,grant_type},
           { 
            headers:{
                authorization:Authorization,
                "Content-Type":"application/x-www-form-urlencoded",
                accept:"application/json"
            }
        });
        return tokenRes.data
    }
    catch(error){
        console.log("Quick Books Auth error:==",error)
        return 'error'
    }
}


module.exports = { authentication, serviceChannelAuth, quickbooksAuth }