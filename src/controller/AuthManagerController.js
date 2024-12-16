const asyncWrapper = require("../../middleware/asyncWrapper")
const { checkOAuth } = require("../../utils/authUtils")

exports.CheckAuthenticationStatus = asyncWrapper(async(req, res, next) => {
   let {authType} = req.body
   let response
   if(authType == 'oauth1') {
       response = await checkOAuth(req.body)
   }

   return res.status(200).send({ ...response})


})