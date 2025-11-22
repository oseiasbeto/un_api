const Conversation = require('../../../models/Conversation');

const getConversations = async (req, res) => {
    try {
        const { id: userId } = req.user;

        // Paginação
        const page = parseInt(req.query.page) || 1;

        // Itens por página
        const limit = parseInt(req.query.limit) || 10;

        // Cálculo do skip
        const skip = (page - 1) * limit;

        // Total de itens (para load incremental)
        const totalItems = parseInt(req.query.total) || 0;


        // Filtro para mensagens da conversa
        const filter = { participants: userId, archived: false };

        // Busca mensagens com paginação
        const conversations = await Conversation.find(filter)
            .sort({ "last_message.created_at": -1 })
            .skip(skip) // pular o número de itens já carregados
            .limit(limit) // limitar ao número por página   
            .sort({ pinned: -1, 'last_message.created_at': -1 })
            .populate([
                { path: 'participants', select: 'name profile_image is_online last_seen' },
                { path: 'last_message.sender', select: 'name' },
                { path: 'creator', select: 'name' }
            ])

        // Formata pra ficar lindo no frontend
        const formatted = conversations.map(conv => {
            const otherUser = conv.participants.find(p => p._id.toString() !== userId)
            // Aqui funciona porque não usamos .lean()
            let unread = 0;
            if (conv.unread_count instanceof Map) {
                unread = conv.unread_count.get(userId.toString()) || 0;
            } else {
                // Caso tenha usado .lean(), fallback seguro:
                unread = (conv.unread_count && conv.unread_count[userId.toString()]) || 0;
            }

            return {
                _id: conv._id,
                type: conv.type,
                name: conv.type === 'direct' ? otherUser?.name || 'Usuário' : conv.name,
                avatar: conv.type === 'direct' ? otherUser?.profile_image?.url : conv.avatar,
                is_online: conv.type === 'direct' ? otherUser?.is_online : false,
                last_seen: conv.type === 'direct' ? otherUser?.last_seen : null,
                last_message: conv.last_message ? {
                    ...(conv.type !== 'group' && {
                        sender: conv.last_message?.sender?.name
                    }),
                    content: conv.last_message.content || '[Foto]',
                    created_at: conv.last_message.created_at
                } : null,

                created_at: conv.created_at,
                updated_at: conv.updated_at,
                unread_count: unread,
                pinned: conv.pinned,
                muted: !!conv.muted_until
            }
        })

        // Contar total de mensagens na conversa (apenas se não for load incremental)
        let total;

        // Contagem total do filtro
        if (!totalItems) {
            // Contagem total do filtro
            total = await Conversation.countDocuments(filter);
        } else {
            // Usar total fornecido na requisição
            total = totalItems;
        }

        // Calcular total de páginas
        const totalPages = Math.ceil(total / limit);

        // Resposta padronizada
        res.status(200).json({
            conversations: formatted, // lista de conversas
            page, // página atual
            totalPages, // total de páginas
            total, // total de conversas
            hasMore: page < totalPages, // indica se há mais páginas
        });
    } catch (error) {
        // Log de erro para depuração
        console.error("Erro ao buscar conversas:", error);

        // Resposta de erro genérica
        res.status(500).json({ message: "Erro interno no servidor.", error: error.message });
    }
};

module.exports = getConversations;