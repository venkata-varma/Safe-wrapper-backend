const asyncWrapper = require("../../middleware/asyncWrapper")
const { validateServiceProviders } = require("../../utils/authUtils")

exports.CheckAuthenticationStatus = asyncWrapper(async(req, res, next) => {
   let response = await validateServiceProviders(req.body)
   return res.status(response.statusCode).json({
         status: response.status,
         message:response.message
      })
})