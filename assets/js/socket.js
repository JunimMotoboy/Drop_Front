// Configuração do Socket.IO
const SOCKET_URL = 'https://drop-29o0.onrender.com'
let socket = null
let currentChatRoom = null
let reconnectAttempts = 0
const MAX_RECONNECT_ATTEMPTS = 5

// Conectar ao Socket.IO
function connectSocket() {
  const token = getToken()

  if (!token) {
    console.error('Token não encontrado')
    return null
  }

  socket = io(SOCKET_URL, {
    auth: {
      token: token,
    },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
    transports: ['websocket', 'polling'],
  })

  // Eventos de conexão
  socket.on('connect', () => {
    console.log('✅ Conectado ao WebSocket')
    showToast('Conectado ao servidor em tempo real', 'success')
    reconnectAttempts = 0

    // Re-entrar na sala do chat se estava em uma
    if (currentChatRoom) {
      console.log('🔄 Re-entrando na sala do chat:', currentChatRoom)
      socket.emit('entrar_chat', { id_encomenda: currentChatRoom })
    }

    // Atualizar status de conexão no chat se existir
    updateChatConnectionStatus(true)
  })

  socket.on('disconnect', (reason) => {
    console.log('❌ Desconectado do WebSocket. Razão:', reason)
    showToast('Desconectado do servidor', 'warning')
    updateChatConnectionStatus(false)
  })

  socket.on('connect_error', (error) => {
    reconnectAttempts++
    console.error(
      `Erro de conexão (tentativa ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}):`,
      error
    )

    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      showToast(
        'Não foi possível conectar ao servidor. Verifique sua conexão.',
        'error'
      )
    }
  })

  socket.on('error', (error) => {
    console.error('Erro no WebSocket:', error)
    showToast(error.message || 'Erro na conexão', 'error')
  })

  // Eventos de notificação
  socket.on('notification', (data) => {
    console.log('Nova notificação:', data)
    showToast(data.mensagem, 'info')

    // Atualizar contador de notificações se existir
    updateNotificationBadge()
  })

  // ===== EVENTOS DE CHAT =====

  // Confirmação de entrada na sala
  socket.on('chat_joined', (data) => {
    console.log('✅ Entrou na sala do chat:', data)
    currentChatRoom = data.id_encomenda
  })

  // Nova mensagem recebida
  socket.on('nova_mensagem', (data) => {
    console.log('📨 [SOCKET] Nova mensagem recebida via Socket.IO:', data)
    console.log('📨 [SOCKET] Sala atual:', currentChatRoom)
    console.log('📨 [SOCKET] ID da encomenda da mensagem:', data.id_encomenda)

    // Notificar o ChatManager se existir
    if (window.chatManager) {
      console.log('✅ [SOCKET] ChatManager existe, chamando handleNewMessage')
      window.chatManager.handleNewMessage(data)
    } else {
      console.warn('⚠️ [SOCKET] ChatManager não existe!')
    }

    // Mostrar notificação do navegador se o chat não estiver aberto
    if (currentChatRoom !== data.id_encomenda) {
      console.log('🔔 [SOCKET] Mostrando notificação (chat não está aberto)')
      showBrowserNotification(
        'Nova mensagem',
        data.mensagem?.mensagem || 'Nova mensagem'
      )
      playNotificationSound()
    }
  })

  // Adicionar listener para qualquer evento de chat (debug)
  socket.onAny((eventName, ...args) => {
    if (eventName.includes('chat') || eventName.includes('mensagem')) {
      console.log(`🔍 [SOCKET] Evento recebido: ${eventName}`, args)
    }
  })

  // Confirmação de mensagem enviada
  socket.on('mensagem_enviada', (data) => {
    console.log('✅ Mensagem enviada confirmada:', data)

    if (window.chatManager) {
      window.chatManager.handleMessageSent(data)
    }
  })

  // Mensagem lida
  socket.on('mensagem_lida', (data) => {
    console.log('👁️ Mensagem lida:', data)

    if (window.chatManager) {
      window.chatManager.markMessageAsRead(data.id_mensagem)
    }
  })

  // Usuário digitando
  socket.on('usuario_digitando', (data) => {
    console.log('⌨️ Usuário digitando:', data)

    if (window.chatManager && currentChatRoom === data.id_encomenda) {
      window.chatManager.showTypingIndicator(data)
    }
  })

  // Usuário parou de digitar
  socket.on('usuario_parou_digitar', (data) => {
    console.log('⏸️ Usuário parou de digitar:', data)

    if (window.chatManager && currentChatRoom === data.id_encomenda) {
      window.chatManager.hideTypingIndicator()
    }
  })

  // Erro no chat
  socket.on('chat_error', (data) => {
    console.error('❌ Erro no chat:', data)
    showToast(data.message || 'Erro no chat', 'error')
  })

  return socket
}

