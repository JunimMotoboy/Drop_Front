// ===== GERENCIADOR DE CHAT EM TEMPO REAL =====

class ChatManager {
  constructor(containerId, socket) {
    this.containerId = containerId
    this.socket = socket
    this.currentChatId = null
    this.messages = []
    this.unreadCount = 0
    this.user = getUser()
    this.messageQueue = []
    this.isLoadingMessages = false
    this.typingTimeout = null
    this.lastScrollHeight = 0
    this.isAtBottom = true

    this.init()
  }

  init() {
    this.renderChatInterface()
    this.loadCachedMessages()
    window.chatManager = this
  }

  loadCachedMessages() {
    try {
      const cached = localStorage.getItem(`chat_${this.currentChatId}`)
      if (cached) {
        this.messages = JSON.parse(cached)
        console.log('📦 Mensagens carregadas do cache:', this.messages.length)
      }
    } catch (error) {
      console.error('Erro ao carregar cache:', error)
    }
  }

  saveCachedMessages() {
    try {
      if (this.currentChatId) {
        localStorage.setItem(
          `chat_${this.currentChatId}`,
          JSON.stringify(this.messages)
        )
      }
    } catch (error) {
      console.error('Erro ao salvar cache:', error)
    }
  }

  renderChatInterface() {
    const container = document.getElementById(this.containerId)
    if (!container) {
      console.error(`Container ${this.containerId} não encontrado`)
      return
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
          <div class="typing-indicator" id="typing-indicator" style="display: none;"></div>
          <form id="chat-form" class="chat-form">
            <input type="text" id="chat-input" placeholder="Digite sua mensagem..." autocomplete="off" required />
            <button type="submit" class="btn-send">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </form>
        </div>
      </div>
    `

    this.setupFormListener()
    this.setupTypingListener()
  }

  setupFormListener() {
    const form = document.getElementById('chat-form')
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault()
        this.sendMessage()
      })
    }
  }

  setupTypingListener() {
    const input = document.getElementById('chat-input')
    if (input) {
      let typingTimer
      input.addEventListener('input', () => {
        clearTimeout(typingTimer)
        if (this.currentChatId) {
          this.socket.emit('digitando', {
            id_encomenda: this.currentChatId,
            usuario: this.user.nome,
          })
        }
        typingTimer = setTimeout(() => {
          this.socket.emit('parou_digitar', {
            id_encomenda: this.currentChatId,
          })
        }, 1000)
      })
    }
  }

  async openChat(idEncomenda, nomeOutroUsuario) {
    this.currentChatId = idEncomenda
    const title = document.getElementById('chat-title')
    if (title) {
      title.textContent = `Chat - ${nomeOutroUsuario}`
    }
    const inputContainer = document.getElementById('chat-input-container')
    if (inputContainer) {
      inputContainer.style.display = 'flex'
    }
    this.socket.emit('entrar_chat', { id_encomenda: idEncomenda })
    await this.loadMessages(idEncomenda)

    // Iniciar polling para verificar novas mensagens a cada 3 segundos
    this.startPolling()
  }

  startPolling() {
    // Limpar polling anterior se existir
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval)
    }

    // Verificar novas mensagens a cada 3 segundos
    this.pollingInterval = setInterval(async () => {
      if (this.currentChatId && !this.isLoadingMessages) {
        const oldCount = this.messages.length
        await this.loadMessages(this.currentChatId)
        const newCount = this.messages.length

        // Se houver novas mensagens, tocar som
        if (newCount > oldCount) {
          console.log('🔔 Novas mensagens detectadas via polling!')
          playNotificationSound()
          vibrateDevice()
        }
      }
    }, 3000)

    console.log(
      '🔄 Polling iniciado para verificar novas mensagens a cada 3 segundos'
    )
  }

  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval)
      this.pollingInterval = null
      console.log('⏹️ Polling parado')
    }
  }

  async loadMessages(idEncomenda) {
    try {
      const response = await fetchWithAuth(`${API_URL}/chat/${idEncomenda}`, {
        method: 'GET',
      })
      if (response.ok) {
        const data = await response.json()
        console.log('📥 Resposta ao carregar mensagens:', data)

        if (data.mensagens) {
          this.messages = data.mensagens
        } else if (data.data && data.data.mensagens) {
          this.messages = data.data.mensagens
        } else if (Array.isArray(data.data)) {
          this.messages = data.data
        } else if (Array.isArray(data)) {
          this.messages = data
        } else {
          console.warn('⚠️ Formato de resposta não reconhecido:', data)
          this.messages = []
        }

        console.log('📊 Total de mensagens carregadas:', this.messages.length)
        this.saveCachedMessages()
        this.renderMessages()
        this.scrollToBottom()
        this.markAllAsRead(idEncomenda)
      }
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error)
      showToast('Erro ao carregar mensagens', 'error')
    }
  }

  renderMessages() {
    const messagesContainer = document.getElementById('chat-messages')
    if (!messagesContainer) return

    if (this.messages.length === 0) {
      messagesContainer.innerHTML =
        '<div class="chat-empty"><p>Nenhuma mensagem ainda. Seja o primeiro a enviar!</p></div>'
      return
    }

    const validMessages = this.messages.filter(
      (msg) =>
        msg &&
        typeof msg === 'object' &&
        msg.mensagem !== undefined &&
        msg.remetente !== undefined
    )

    if (validMessages.length === 0) {
      messagesContainer.innerHTML =
        '<div class="chat-empty"><p>Nenhuma mensagem válida encontrada.</p></div>'
      return
    }

    messagesContainer.innerHTML = validMessages
      .map((msg) => {
        const isOwn = msg.remetente === this.user.tipo
        const time = msg.criado_em
          ? new Date(msg.criado_em).toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
            })
          : '--:--'
        return `
        <div class="chat-message ${isOwn ? 'own-message' : 'other-message'}">
          <div class="message-content">
            <p>${this.escapeHtml(msg.mensagem || '')}</p>
            <span class="message-time">${time}</span>
          </div>
        </div>
      `
      })
      .join('')
  }

  async sendMessage() {
    const input = document.getElementById('chat-input')
    if (!input || !input.value.trim()) return

    const mensagem = input.value.trim()
    input.value = ''

    const tempMessage = {
      mensagem: mensagem,
      remetente: this.user.tipo,
      criado_em: new Date().toISOString(),
      id_mensagem: 'temp_' + Date.now(),
    }

    this.messages.push(tempMessage)
    this.renderMessages()
    this.scrollToBottom()

    try {
      const response = await fetchWithAuth(
        `${API_URL}/chat/${this.currentChatId}`,
        {
          method: 'POST',
          body: JSON.stringify({ mensagem }),
        }
      )

      if (response.ok) {
        const data = await response.json()
        console.log('📨 Resposta completa da API:', data)

        this.messages = this.messages.filter(
          (m) => m.id_mensagem !== tempMessage.id_mensagem
        )

        // A API retorna apenas a string da mensagem, não o objeto completo
        // Então precisamos recarregar todas as mensagens para ter a estrutura correta
        console.log('✅ Mensagem enviada com sucesso, recarregando lista...')
        await this.loadMessages(this.currentChatId)
      } else {
        this.messages = this.messages.filter(
          (m) => m.id_mensagem !== tempMessage.id_mensagem
        )
        this.renderMessages()
        const errorData = await response.json().catch(() => ({}))
        showToast(errorData.message || 'Erro ao enviar mensagem', 'error')
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error)
      this.messages = this.messages.filter(
        (m) => m.id_mensagem !== tempMessage.id_mensagem
      )
      this.renderMessages()
      showToast('Erro ao enviar mensagem', 'error')
    }
  }

  handleNewMessage(data) {
    console.log('📨 handleNewMessage chamado:', data)
    if (data.id_encomenda === this.currentChatId) {
      this.messages.push(data.mensagem)
      this.saveCachedMessages()
      this.renderMessages()
      this.scrollToBottom()
      if (data.mensagem.id_mensagem) {
        this.markMessageAsRead(data.mensagem.id_mensagem)
      }
      playNotificationSound()
      vibrateDevice()
    } else {
      this.unreadCount++
      this.updateUnreadBadge()
      showToast(`Nova mensagem de ${data.remetente || 'Usuário'}`, 'info')
      showBrowserNotification(
        'Nova mensagem',
        data.mensagem.mensagem || 'Você recebeu uma nova mensagem'
      )
      playNotificationSound()
      vibrateDevice()
    }
  }

  handleMessageSent(data) {
    console.log('✅ handleMessageSent chamado:', data)
    if (this.currentChatId === data.id_encomenda) {
      this.loadMessages(this.currentChatId)
    }
  }

  hideTypingIndicator() {
    const indicator = document.getElementById('typing-indicator')
    if (indicator) {
      indicator.style.display = 'none'
    }
  }

  async markMessageAsRead(idMensagem) {
    try {
      await fetchWithAuth(`${API_URL}/chat/mensagem/${idMensagem}/ler`, {
        method: 'PUT',
      })
    } catch (error) {
      console.error('Erro ao marcar mensagem como lida:', error)
    }
  }

  async markAllAsRead(idEncomenda) {
    try {
      const response = await fetchWithAuth(
        `${API_URL}/chat/${idEncomenda}/ler-todas`,
        { method: 'PUT' }
      )
      if (response && response.ok) {
        this.unreadCount = 0
        this.updateUnreadBadge()
      } else if (response && response.status === 404) {
        console.log(
          'Endpoint /ler-todas não encontrado, tentando /marcar-lidas'
        )
        const altResponse = await fetchWithAuth(
          `${API_URL}/chat/${idEncomenda}/marcar-lidas`,
          { method: 'PUT' }
        )
        if (altResponse && altResponse.ok) {
          this.unreadCount = 0
          this.updateUnreadBadge()
        } else {
          console.warn('Nenhum endpoint de marcar como lida disponível')
        }
      }
    } catch (error) {
      console.warn(
        'Não foi possível marcar mensagens como lidas:',
        error.message
      )
    }
  }

  showTypingIndicator(data) {
    if (data.id_encomenda === this.currentChatId) {
      const indicator = document.getElementById('typing-indicator')
      if (indicator) {
        indicator.style.display = 'flex'
        indicator.innerHTML = `
          <span>${data.usuario} está digitando</span>
          <div class="typing-dots">
            <span></span><span></span><span></span>
          </div>
        `
        setTimeout(() => {
          indicator.style.display = 'none'
        }, 3000)
      }
    }
  }

  updateUnreadBadge() {
    const badge = document.getElementById('chat-unread-badge')
    if (badge) {
      if (this.unreadCount > 0) {
        badge.textContent = this.unreadCount
        badge.style.display = 'flex'
      } else {
        badge.style.display = 'none'
      }
    }
  }

  scrollToBottom() {
    const messagesContainer = document.getElementById('chat-messages')
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight
    }
  }

  closeChat() {
    // Parar polling
    this.stopPolling()

    if (this.currentChatId) {
      this.socket.emit('sair_chat', { id_encomenda: this.currentChatId })
    }
    this.currentChatId = null
    this.messages = []
    const container = document.getElementById(this.containerId)
    if (container) {
      container.innerHTML =
        '<div class="chat-container"><div class="chat-empty"><p>Chat fechado</p></div></div>'
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  destroy() {
    // Parar polling
    this.stopPolling()

    if (this.currentChatId) {
      this.socket.emit('sair_chat', { id_encomenda: this.currentChatId })
    }
    this.socket.off('nova_mensagem')
    this.socket.off('mensagem_lida')
    this.socket.off('usuario_digitando')
  }
}

// Estilos CSS
const chatStyles = document.createElement('style')
chatStyles.textContent = `
  .chat-container { background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); display: flex; flex-direction: column; height: 500px; overflow: hidden; }
  .chat-header { background: linear-gradient(135deg, #2563eb, #1e40af); color: white; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; }
  .chat-header h3 { margin: 0; font-size: 1.1rem; }
  .btn-close-chat { background: transparent; border: none; color: white; font-size: 1.5rem; cursor: pointer; padding: 0; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: background 0.3s; }
  .btn-close-chat:hover { background: rgba(255,255,255,0.2); }
  .chat-messages { flex: 1; overflow-y: auto; padding: 20px; background: #f9fafb; }
  .chat-empty { display: flex; align-items: center; justify-content: center; height: 100%; color: #6b7280; text-align: center; }
  .chat-message { margin-bottom: 15px; display: flex; }
  .own-message { justify-content: flex-end; }
  .other-message { justify-content: flex-start; }
  .message-content { max-width: 70%; padding: 10px 15px; border-radius: 12px; position: relative; }
  .own-message .message-content { background: #2563eb; color: white; border-bottom-right-radius: 4px; }
  .other-message .message-content { background: white; color: #374151; border-bottom-left-radius: 4px; box-shadow: 0 1px 2px rgba(0,0,0,0.1); }
  .message-content p { margin: 0 0 5px 0; word-wrap: break-word; }
  .message-time { font-size: 0.75rem; opacity: 0.7; }
  .typing-indicator { padding: 10px 20px; display: flex; align-items: center; gap: 10px; font-size: 0.9rem; color: #6b7280; }
  .typing-dots { display: flex; gap: 4px; }
  .typing-dots span { width: 6px; height: 6px; background: #6b7280; border-radius: 50%; animation: typing 1.4s infinite; }
  .typing-dots span:nth-child(2) { animation-delay: 0.2s; }
  .typing-dots span:nth-child(3) { animation-delay: 0.4s; }
  @keyframes typing { 0%, 60%, 100% { transform: translateY(0); } 30% { transform: translateY(-10px); } }
  .chat-input-container { padding: 15px 20px; background: white; border-top: 1px solid #e5e7eb; }
  .chat-form { display: flex; gap: 10px; }
  .chat-form input { flex: 1; padding: 10px 15px; border: 2px solid #e5e7eb; border-radius: 25px; font-size: 0.95rem; outline: none; transition: border-color 0.3s; }
  .chat-form input:focus { border-color: #2563eb; }
  .btn-send { background: #2563eb; color: white; border: none; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background 0.3s; }
  .btn-send:hover { background: #1e40af; }
  @media (max-width: 768px) { .chat-container { height: 400px; } .message-content { max-width: 85%; } }
`
document.head.appendChild(chatStyles)
