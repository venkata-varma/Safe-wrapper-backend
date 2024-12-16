const axios = require('axios')


exports.basicAuth = async (username, password, url) => {
    const token = Buffer.from(`${username}:${password}`).toString('base64');

    try {
        const response = await axios.post(url, {
            headers: {
                Authorization: `Basic ${token}`,
                'Content-Type': 'application/json', // Adjust if the content type is different
            },
        });

        console.log('Response from external URL:', response.data);
    } catch (error) {
        console.error('Error calling external URL:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}


exports.checkOAuth = async ({baseUrl,clientId, secreteKey, grantType = 'client_credentials'}) => {

    try {
        const tokenResponse = await axios.post(
            `${baseUrl}`,
            `client_id=${clientId}&client_secret=${secreteKey}&grant_type=${grantType}`
        );
        
        return {status: "success", ...tokenResponse.data};
    } catch (error) {
        if(error.response.status == 400) {
            return {status: "fail", message: "Invalid Credentials"}
        }
    }
}