// Desconectar do Socket.IO
function disconnectSocket() {
  if (socket) {
    // Sair da sala do chat se estiver em uma
    if (currentChatRoom) {
      socket.emit('sair_chat', { id_encomenda: currentChatRoom })
      currentChatRoom = null
    }

    socket.disconnect()
    socket = null
  }
}

// Entrar em uma sala de chat
function joinChatRoom(idEncomenda) {
  if (!socket) {
    console.error('Socket não conectado')
    return false
  }

  // Sair da sala anterior se existir
  if (currentChatRoom && currentChatRoom !== idEncomenda) {
    socket.emit('sair_chat', { id_encomenda: currentChatRoom })
  }

  // Entrar na nova sala
  currentChatRoom = idEncomenda
  socket.emit('entrar_chat', { id_encomenda: idEncomenda })
  console.log('🚪 Entrando na sala do chat:', idEncomenda)

  return true
}

// Sair de uma sala de chat
function leaveChatRoom(idEncomenda) {
  if (!socket) {
    console.error('Socket não conectado')
    return false
  }

  socket.emit('sair_chat', { id_encomenda: idEncomenda })

  if (currentChatRoom === idEncomenda) {
    currentChatRoom = null
  }

  console.log('🚪 Saindo da sala do chat:', idEncomenda)
  return true
}

// Enviar mensagem via socket
function sendSocketMessage(idEncomenda, mensagem) {
  if (!socket) {
    console.error('Socket não conectado')
    return false
  }

  socket.emit('enviar_mensagem', {
    id_encomenda: idEncomenda,
    mensagem: mensagem,
  })

  return true
}

// Emitir evento de digitação
function emitTyping(idEncomenda) {
  if (!socket || !currentChatRoom) return

  socket.emit('digitando', {
    id_encomenda: idEncomenda,
  })
}

// Emitir evento de parou de digitar
function emitStoppedTyping(idEncomenda) {
  if (!socket || !currentChatRoom) return

  socket.emit('parou_digitar', {
    id_encomenda: idEncomenda,
  })
}

// Atualizar status de conexão no chat
function updateChatConnectionStatus(isConnected) {
  const statusElement = document.getElementById('chat-connection-status')
  if (statusElement) {
    if (isConnected) {
      statusElement.className = 'connection-status connected'
      statusElement.innerHTML = '<i class="fas fa-circle"></i> Conectado'
    } else {
      statusElement.className = 'connection-status disconnected'
      statusElement.innerHTML = '<i class="fas fa-circle"></i> Desconectado'
    }
  }
}

// Mostrar notificação do navegador
function showBrowserNotification(title, body) {
  // Verificar se o navegador suporta notificações
  if (!('Notification' in window)) {
    console.log('Este navegador não suporta notificações')
    return
  }

  // Verificar permissão
  if (Notification.permission === 'granted') {
    new Notification(title, {
      body: body,
      icon: '/assets/images/Logo.png',
      badge: '/assets/images/Logo.png',
      tag: 'chat-notification',
      requireInteraction: false,
    })
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        new Notification(title, {
          body: body,
          icon: '/assets/images/Logo.png',
          badge: '/assets/images/Logo.png',
          tag: 'chat-notification',
          requireInteraction: false,
        })
      }
    })
  }
}

