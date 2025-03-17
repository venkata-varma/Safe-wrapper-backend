
const customConstants = require('../config/constants.json')
const asyncWrapper = (fn) => {
    return async (req, res, next) => {
      try {
        await fn(req, res, next)
      } catch (error) {
        if(error.name == "TokenExpiredError") {
          res.status(customConstants.statusCodes.UNAUTHORIZED).json({status: customConstants.messages.MESSAGE_EXPIRED, message: customConstants.messages.MESSAGE_SESSION_EXPIRED}) 
          return;
        }
        next(error)
      }
    }
  }
  
  module.exports = asyncWrapper