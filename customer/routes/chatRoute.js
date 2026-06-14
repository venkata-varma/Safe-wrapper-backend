const router = require('express').Router();
const auth = require('../../middleware/authentication');
let chatController=require('../controllers/chatController');


router.use(auth)
router.get('/get-all-users', chatController.getAllUsers)
router.post('/find-or-create-chat-room-for-pair-of-users', chatController.findOrCreateChatRoomForPair)
router.get('/get-messages-of-chat/:chatId',chatController.getMessagesOfChat )
router.post('/send-message',chatController.sendMessage )
router.get('/get-latest-chat-rooms-of-sender', chatController.getLatestChatRoomsOfSender)
module.exports=router