const express = require("express");
const router = express.Router();

// importando os middlewares
const protectedRoute = require("../../middlewares/protected-route")

const createPost = require("./controllers/createPost")

// configurando as rotas
router.post("/", protectedRoute, createPost)


// exportando as rotas
module.exports = router