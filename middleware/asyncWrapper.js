
const customConstants = require('../config/constants.json')
const { exceptionLogs } = require('./exceptionOperation')
const asyncWrapper = (fn) => {
    return async (req, res, next) => {
      try {
        await fn(req, res, next)
      } catch (error) {
       
        let integrationDetails = {
          ...res.req?.user?.accountId?._doc,
          ...(res.req?.params ?? {}),
          ...(res.req?.query ?? {}),
          ...(res.req?.body ?? {}),
        };
        exceptionLogs(integrationDetails, error.statusCode || 500, error.message, error.name, res.req?.body, res.req?.url.split('/')[1])
        if(error.name == "TokenExpiredError") {
          res.status(customConstants.statusCodes.UNAUTHORIZED).json({status: customConstants.messages.MESSAGE_EXPIRED, message: customConstants.messages.MESSAGE_SESSION_EXPIRED})
          return;
        }
        next(error)
      }
    }
  }

  module.exports = asyncWrapper