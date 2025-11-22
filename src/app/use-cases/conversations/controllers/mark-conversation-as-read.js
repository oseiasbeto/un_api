// Importando modelos necessários
const Conversation = require('../../../models/Conversation');

// Controlador para obter mensagens de uma conversa específica
const markConversationAsRead = async (req, res) => {
    try {
        const userId = req.user.id;
        const { convId } = req.params; // ou req.body

        const conversation = await Conversation.findById(convId);

        if (!conversation) {
            return res.status(404).json({ message: "Conversa não encontrada" });
        }

        // Verifica se o usuário está na conversa
        const isParticipant = conversation.participants.some(
            p => p._id.toString() === userId
        );
        if (!isParticipant) {
            return res.status(403).json({ message: "Você não pertence a esta conversa" });
        }

        // Remove ou zera o contador de não lidos desse usuário
        const current = conversation.unread_count.get(userId) || 0;
        if (current > 0) {
            conversation.unread_count.set(userId, 0); // ou .set(userId, 0)
            await conversation.save();
        }

        // Emitir atualização em tempo real para o próprio usuário
        const io = require("../../../services/socket").getIO();
        const userSocketId = req.user.socket_id; // assumindo que você tem no req.user
        if (userSocketId) {
            io.to(userSocketId).emit("conversationRead", {
                conversationId,
                unread_count: 0
            });
        }

        return res.json({
            success: true,
            message: "Conversa marcada como lida",
            unread_count: 0
        });

    } catch (error) {
        console.error("Erro ao marcar como lido:", error);
        res.status(500).json({ message: "Erro interno" });
    }
};

module.exports = markConversationAsRead;