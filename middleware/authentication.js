const jwt = require("jsonwebtoken");
const usersModel = require("../models/usersModel");
const sessionModel = require("../models/sessionsModel");
const customConstants = require("../config/constants.json");
const asyncWrapper = require("./asyncWrapper");

const auth = asyncWrapper(async (req, _res, next) => {
  const authHeader = req.headers.authorization;


  if (!authHeader || !authHeader.startsWith("Bearer")) {


    _res
    .status(customConstants.statusCodes.UNAUTHORIZED)
    .json({
      status: customConstants.messages.MESSAGE_FAIL,
      message: customConstants.messages.MESSAGE_SESSION_NO_HEADER,
    });



    // throw new Error(customConstants.messages.MESSAGE_SESSION_NO_HEADER);
  } 
  const token = authHeader.split(" ")[1];

  
  if (!token || token === "") {


    _res
    .status(customConstants.statusCodes.UNAUTHORIZED)
    .json({
      status: customConstants.messages.MESSAGE_FAIL,
      message: customConstants.messages.MESSAGE_SESSION_NO_TOKEN,
    });


    // throw new Error(customConstants.messages.MESSAGE_SESSION_NO_TOKEN);
  } else {
    const payload = await jwt.verify(token, "secret");
   
    const user = await usersModel.findById(payload.userId).populate('accountId');
    const sessionObject = await sessionModel.findOne({
      userId: payload.userId,
      accessToken: token,
    });

    console.log(sessionObject.status === "open", "sessionObject");

    if (!user.userId || user.userId === "") {
      // If user not found


      _res
      .status(customConstants.statusCodes.UNAUTHORIZED)
      .json({
        status: customConstants.messages.MESSAGE_FAIL,
        message: customConstants.messages.MESSAGE_SESSION_NO_USER,
      });


     // throw new Error(customConstants.messages.MESSAGE_SESSION_NO_USER);
    } else if (sessionObject.status != "open") {
      // If session expired / token expired.
      _res
        .status(customConstants.statusCodes.UNAUTHORIZED)
        .json({
          status: customConstants.messages.MESSAGE_EXPIRED,
          message: customConstants.messages.MESSAGE_SESSION_EXPIRED,
        });
    }
    // else if(user.accountId.accountType!=='customer'){
    //   console.log('not allowed===================')
    //   _res
    //   .status(customConstants.statusCodes.FORBIDDEN)
    //   .json({
    //     status: customConstants.messages.MESSAGE_FAIL,
    //     message: customConstants.messages.MESSAGE_ONLY_CUSTOMER_ENTRY,
    //   });
    // }
     
    
    else {
      req.user=user;

      next();
    }
  }
});

module.exports = auth;
