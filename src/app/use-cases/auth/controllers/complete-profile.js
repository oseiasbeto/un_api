const User = require("../../../models/User");
const { generateAvatarByName } = require("../../../utils/generate-avatar-by-name")

const completeProfile = async (req, res) => {
    try {
        const { name } = req.body;
        const userId = req.user.id; // vem do middleware auth

        if (!userId) return res.status(400).send({
            message: "Informe o user id"
        })

        if (!name || name.trim().length < 2) {
            return res.status(400).json({ message: "Nome muito curto" });
        }

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "Usuário não encontrado" });

        // Gera avatar automático se não tiver foto
        if (!user.profile_image?.url || user.name !== name) {
            const avatarUrl = generateAvatarByName(name);

            user.profile_image = {
                url: avatarUrl,
                public_id: null // Cloudinary null = avatar gerado
            };
        }

        // Atualiza o nome
        user.name = name.trim();

        await user.save();

        return res.status(200).json({
            message: "Perfil completo!",
            user: {
                _id: user._id,
                name: user.name,
                username: user.username,
                phone_number: user.phone_number,
                profile_image: user.profile_image
            }
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Erro ao salvar perfil" });
    }
};

module.exports = completeProfile;