// Tocar som de notificação
function playNotificationSound() {
  try {
    // Criar um som simples usando Web Audio API
    const audioContext = new (window.AudioContext ||
      window.webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.frequency.value = 800
    oscillator.type = 'sine'

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + 0.5
    )

    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.5)
  } catch (error) {
    console.log('Não foi possível tocar som de notificação:', error)
  }
}

// Vibrar dispositivo (se suportado)
function vibrateDevice() {
  if ('vibrate' in navigator) {
    navigator.vibrate([200, 100, 200])
  }
}

// Enviar atualização de localização
function sendLocationUpdate(latitude, longitude, id_encomenda = null) {
  if (!socket) {
    console.error('Socket não conectado')
    return
  }

  socket.emit('location:update', {
    latitude,
    longitude,
    id_encomenda,
  })
}

// Receber atualização de localização
function onLocationUpdate(callback) {
  if (!socket) {
    console.error('Socket não conectado')
    return
  }

  socket.on('location:updated', callback)
}

// Enviar mensagem de chat
function sendChatMessage(id_encomenda, mensagem) {
  if (!socket) {
    console.error('Socket não conectado')
    return
  }

  socket.emit('chat:send', {
    id_encomenda,
    mensagem,
  })
}

// Receber mensagem de chat
function onChatMessage(callback) {
  if (!socket) {
    console.error('Socket não conectado')
    return
  }

  socket.on('chat:message', callback)
}

// Confirmar envio de mensagem
function onChatSent(callback) {
  if (!socket) {
    console.error('Socket não conectado')
    return
  }

  socket.on('chat:sent', callback)
}

// Atualizar status da entrega
function sendDeliveryStatus(id_encomenda, status) {
  if (!socket) {
    console.error('Socket não conectado')
    return
  }

  socket.emit('delivery:status', {
    id_encomenda,
    status,
  })
}

// Receber atualização de status
function onDeliveryStatusUpdate(callback) {
  if (!socket) {
    console.error('Socket não conectado')
    return
  }

  socket.on('delivery:status:updated', callback)
}

// Atualizar badge de notificações
async function updateNotificationBadge() {
  try {
    const response = await fetchWithAuth(`${API_URL}/notifications`)
    const data = await response.json()

    if (data.success) {
      const unreadCount = data.data.filter((n) => !n.lida).length
      const badge = document.getElementById('notificationBadge')

      if (badge) {
        if (unreadCount > 0) {
          badge.textContent = unreadCount > 99 ? '99+' : unreadCount
          badge.style.display = 'inline-block'
        } else {
          badge.style.display = 'none'
        }
      }
    }
  } catch (error) {
    console.error('Erro ao atualizar badge de notificações:', error)
  }
}

// Obter localização atual do navegador
function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocalização não suportada pelo navegador'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
      },
      (error) => {
        reject(error)
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    )
  })
}

// Monitorar localização continuamente
let watchId = null

function startLocationTracking(callback, id_encomenda = null) {
  if (!navigator.geolocation) {
    console.error('Geolocalização não suportada')
    return
  }

  watchId = navigator.geolocation.watchPosition(
    (position) => {
      const location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      }

      // Enviar para o servidor via WebSocket
      sendLocationUpdate(location.latitude, location.longitude, id_encomenda)

      // Callback local
      if (callback) {
        callback(location)
      }
    },
    (error) => {
      console.error('Erro ao obter localização:', error)
      showToast('Erro ao obter localização', 'error')
    },
    {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0,
    }
  )
}

function stopLocationTracking() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId)
    watchId = null
  }
}
