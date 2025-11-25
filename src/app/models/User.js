// models/User.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    // === IDENTIFICAÇÃO PRINCIPAL ===
    username: {
      type: String,
      required: [true, "Username é obrigatório"],
      unique: true,
      trim: true,
      minlength: [3, "Mínimo 3 caracteres"],
      maxlength: [30, "Máximo 30 caracteres"],
      match: [/^[a-zA-Z0-9_]+$/, "Apenas letras, números e underscore"]
    },

    name: {
      type: String,
      default: "",
      maxlength: [50, "Máximo 50 caracteres"]
    },

    phone_number: {
      type: String,
      unique: true,
      sparse: true, // permite null mas único quando existe
      match: [/^\+?[1-9]\d{1,14}$/, "Telefone inválido (formato E.164)"]
    },

    // === PERFIL VISUAL ===
    profile_image: {
      public_id: { type: String, default: null },
      url: {
        type: String,
        default: "https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png"
      }
    },

    bio: {
      type: String,
      maxlength: [160, "Bio máxima de 160 caracteres"],
      default: ""
    },
    
    account_verification_status: {
      type: String,
      enum: ["pending", "verified"],
      default: "pending"
    },

    // === STATUS E PRESENÇA ===
    is_online: { type: Boolean, default: false },
    last_seen: { type: Date, default: null },
    socket_id: { type: String, default: null },

    player_id_onesignal: { type: String, default: null },

    // === PRIVACIDADE (como no Telegram) ===
    privacy: {
      last_seen: {
        type: String,
        enum: ["everybody", "contacts", "nobody"],
        default: "everybody"
      },
      profile_photo: {
        type: String,
        enum: ["everybody", "contacts", "nobody"],
        default: "everybody"
      },
      phone_number: {
        type: String,
        enum: ["everybody", "contacts", "nobody"],
        default: "contacts"
      },
      forwarded_messages: {
        type: String,
        enum: ["everybody", "contacts", "nobody"],
        default: "everybody"
      }
    },

    // === CONTADORES ===
    unread_messages_count: { type: Number, default: 0 },
    unread_notifications_count: { type: Number, default: 0 },

    // === AUTENTICAÇÃO ===
    password: { type: String, select: false }, // não retorna por padrão
    google_id: String,
    two_factor_enabled: { type: Boolean, default: false },
    two_factor_secret: { type: String, select: false },
    phone_code: { type: String },
    phone_code_expires: { type: Date },
    phone_code_attempts: { type: Number },

    // === CONFIGURAÇÕES ===
    theme: {
      type: String,
      enum: ["light", "dark", "system"],
      default: "system"
    },

    language: {
      type: String,
      default: "pt-BR"
    },

    // === OUTROS ===
    is_deleted: { type: Boolean, default: false }, // soft delete
    deleted_at: { type: Date, default: null },
    is_verified: {type: Boolean, default: false},

    blocked_users: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    muted_conversations: [{ type: mongoose.Schema.Types.ObjectId, ref: "Conversation" }],

    // === FUTURO (já preparado) ===
    // secret_chats: [{ type: mongoose.Schema.Types.ObjectId, ref: "SecretChat" }],
    // folders: [{ name: String, conversations: [mongoose.Schema.Types.ObjectId] }]
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// === ÍNDICES PARA PERFORMANCE ===
userSchema.index({ username: 1 });
userSchema.index({ phone_number: 1 });
userSchema.index({ is_online: 1, last_seen: -1 });
userSchema.index({ "privacy.last_seen": 1 });

// === VIRTUAL: nome exibido (como Telegram: Name ou @username) ===
userSchema.virtual("display_name").get(function () {
  return this.name || `@${this.username}`;
});

// === MÉTODO: formatar last seen como Telegram ===
userSchema.methods.getLastSeen = function () {
  if (this.is_online) return "online";
  if (!this.last_seen) return "visto pela última vez há muito tempo";

  const now = new Date();
  const diff = now - this.last_seen;
  const minute = 60 * 1000;
  const hour = minute * 60;
  const day = hour * 24;

  if (diff < minute) return "visto há menos de 1 minuto";
  if (diff < hour) return `visto há ${Math.floor(diff / minute)} minutos`;
  if (diff < day) return `visto há ${Math.floor(diff / hour)} horas`;
  if (diff < day * 7) return "visto esta semana";
  return "visto pela última vez há muito tempo";
};

module.exports = mongoose.model("User", userSchema);