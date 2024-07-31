const sgMail = require('@sendgrid/mail');
require('dotenv').config()
exports.sendWorkOrderEmail = (finalHtml) => {
    
    return new Promise(async (resolve, reject) => {
        console.log("===================== Email Start OBJET ================");

        // const { mobileEmail } = data
        let SENDGRID_API_KEY = process.env.SENDGRID_KEY_DEV
        console.log('SENDGRID_API_KEY:==',SENDGRID_API_KEY)
        sgMail.setApiKey(SENDGRID_API_KEY);
        const msg = {
            to: ['chandusai.pendyala@devrabbit.com','chandubr2255@gmail.com'],
            from: "info@isyncrabbit.com",
            subject: 'Testing webhooks',
            text: "Weekly Work Order Report.",
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