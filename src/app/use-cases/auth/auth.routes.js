const express = require("express");
const router = express.Router();

// importando os middlewares
const protectedRoute = require("../../middlewares/protected-route")
//const validObjectId = require("../../middlewares/validObjectId")

// importando os controllers
const getActiveSessions = require("./controllers/get-active-sessions")
const refreshAccessToken = require("./controllers/refresh-access-token")
const registerByPhone = require("./controllers/register-by-phone")
const verifyPhoneCode = require("./controllers/verify-phone-code")
const completeProfile = require("./controllers/complete-profile")
const logout = require("./controllers/logout")
const terminateAllSessions = require("./controllers/terminate-all-sessions")

// configurando as rotas
router.post("/register/phone", registerByPhone)
router.post("/verify/code", verifyPhoneCode)
router.get("/sessions", getActiveSessions)
router.put("/complete-profile", protectedRoute, completeProfile)
router.post("/refresh-access-token", refreshAccessToken)
router.delete("/logout", logout)
router.delete("/sessions/terminate-all", logout)

// exportando as rotas
module.exports = router