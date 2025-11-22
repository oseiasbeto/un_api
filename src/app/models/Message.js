// models/Message.js
const mongoose = require('mongoose')

const messageSchema = new mongoose.Schema({
  // Quem enviou
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Conteúdo da mensagem
  content: { type: String },

  // Tipo de mensagem (igual Telegram)
  message_type: {
    type: String,
    enum: ['text', 'photo', 'video', 'voice', 'document', 'sticker', 'contact', 'location', 'poll'],
    default: 'text'
  },

  // Se for mídia
  file_url: { type: String },        // URL da foto, vídeo, voz, etc.
  file_thumb: { type: String },      // thumbnail (pra foto/vídeo)
  file_duration: { type: Number },   // em segundos (pra áudio/vídeo)
  file_size: { type: Number },       // em bytes

  // Reply (responder mensagem)
  reply_to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },

  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true
  },

  // Forward (encaminhar)
  forwarded_from: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Quem leu (igual Telegram)
  read_by: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    read_at: { type: Date, default: Date.now }
  }],

  // Apagado (pra todos ou só pra mim)
  is_deleted: { type: Boolean, default: false },
  deleted_for: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]

}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
})

// Índices pra performance
messageSchema.index({ createdAt: -1 })
messageSchema.index({ sender: 1 })

module.exports = mongoose.model('Message', messageSchema)