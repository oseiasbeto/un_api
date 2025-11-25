// Importando modelos necessários
const Conversation = require('../../../models/Conversation');

// Controlador para obter mensagens de uma conversa específica
const getConversationById = async (req, res) => {
    try {
        const { convId } = req.params;

        const { id: userId } = req.user
        
        // Validação básica
        if (!convId) {
            return res.status(400).json({ message: "ID da conversa é obrigatório." });
        }

        const conv = await Conversation.findById(convId)
            .populate([
                { path: 'participants', select: 'name is_verified profile_image is_online last_seen' },
                { path: 'last_message.sender', select: 'name' },
                { path: 'creator', select: 'name' }
            ])

        if (!conv) return res.status(404).send({
            message: "Conversa nn encontrada"
        })

        const otherUser = conv.type === 'direct' ? conv.participants.find(p => p._id.toString() !== userId) : null
        const unread = false ? conv.unread_count.get(userId.toString()) : 0

        const formatted = {
            _id: conv._id,
            type: conv.type,
            name: conv.type === 'direct' ? otherUser?.name || 'Usuário' : conv.name,
            avatar: conv.type === 'direct' ? otherUser?.profile_image?.url : conv.avatar,
            is_online: conv.type === 'direct' ? otherUser?.is_online : false,
            last_seen: conv.type === 'direct' ? otherUser?.last_seen : null,
            is_verified: conv.type === 'direct' ? otherUser?.is_verified : false,
            last_message: conv.last_message ? {
                content: conv.last_message.content || '[Foto]',
                created_at: conv.last_message.created_at
            } : null,
            unread_count: unread,
            pinned: conv.pinned,
            muted: !!conv.muted_until
        }
        // Resposta padronizada
        res.status(200).json({
            conversation: formatted
        });

    } catch (error) {
        // Log de erro para depuração
        console.error("Erro ao carregar a conversa:", error);

        // Resposta de erro genérica
        res.status(500).json({ message: "Erro interno no servidor." });
    }
};

module.exports = getConversationById;