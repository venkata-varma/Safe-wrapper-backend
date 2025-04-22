const jwt = require("jsonwebtoken");
const usersModel = require("../../models/usersModel");
const sessionModel = require("../../models/sessionsModel");
const customConstants = require("../config/customConstants.json");
const asyncWrapper = require("../../middleware/asyncWrapper");

const superAdminAuth = asyncWrapper(async (req, _res, next) => {
  const authHeader = req.headers.authorization;

  const token = authHeader.split(" ")[1];

  if (!authHeader || !authHeader.startsWith("Bearer")) {
    throw new Error(customConstants.messages.MESSAGE_SESSION_NO_HEADER);
  } else if (!token || token === "") {
    throw new Error(customConstants.messages.MESSAGE_SESSION_NO_TOKEN);
  } else {
    const payload = await jwt.verify(token, "secret");
    console.log(payload.userId, token, "goood");
    const user = await usersModel.findById(payload.userId).populate('accountId');
    const sessionObject = await sessionModel.findOne({
      userId: payload.userId,
      accessToken: token,
    });
    console.log(sessionObject.status === "open", "sessionObject");

    if (!user.userId || user.userId === "") {
      // If user not found
      throw new Error(customConstants.messages.MESSAGE_SESSION_NO_USER);
    } else if (sessionObject.status != "open") {
      // If session expired / token expired.
      _res
        .status(customConstants.statusCodes.UNAUTHORIZED)
        .json({
          status: customConstants.messages.MESSAGE_EXPIRED,
          message: customConstants.messages.MESSAGE_SESSION_EXPIRED,
        });
    } else if(user.accountId.accountType!=='super-admin'){
      _res
      .status(customConstants.statusCodes.FORBIDDEN)
      .json({
        status: customConstants.messages.MESSAGE_FAIL,
        message: customConstants.messages.MESSAGE_SUPER_ADMIN_ENTRY,
      });
    }
    
    else{
      req.user=user;

      next();
    }
  }
});

module.exports = {superAdminAuth};
