
const customConstants = require('../../config/constants.json')
const { cardConnectExceptionLogs } = require('./cardConnectExceptionOperations')
const asyncWrapper = (fn) => {
    return async (req, res, next) => {
      try {
        await fn(req, res, next)
      } catch (error) {
        console.log('ReqUser:===',res.req?.user?.accountId?._id)
        // let exceptionObject = {
        //   ...(res.req?.params ?? {}),
        //   ...(res.req?.query ?? {}), 
        //   ...(res.req?.body ?? {}),
        //   accountId: res.req?.user?.accountId?._id?.toString() || null,
        // }


         let exceptionObject = {
          ...res.req?.user?.accountId?._doc,
          ...(res.req?.params ?? {}),
          ...(res.req?.query ?? {}), 
          ...(res.req?.body ?? {}),
        };
        console.log("exceptionObject", exceptionObject)
        const errorMessage = typeof error.message === "object" 
        ? JSON.stringify(error.message) 
        : error.message;
       await  cardConnectExceptionLogs(exceptionObject, error.statusCode || 500, errorMessage, error.name, res.req?.body || {}, res.req?.url.split('/')[1])
        
        if(error.name == "TokenExpiredError") {
          res.status(customConstants.statusCodes.UNAUTHORIZED).json({status: customConstants.messages.MESSAGE_EXPIRED, message: customConstants.messages.MESSAGE_SESSION_EXPIRED}) 
          return;
        }
        next(error)
      }
    }
  }
  
  module.exports = asyncWrapper