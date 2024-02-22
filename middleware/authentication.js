const jwt = require('jsonwebtoken');
const usersModel = require('../models/usersModel')
const sessionModel = require('../models/sessionModel');
const customConstants = require('../config/constants.json')
const asyncWrapper = require('./asyncWrapper')

const auth = asyncWrapper( async (req, _res, next) => {
  const authHeader = req.headers.authorization;

  const token = authHeader.split(' ')[1];

  if (!authHeader || !authHeader.startsWith('Bearer')){
    throw new Error(customConstants.messages.MESSAGE_SESSION_NO_HEADER);
  }

  else if(!token || token === ""){
    throw new Error(customConstants.messages.MESSAGE_SESSION_NO_TOKEN);
  }
  else {
      const payload = await jwt.verify(token, 'secret');
      const user = await usersModel.findById(payload.user_id);
      const sessionObject = await sessionModel.findOne({userId : payload.user_id, accessToken: token});

      if(!user._id || user._id === ""){ // If user not found
        throw new Error(customConstants.messages.MESSAGE_SESSION_NO_USER);
      }
      else if(parseInt(sessionObject.statusCode) != 200){ // If session expired / token expired.
        _res.status(customConstants.statusCodes.UNAUTHORIZED).json(
          {status: customConstants.messages.MESSAGE_EXPIRED,
            message: customConstants.messages.MESSAGE_SESSION_EXPIRED})
      }
      else{
        next();
      }
  }
});

module.exports = auth;