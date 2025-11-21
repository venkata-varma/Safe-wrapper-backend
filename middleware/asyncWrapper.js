
const customConstants = require('../config/constants.json')
const { exceptionLogs } = require('./exceptionOperation')
const asyncWrapper = (fn) => {
  return async (req, res, next) => {
    try {
      await fn(req, res, next)
    } catch (error) {

      let exceptionObject = {
        ...(res.req?.params ?? {}),
        ...(res.req?.query ?? {}),
        ...(res.req?.body ?? {}),
        accountId: res.req?.user?.accountId?._id?.toString() || null,
      }
      const errorMessage = typeof error.message === "object"
        ? JSON.stringify(error.message)
        : error.message;
      exceptionLogs(exceptionObject, error.statusCode || 500, errorMessage, error.name, res.req?.body || {}, res.req?.url.split('/')[1])

      if (error.name == "TokenExpiredError") {
        res.status(customConstants.statusCodes.UNAUTHORIZED).json({ status: customConstants.messages.MESSAGE_EXPIRED, message: customConstants.messages.MESSAGE_SESSION_EXPIRED })
        return;
      }
      next(error)
    }
  }
}

module.exports = asyncWrapper