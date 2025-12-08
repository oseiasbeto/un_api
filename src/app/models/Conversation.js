// models/Conversation.js
const mongoose = require('mongoose')

const conversationSchema = new mongoose.Schema({
  // Tipo de conversa
  type: {
    type: String,
    enum: ['direct', 'group', 'channel', 'saved_messages'],
    default: 'direct',
    required: true
  },

  // Participantes
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],

  // Só pra grupo/canal
  name: { type: String },
  description: { type: String, default: '' },
  avatar: { type: String }, // URL do avatar
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // Grupo público / link de convite
  is_public: { type: Boolean, default: false },
  invite_link: { type: String, unique: true, sparse: true },

  // Canais têm @username
  username: { type: String, unique: true, sparse: true },

  // É canal de transmissão? (só admins postam)
  is_broadcast: { type: Boolean, default: false },

  // Contador de membros
  member_count: { type: Number, default: 2 },

  // Última mensagem (pra mostrar na sidebar)
  last_message: {
    _id: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    content: String,
    message_type: { type: String, default: 'text' },
    created_at: {
      type: Date,
      default: Date.now()
    }
  },

  // Contador de não lidos POR USUÁRIO (igual Telegram)
  unread_count: {
    type: Map,
    of: Number,
    default: () => new Map() // ex: { "507f1f77bcf86cd799439011": 3 }
  },

  // Configurações
  pinned: { type: Boolean, default: false },
  muted_until: { type: Date }, // null = não mutado
  archived: { type: Boolean, default: false },

  // Saved Messages (Mensagens Salvas)
  is_saved_messages: { type: Boolean, default: false }

}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
})

// === ÍNDICES IMPORTANTES (Telegram Style) ===

// DM único por par de usuários (ordenado)
conversationSchema.index(
  { participants: 1 },
  {
    unique: true,
    partialFilterExpression: { type: 'direct' },
    collation: { locale: 'en', strength: 2 }
  }
)

// Performance na sidebar (ordem correta)
conversationSchema.index({ pinned: -1, 'last_message.created_at': -1 })
conversationSchema.index({ 'last_message.created_at': -1 })

// Busca por nome de grupo/canal
conversationSchema.index({ name: 'text', description: 'text' })

// Canais públicos
conversationSchema.index({ username: 1 })
conversationSchema.index({ invite_link: 1 })

// === MÉTODO ESTÁTICO: Busca ou cria DM ===
conversationSchema.statics.findOrCreateDirect = async function (userId1, userId2) {
  const sortedIds = [userId1, userId2].sort()
  let conv = await this.findOne({
    type: 'direct',
    participants: { $all: sortedIds, $size: 2 }
  }).populate([
    { path: 'participants', select: 'name username profile_image is_online last_seen' },
    { path: 'last_message.sender', select: 'name' },
    { path: 'creator', select: 'name' }
  ])

  if (!conv) {
    const query = await this.create({
      type: 'direct',
      participants: sortedIds,
      last_message: {
        sender: userId1,
        content: "",
        message_type: "text",
        created_at: Date.now()
      }
    })
    if (query) {
      const convPopulated = await this.findOne({
        _id: query._id
      }).populate([
        { path: 'participants', select: 'name username profile_image is_online last_seen' },
        { path: 'last_message.sender', select: 'name' },
        { path: 'creator', select: 'name' }
      ])

      conv = convPopulated
    }
  }
  const otherUser = conv.participants.find(p => p._id.toString() !== userId1)
  const unread = 0

  return {
    _id: conv._id,
    type: conv.type,
    name: otherUser?.name,
    username: otherUser?.username,
    avatar: otherUser?.profile_image?.url,
    is_online: otherUser?.is_online || false,
    last_seen: otherUser?.last_seen || null,
    last_message: conv.last_message ? {
      content: conv.last_message.content || 'Nova conversa',
      created_at: conv.last_message.created_at
    } : null,
    unread_count: unread,
    pinned: conv.pinned,
    muted: !!conv.muted_until
  }
}

module.exports = mongoose.model('Conversation', conversationSchema)