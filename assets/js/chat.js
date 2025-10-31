// ===== GERENCIADOR DE CHAT EM TEMPO REAL =====

class ChatManager {
    constructor(containerId, socket) {
        this.containerId = containerId;
        this.socket = socket;
        this.currentChatId = null;
        this.messages = [];
        this.unreadCount = 0;
        this.user = getUser();
        
        this.init();
    }

    // Inicializar chat
    init() {
        this.setupSocketListeners();
        this.renderChatInterface();
    }

    // Configurar listeners do Socket.IO
    setupSocketListeners() {
        // Receber nova mensagem
        this.socket.on('nova_mensagem', (data) => {
            this.handleNewMessage(data);
        });

        // Mensagem lida
        this.socket.on('mensagem_lida', (data) => {
            this.markMessageAsRead(data.id_mensagem);
        });

        // Usuário digitando
        this.socket.on('usuario_digitando', (data) => {
            this.showTypingIndicator(data);
        });
    }

    // Renderizar interface do chat
    renderChatInterface() {
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error(`Container ${this.containerId} não encontrado`);
            return;
        }

        container.innerHTML = `
            <div class="chat-container">
                <div class="chat-header">
                    <h3 id="chat-title">Chat</h3>
                    <button class="btn-close-chat" onclick="chatManager.closeChat()">✕</button>
                </div>
                <div class="chat-messages" id="chat-messages">
                    <div class="chat-empty">
                        <p>Selecione uma conversa para começar</p>
                    </div>
                </div>
                <div class="chat-input-container" id="chat-input-container" style="display: none;">
                    <div class="typing-indicator" id="typing-indicator" style="display: none;">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                    <form id="chat-form" class="chat-form">
                        <input 
                            type="text" 
                            id="chat-input" 
                            placeholder="Digite sua mensagem..."
                            autocomplete="off"
                            required
                        />
                        <button type="submit" class="btn-send">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="22" y1="2" x2="11" y2="13"></line>
                                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                            </svg>
                        </button>
                    </form>
                </div>
            </div>
        `;

