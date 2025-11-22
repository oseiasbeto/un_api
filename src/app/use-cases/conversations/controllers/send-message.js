// controllers/messageController.js
const Message = require('../../../models/Message');
const Conversation = require('../../../models/Conversation');
const { getIO } = require("../../../services/socket");

const sendMessage = async (req, res) => {
  try {
    const { convId, content, message_type = 'text', reply_to, file_url, file_thumb, file_duration, file_size } = req.body;
    const senderId = req.user.id;

    // 1. Busca a conversa + participantes com socket_id
    const conversation = await Conversation.findById(convId)
      .populate({
        path: "participants",
        select: "name username profile_image.url socket_id is_online last_seen"
      });

    if (!conversation) {
      return res.status(404).json({ message: "Conversa não encontrada" });
    }

    // Verifica se o usuário está na conversa
    const senderInConversation = conversation.participants.some(
      p => p._id.toString() === senderId
    );
    
    if (!senderInConversation) {
      return res.status(403).json({ message: "Você não faz parte desta conversa" });
    }

    // Para canais de transmissão: só criador/admins podem enviar
    if (conversation.type === 'channel' && conversation.is_broadcast) {
      // Futuro: você pode ter um array de admins
      if (conversation.creator.toString() !== senderId) {
        return res.status(403).json({ message: "Você não tem permissão para postar neste canal" });
      }
    }

    // 2. Cria a mensagem (agora com conversation!)
    const message = await Message.create({
      conversation: convId,
      sender: senderId,
      content,
      message_type,
      file_url,
      file_thumb,
      file_duration,
      file_size,
      reply_to
    });

    let populatedMessage;
    if (message) {
      populatedMessage = await Message.findById(message._id)
        .populate({
          path: 'sender',
          select: 'name username profile_image.url'
        })
    } else populatedMessage = null

    // 3. Atualiza last_message da conversa
    const previewText = content
      ? content
      : message_type === 'photo' ? '📷 Foto'
        : message_type === 'video' ? '🎥 Vídeo'
          : message_type === 'voice' ? '🎤 Mensagem de voz'
            : message_type === 'sticker' ? '🎭 Sticker'
              : '[Mídia]';

    conversation.last_message = {
      _id: message._id,
      sender: senderId,
      content: previewText,
      message_type,
      created_at: message.created_at
    };

    // 4. Incrementa unread_count para todos EXCETO o remetente
    conversation.participants.forEach(participant => {
      if (participant._id.toString() === senderId) return;

      const current = conversation.unread_count.get(participant._id.toString()) || 0;
      conversation.unread_count.set(participant._id.toString(), current + 1);
    });

    conversation.unread_count.set(senderId, 0);

    await conversation.save();

    const otherUser = conversation.participants.find(p => p._id.toString() !== senderId)
    
    // 5. Emite para todos os participantes online
    const io = getIO();
    const messageToSend = {
      _id: populatedMessage._id,
      conversation: {
        _id: conversation._id,
        type: conversation.type,
        name: conversation.type === 'direct' ? otherUser?.name || 'Usuário' : conversation.name,
        avatar: conversation.type === 'direct' ? otherUser?.profile_image?.url : conversation.avatar,
        is_online: conversation.type === 'direct' ? otherUser?.is_online : false,
        last_seen: conversation.type === 'direct' ? otherUser?.last_seen : null,
        last_message: conversation.last_message ? {
          content: conversation.last_message.content || '[Foto]',
          created_at: conversation.last_message.created_at
        } : null,
        pinned: conversation.pinned,
        muted: !!conversation.muted_until
      },
      sender: {
        _id: populatedMessage.sender._id,
        name: populatedMessage.sender.name || populatedMessage.sender.username,
        profile_image: populatedMessage.sender.profile_image?.url
      },
      content: populatedMessage.content,
      message_type: populatedMessage.message_type,
      file_url: populatedMessage.file_url,
      file_thumb: populatedMessage.file_thumb,
      file_duration: populatedMessage.file_duration,
      created_at: populatedMessage.created_at,
      reply_to: populatedMessage.reply_to
    };

    conversation.participants.forEach(participant => {
      const isSender = participant._id.toString() === senderId;

      const msg = {
        _id: populatedMessage._id,
        conversation: {
          _id: conversation._id,
          type: conversation.type,
          name: conversation.type === 'direct' ? otherUser?.name || 'Usuário' : conversation.name,
          avatar: conversation.type === 'direct' ? otherUser?.profile_image?.url : conversation.avatar,
          is_online: conversation.type === 'direct' ? otherUser?.is_online : false,
          last_seen: conversation.type === 'direct' ? otherUser?.last_seen : null,
          last_message: conversation.last_message ? {
            content: conversation.last_message.content || '[Foto]',
            created_at: conversation.last_message.created_at
          } : null,
          unread_count: isSender
            ? 0
            : (conversation.unread_count.get(participant._id.toString()) || 0),
          pinned: conversation.pinned,
          muted: !!conversation.muted_until
        },
        sender: {
          _id: populatedMessage.sender._id,
          name: populatedMessage.sender.name || populatedMessage.sender.username,
          profile_image: populatedMessage.sender.profile_image?.url
        },
        content: populatedMessage.content,
        message_type: populatedMessage.message_type,
        file_url: populatedMessage.file_url,
        file_thumb: populatedMessage.file_thumb,
        file_duration: populatedMessage.file_duration,
        created_at: populatedMessage.created_at,
        reply_to: populatedMessage.reply_to
      };

      if (participant.socket_id) {
        io.to(participant.socket_id).emit('newMessage', msg);
      }
    });

    return res.status(201).json({
      message: "Mensagem enviada com sucesso",
      data: {
        ...messageToSend
      }
    });

  } catch (error) {
    console.error("Erro ao enviar mensagem:", error);
    return res.status(500).json({ message: "Erro interno", error: error.message });
  }
};

module.exports = sendMessage;