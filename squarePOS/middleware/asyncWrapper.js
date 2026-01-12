
const customConstants = require('../../config/constants.json')
const {squarePOSExceptionLogs} = require('../utils/sqaurePOSExceptionOperations')

// const asyncWrapper = (fn) => {
//   return async (req, res, next) => {
//     try {
//       await fn(req, res, next)
//     } catch (error) {

//       // let exceptionObject = {
//       //   ...(res.req?.params ?? {}),
//       //   ...(res.req?.query ?? {}), 
//       //   ...(res.req?.body ?? {}),
//       //   accountId: res.req?.user?.accountId?._id?.toString() || null,
//       // }


//       let exceptionObject = {
//         ...res.req?.user?.accountId?._doc,
//         ...(res.req?.params ?? {}),
//         ...(res.req?.query ?? {}),
//         ...(res.req?.body ?? {}),
//       };

//       const errorMessage = typeof error.message === "object"
//         ? JSON.stringify(error.message)
//         : error.message;
//         await squarePOSExceptionLogs(exceptionObject, error.statusCode || 500,
//             errorMessage, error.name, res.req?.body || {}, res.req?.url.split('/')[1]
//         )
//     //   await cardConnectExceptionLogs(exceptionObject, error.statusCode || 500, errorMessage, error.name, res.req?.body || {}, res.req?.url.split('/')[1], "")

//       if (error.name == "TokenExpiredError") {
//         res.status(customConstants.statusCodes.UNAUTHORIZED).json({ status: customConstants.messages.MESSAGE_EXPIRED, message: customConstants.messages.MESSAGE_SESSION_EXPIRED })
//         return;
//       }
//       next(error)
//     }
//   }
// }

const asyncWrapper = (fn) => {
  return async (...args) => {
    try {
      await fn(...args);
    } catch (error) {

      const req = args[0];
      const res = args[1];

      const exceptionObject = {
        ...(req?.user?.accountId?._doc || {}),
        ...(req?.params || {}),
        ...(req?.query || {}),
        ...(req?.body || {})
      };

      const errorMessage =
        typeof error.message === 'object'
          ? JSON.stringify(error.message)
          : error.message;

      await squarePOSExceptionLogs(
        exceptionObject,
        error.statusCode || 500,
        errorMessage,
        error.name,
        req?.body || {},
        req?.originalUrl || 'cron/square-pos-sync'
      );

      if (res && error.name === 'TokenExpiredError') {
        return res.status(401).json({
          status: 'EXPIRED',
          message: 'Session expired'
        });
      }

      if (res) {
        return res.status(500).json({
          status: 'error',
          message: errorMessage
        });
      }
      throw error;
    }
  };
};

module.exports = asyncWrapper