        this.setupFormListener();
        this.setupTypingListener();
    }

    // Configurar listener do formulário
    setupFormListener() {
        const form = document.getElementById('chat-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.sendMessage();
            });
        }
    }

    // Configurar listener de digitação
    setupTypingListener() {
        const input = document.getElementById('chat-input');
        if (input) {
            let typingTimer;
            input.addEventListener('input', () => {
                clearTimeout(typingTimer);
                
                // Emitir evento de digitação
                if (this.currentChatId) {
                    this.socket.emit('digitando', {
                        id_encomenda: this.currentChatId,
                        usuario: this.user.nome
                    });
                }

                // Parar de mostrar "digitando" após 1 segundo
                typingTimer = setTimeout(() => {
                    this.socket.emit('parou_digitar', {
                        id_encomenda: this.currentChatId
                    });
                }, 1000);
            });
        }
    }

    // Abrir chat para uma encomenda
    async openChat(idEncomenda, nomeOutroUsuario) {
        this.currentChatId = idEncomenda;
        
        // Atualizar título
        const title = document.getElementById('chat-title');
        if (title) {
            title.textContent = `Chat - ${nomeOutroUsuario}`;
        }

        // Mostrar input
        const inputContainer = document.getElementById('chat-input-container');
        if (inputContainer) {
            inputContainer.style.display = 'flex';
        }

        // Entrar na sala do Socket.IO
        this.socket.emit('entrar_chat', { id_encomenda: idEncomenda });

        // Carregar mensagens
        await this.loadMessages(idEncomenda);
    }

    // Carregar mensagens
    async loadMessages(idEncomenda) {
        try {
            const response = await fetchWithAuth(
                `${API_URL}/chat/${idEncomenda}`,
                { method: 'GET' }
            );

            if (response.ok) {
                const data = await response.json();
                this.messages = data.mensagens || [];
                this.renderMessages();
                this.scrollToBottom();
                
                // Marcar mensagens como lidas
                this.markAllAsRead(idEncomenda);
            }
        } catch (error) {
            console.error('Erro ao carregar mensagens:', error);
            showToast('Erro ao carregar mensagens', 'error');
        }
    }

    // Renderizar mensagens
    renderMessages() {
        const messagesContainer = document.getElementById('chat-messages');
        if (!messagesContainer) return;

        if (this.messages.length === 0) {
            messagesContainer.innerHTML = `
                <div class="chat-empty">
                    <p>Nenhuma mensagem ainda. Seja o primeiro a enviar!</p>
                </div>
            `;
            return;
        }

        messagesContainer.innerHTML = this.messages.map(msg => {
            const isOwn = msg.remetente === this.user.tipo;
            const time = new Date(msg.criado_em).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit'
            });

            return `
                <div class="chat-message ${isOwn ? 'own-message' : 'other-message'}">
                    <div class="message-content">
                        <p>${this.escapeHtml(msg.mensagem)}</p>
                        <span class="message-time">${time}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Enviar mensagem
    async sendMessage() {
        const input = document.getElementById('chat-input');
        if (!input || !input.value.trim()) return;

        const mensagem = input.value.trim();
        input.value = '';

        try {
            const response = await fetchWithAuth(
                `${API_URL}/chat/${this.currentChatId}`,
                {
                    method: 'POST',
                    body: JSON.stringify({ mensagem })
                }
            );

            if (response.ok) {
                const data = await response.json();
                
                // Emitir via Socket.IO para tempo real
                this.socket.emit('enviar_mensagem', {
                    id_encomenda: this.currentChatId,
                    mensagem: data.mensagem
                });

                // Adicionar à lista local
                this.messages.push(data.mensagem);
                this.renderMessages();
                this.scrollToBottom();
            } else {
                showToast('Erro ao enviar mensagem', 'error');
            }
        } catch (error) {
            console.error('Erro ao enviar mensagem:', error);
            showToast('Erro ao enviar mensagem', 'error');
        }
    }

    // Lidar com nova mensagem recebida
    handleNewMessage(data) {
        if (data.id_encomenda === this.currentChatId) {
            this.messages.push(data.mensagem);
            this.renderMessages();
            this.scrollToBottom();
            
            // Marcar como lida se o chat está aberto
            this.markMessageAsRead(data.mensagem.id_mensagem);
        } else {
            // Incrementar contador de não lidas
            this.unreadCount++;
            this.updateUnreadBadge();
            
            // Mostrar notificação
            showToast(`Nova mensagem de ${data.remetente}`, 'info');
        }
    }

    // Marcar mensagem como lida
    async markMessageAsRead(idMensagem) {
        try {
            await fetchWithAuth(
                `${API_URL}/chat/mensagem/${idMensagem}/ler`,
                { method: 'PUT' }
            );
        } catch (error) {
            console.error('Erro ao marcar mensagem como lida:', error);
        }
    }

    // Marcar todas as mensagens como lidas
    async markAllAsRead(idEncomenda) {
        try {
            await fetchWithAuth(
                `${API_URL}/chat/${idEncomenda}/ler-todas`,
                { method: 'PUT' }
            );
            
            this.unreadCount = 0;
            this.updateUnreadBadge();
        } catch (error) {
            console.error('Erro ao marcar mensagens como lidas:', error);
        }
    }

    // Mostrar indicador de digitação
    showTypingIndicator(data) {
        if (data.id_encomenda === this.currentChatId) {
            const indicator = document.getElementById('typing-indicator');
            if (indicator) {
                indicator.style.display = 'flex';
                indicator.innerHTML = `
                    <span>${data.usuario} está digitando</span>
                    <div class="typing-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                `;

                // Esconder após 3 segundos
                setTimeout(() => {
                    indicator.style.display = 'none';
                }, 3000);
            }
        }
    }

    // Atualizar badge de mensagens não lidas
    updateUnreadBadge() {
        const badge = document.getElementById('chat-unread-badge');
        if (badge) {
            if (this.unreadCount > 0) {
                badge.textContent = this.unreadCount;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
    }

    // Rolar para o final
    scrollToBottom() {
        const messagesContainer = document.getElementById('chat-messages');
        if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }

    // Fechar chat
    closeChat() {
        if (this.currentChatId) {
            this.socket.emit('sair_chat', { id_encomenda: this.currentChatId });
        }
        
        this.currentChatId = null;
        this.messages = [];
        
        const container = document.getElementById(this.containerId);
        if (container) {
            container.innerHTML = `
                <div class="chat-container">
                    <div class="chat-empty">
                        <p>Chat fechado</p>
                    </div>
                </div>
            `;
        }
    }

    // Escapar HTML para prevenir XSS
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Destruir chat
    destroy() {
        if (this.currentChatId) {
            this.socket.emit('sair_chat', { id_encomenda: this.currentChatId });
        }
        
        this.socket.off('nova_mensagem');
        this.socket.off('mensagem_lida');
        this.socket.off('usuario_digitando');
    }
}

// Estilos CSS para o chat
const chatStyles = document.createElement('style');
chatStyles.textContent = `
    .chat-container {
        background: white;
        border-radius: 12px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        display: flex;
        flex-direction: column;
        height: 500px;
        overflow: hidden;
    }

    .chat-header {
        background: linear-gradient(135deg, #2563eb, #1e40af);
        color: white;
        padding: 15px 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .chat-header h3 {
        margin: 0;
        font-size: 1.1rem;
    }

    .btn-close-chat {
        background: transparent;
        border: none;
        color: white;
        font-size: 1.5rem;
        cursor: pointer;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: background 0.3s;
    }

    .btn-close-chat:hover {
        background: rgba(255,255,255,0.2);
    }

    .chat-messages {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
        background: #f9fafb;
    }

    .chat-empty {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: #6b7280;
        text-align: center;
    }

    .chat-message {
        margin-bottom: 15px;
        display: flex;
    }

    .own-message {
        justify-content: flex-end;
    }

    .other-message {
        justify-content: flex-start;
    }

    .message-content {
        max-width: 70%;
        padding: 10px 15px;
        border-radius: 12px;
        position: relative;
    }

    .own-message .message-content {
        background: #2563eb;
        color: white;
        border-bottom-right-radius: 4px;
    }

    .other-message .message-content {
        background: white;
        color: #374151;
        border-bottom-left-radius: 4px;
        box-shadow: 0 1px 2px rgba(0,0,0,0.1);
    }

    .message-content p {
        margin: 0 0 5px 0;
        word-wrap: break-word;
    }

    .message-time {
        font-size: 0.75rem;
        opacity: 0.7;
    }

    .typing-indicator {
        padding: 10px 20px;
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 0.9rem;
        color: #6b7280;
    }

    .typing-dots {
        display: flex;
        gap: 4px;
    }

    .typing-dots span {
        width: 6px;
        height: 6px;
        background: #6b7280;
        border-radius: 50%;
        animation: typing 1.4s infinite;
    }

    .typing-dots span:nth-child(2) {
        animation-delay: 0.2s;
    }

    .typing-dots span:nth-child(3) {
        animation-delay: 0.4s;
    }

    @keyframes typing {
        0%, 60%, 100% {
            transform: translateY(0);
        }
        30% {
            transform: translateY(-10px);
        }
    }

    .chat-input-container {
        padding: 15px 20px;
        background: white;
        border-top: 1px solid #e5e7eb;
    }

    .chat-form {
        display: flex;
        gap: 10px;
    }

    .chat-form input {
        flex: 1;
        padding: 10px 15px;
        border: 2px solid #e5e7eb;
        border-radius: 25px;
        font-size: 0.95rem;
        outline: none;
        transition: border-color 0.3s;
    }

    .chat-form input:focus {
        border-color: #2563eb;
    }

    .btn-send {
        background: #2563eb;
        color: white;
        border: none;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: background 0.3s;
    }

    .btn-send:hover {
        background: #1e40af;
    }

    .chat-unread-badge {
        background: #ef4444;
        color: white;
        border-radius: 50%;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.75rem;
        font-weight: bold;
    }

    @media (max-width: 768px) {
        .chat-container {
            height: 400px;
        }

        .message-content {
            max-width: 85%;
        }
    }
`;
document.head.appendChild(chatStyles);
