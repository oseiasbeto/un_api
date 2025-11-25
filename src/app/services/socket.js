// Importa a classe Server do socket.io para criar um servidor WebSocket
const { Server } = require('socket.io');

const moment = require("moment")

// Importa o módulo jsonwebtoken para verificar tokens JWT
const jwt = require('jsonwebtoken');

// Importa o modelo de usuário do banco de dados (Mongoose)
const User = require('../models/User');

let io;

// Função para inicializar o servidor WebSocket
const initializeSocket = (server) => {
    // Cria uma instância do servidor WebSocket e o associa ao servidor HTTP
    io = new Server(server, {
        // Mantenha apenas estas configurações:
        path: "/socket.io/",
        transports: ['websocket', 'polling'],
        pingTimeout: 60000,
        pingInterval: 25000,
        maxHttpBufferSize: 1e8
    });

    // Middleware de autenticação para validar o token JWT antes de permitir a conexão
    io.use((socket, next) => {
        const token = socket.handshake.auth.token; // Obtém o token enviado pelo handshake do socket
        if (token) {
            // Verifica a validade do token utilizando a chave secreta
            jwt.verify(token, process.env.JWT_ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) return next(new Error('Autenticação inválida')); // Se o token for inválido, rejeita a conexão
                socket.userId = decoded.id; // Se o token for válido, armazena o ID do usuário no socket
                next(); // Prossegue com a conexão
            });
        } else {
            next(new Error('Token não fornecido')); // Rejeita a conexão caso o token não seja enviado
        }
    });

    // Evento disparado quando um cliente se conecta ao WebSocket
    io.on('connection', (socket) => {
        console.log('Usuário conectado:', socket.id); // Exibe o ID do socket no console

        // Evento personalizado "setUserOnline" para atualizar o status do usuário como "online"
        socket.on('setUserOnline', async (userId) => {
            try {
                // Verifica se o userId enviado pelo cliente corresponde ao ID do usuário autenticado no token
                if (userId !== socket.userId) {
                    throw new Error('ID de usuário inválido');
                }
                // Atualiza o status do usuário no banco de dados para "online" e salva o socket_id
                await User.findByIdAndUpdate(userId, {
                    is_online: true,
                    socket_id: socket.id,
                    last_seen: moment()
                });

                console.log(`Usuário ${userId} está online com socket ${socket.id}`);
            } catch (error) {
                console.error('Erro ao atualizar status:', error);
            }
        });

        // Evento disparado quando o cliente se desconecta do WebSocket
        socket.on('disconnect', async () => {
            try {
                // Busca o usuário pelo socket_id e atualiza o status para "offline"
                await User.findOneAndUpdate(
                    { socket_id: socket.id }, // Procura pelo usuário com este socket_id
                    {
                        is_online: false,
                        socket_id: null,
                        last_seen: moment()
                    }, // Define o status como offline e remove o socket_id
                );

                console.log('Usuário desconectado:', socket.id);
            } catch (error) {
                console.error('Erro ao desconectar:', error);
            }
        });
    });

    return io; // Retorna a instância do servidor WebSocket para ser usada em outras partes do sistema
};

// Função para acessar a instância io em outros módulos
const getIO = () => {
    if (!io) {
        throw new Error('Socket.IO não inicializado!');
    }
    return io;
};

// Exporta a função initializeSocket para ser utilizada em outros arquivos do projeto
module.exports = { initializeSocket, getIO };
