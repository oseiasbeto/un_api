const express = require("express");
const router = express.Router();

// importando os middlewares
const protectedRoute = require("../../middlewares/protected-route")

// importando os controllers
const getMessages = require("./controllers/get-messages")
const sendMessage = require("./controllers/send-message")
const getConversations = require("./controllers/get-conversations")
const getConversationById = require("./controllers/get-conversation-by-id")
const startDirectMessage = require("./controllers/start-direct-message")
const markConversationAsRead = require("./controllers/mark-conversation-as-read")

// configurando as rotas
router.post("/new-message", protectedRoute, sendMessage)
router.get("/", protectedRoute, getConversations)
router.get("/messages/:convId", protectedRoute, getMessages)
router.get("/:convId", protectedRoute, getConversationById)
router.post("/direct", protectedRoute, startDirectMessage)
router.post("/:convId/mark-as-read", protectedRoute, markConversationAsRead)

// exportando as rotas
module.exports = router