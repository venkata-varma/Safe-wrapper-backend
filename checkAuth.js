const { checkOAuth } = require("./utils/authUtils")

async function checkAuth() {
    let response = await checkOAuth('http://oauth-pro-v2.corrigo.com/OAuth/Token',
        'A0181AC9C889BB914AE24EC8CDEF5E49',
        '2A9B7505D30E2396F3653FEABBE8396544364C8C8C574CFA73A84A1160C61D21A5FEDE8445357C92F484D5624AD1D661A9E98497A2D2BDD34E7B922AC412352C',
        'client_credentials',
    )

    console.log(response);
    
    
}

checkAuth()

// console.log('hell');
