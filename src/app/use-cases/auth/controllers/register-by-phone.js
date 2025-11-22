// controllers/auth/registerByPhone.js
const User = require("../../../models/User");
const senderMessage = require("../../../services/queroSMS")

const registerByPhone = async (req, res) => {
  try {
    const { phone_number } = req.body;

    // Validação básica
    if (!phone_number || !/^\+?[1-9]\d{1,14}$/.test(phone_number)) {
      return res.status(400).json({ message: "Telefone inválido" });
    }

    // Verifica se já existe
    let user = await User.findOne({ phone_number });

    // Gera código de 5 dígitos
    const code = String(Math.floor(10000 + Math.random() * 90000));
    const codeExpires = Date.now() + 10 * 60 * 1000; // 10 minutos

    if (user) {
      // Usuário existe → atualiza código
      user.phone_code = code;
      user.phone_code_expires = codeExpires;
      user.phone_code_attempts = (user.phone_code_attempts || 0) + 1;
    } else {
      // Novo usuário
      user = new User({
        phone_number,
        phone_code: code,
        phone_code_expires: codeExpires,
        account_verification_status: "pending",
        name: "",
        username: `user${Date.now()}`, // temporário
        profile_image: { url: "https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png" }
      });
    }

    await user.save();

    // SIMULA ENVIO DE SMS (substitua por Twilio, AWS SNS, etc.)
    //senderMessage({ to: phone_number, message: `Seu código é: ${code}` })
    console.log(`[SMS para ${phone_number}] Seu código é: ${code}`);

    return res.status(200).json({
      message: "Código enviado com sucesso",
      phone_masked: phone_number.replace(/\d(?=\d{4})/g, "*"), // ex: +55****1234
      code_expires_in: 600
    });

  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Erro ao enviar código" });
  }
};

module.exports = registerByPhone;