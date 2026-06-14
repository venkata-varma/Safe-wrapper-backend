let asyncWrapper = require("../../middleware/asyncWrapper");
let accountsModel = require("../../models/accountsModel");
let usersModel = require("../../models/usersModel");
let customConstants = require("../../config/constants.json");
let chatsModel = require("../../models/chatRoomModel");
let chatMessageModel = require("../../models/chatMessageModel");
const onlineUsers = require("../../socket/onlineUsersMap");
const { getIO } = require("../../socket/socket");

exports.getAllUsers = asyncWrapper(async (req, res) => {
  let currentAccountId = req.user.accountId._id;
  console.log("currentAccountId====", currentAccountId);

  const users = await accountsModel
    .find({
      _id: {
        $ne: currentAccountId,
      },
      status: "active",
    })
    .select("accountName email phone");

  return res
    .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
    .json({
      status: customConstants.messages.MESSAGE_SUCCESS,
      message: "All users are retreived",
      data: users,
    });
});

exports.findOrCreateChatRoomForPair = asyncWrapper(async (req, res) => {
  const senderId = req.user.accountId._id;
  const { receiverId } = req.body;

  if (!receiverId) {
    return res.status(400).json({
      success: false,
      message: "Receiver Id is required",
    });
  }

  if (senderId.toString() === receiverId) {
    return res.status(400).json({
      success: false,
      message: "You cannot chat with yourself",
    });
  }

  let chat = await chatsModel.findOne({
    participants: {
      $all: [senderId, receiverId],
    },
  });

  if (chat) {
    return res.status(200).json({
      success: true,
      message: "Chat already exists",
      chat,
    });
  }

  chat = await chatsModel.create({
    participants: [senderId, receiverId],
  });

  return res.status(201).json({
    success: true,
    message: "Chat created successfully",
    chat,
  });
});

exports.getMessagesOfChat = asyncWrapper(async (req, res) => {
  const { chatId } = req.params;

  const messages = await chatMessageModel
    .find({ chatId })
    .populate({
      path: "senderId",
      select: "accountName email",
    })
    .sort({ createdAt: 1 });

  return res.status(200).json({
    success: true,
    data: messages,
  });
});

exports.sendMessage = asyncWrapper(async (req, res) => {
  const { chatId, message } = req.body;

  const senderId = req.user.accountId._id;

  if (!chatId) {
    return res.status(400).json({
      success: false,
      message: "Chat Id is required",
    });
  }

  if (!message || !message.trim()) {
    return res.status(400).json({
      success: false,
      message: "Message is required",
    });
  }

  let newMessage = await chatMessageModel.create({
    chatId,
    senderId,
    message: message.trim(),
  });

  let updatedChat = await chatsModel.findByIdAndUpdate(
    chatId,
    {
      lastMessage: newMessage._id,
    },
    { new: true, runValidators: true },
  );

  const receiverId = updatedChat.participants.find(
    (participant) => participant.toString() !== senderId.toString(),
  );
  console.log("receiver id===",receiverId)
  const receiverSocketId = onlineUsers.get(receiverId.toString());

  newMessage = {
    ...newMessage._doc,
    senderId: {
      senderName: req.user.accountId.accountName,
      accountId: req.user.accountId._id,
      phone: req.user.accountId.phone,
      email: req.user.accountId.email,
      _id: req.user.accountId._id
    },
  };

  if (receiverSocketId) {
    console.log("receiverSocketId===", receiverSocketId)
    getIO().to(receiverSocketId).emit("receiveMessage", newMessage);
  } else {
    console.log("receiver offline. message saved as of now")
    //Later
  }

  return res.status(201).json({
    success: true,
    message: "Message sent successfully",
    data: newMessage,
  });
});

exports.getLatestChatRoomsOfSender = asyncWrapper(async (req, res) => {
  const sendertAccountId = req.user.accountId._id;

  const fetchLatestChatRoomsOfSender = await chatsModel
    .find({
      participants: sendertAccountId,
    })
    .populate("participants", "accountName email phone")
    .populate("lastMessage")
    .sort({
      updatedAt: -1,
    });

  return res.status(200).json({
    success: true,
    data: fetchLatestChatRoomsOfSender,
  });
});
