// controllers/conversation/startDirectMessage.js
const Conversation = require('../../../models/Conversation')

const startDirectMessage = async (req, res) => {
  try {
    const { userId } = req.body // ID do outro usuário
    const currentUserId = req.user.id

    if (!userId || userId === currentUserId.toString()) {
      return res.status(400).json({ message: "Usuário inválido" })
    }

    // Busca ou cria DM
    const conversation = await Conversation.findOrCreateDirect(currentUserId, userId)
    
    return res.status(200).json({
      message: "Conversa iniciada",
      conversation
    })

  } catch (err) {
    console.error(err)
    return res.status(500).json({ message: "Erro ao iniciar conversa" })
  }
}

module.exports = startDirectMessage