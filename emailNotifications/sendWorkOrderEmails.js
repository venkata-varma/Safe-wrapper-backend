const sgMail = require('@sendgrid/mail');
require('dotenv').config()

exports.sendWorkOrderEmail = (finalHtml, usersEmails, companyNameOfAccount) => {
    
    return new Promise(async (resolve, reject) => {
        console.log("===================== Email Start OBJET ================");

        // const { mobileEmail } = data
        let SENDGRID_API_KEY = process.env.SENDGRID_KEY_DEV || process.env.SENDGRID_KEY_PROD
        console.log("SENDGRID_API_KEY:===",SENDGRID_API_KEY)
        sgMail.setApiKey(SENDGRID_API_KEY);
        const msg = {
            to : usersEmails,
            from: "info@isyncrabbit.com",
            subject: `${companyNameOfAccount} - Weekly Work Order Report.`,
            text: `${companyNameOfAccount} - Weekly Work Order Report.`,
            html: finalHtml,
        };
        sgMail.send(msg)
            .then((data) => {
                console.log("sent mail")
                resolve(true)
            })
            .catch((err) => {
                console.log(JSON.stringify(err), "Error:")
                resolve(false)
            })
            console.log("===================== Email END OBJET ================");

    })
};