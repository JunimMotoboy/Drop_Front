// Configuração do Socket.IO
const SOCKET_URL = 'https://drop-29o0.onrender.com:3000';
let socket = null;

// Conectar ao Socket.IO
function connectSocket() {
    const token = getToken();
    
    if (!token) {
        console.error('Token não encontrado');
        return null;
    }

    socket = io(SOCKET_URL, {
        auth: {
            token: token
        }
    });

    // Eventos de conexão
    socket.on('connect', () => {
        console.log('✅ Conectado ao WebSocket');
        showToast('Conectado ao servidor em tempo real', 'success');
    });

    socket.on('disconnect', () => {
        console.log('❌ Desconectado do WebSocket');
        showToast('Desconectado do servidor', 'warning');
    });

    socket.on('error', (error) => {
        console.error('Erro no WebSocket:', error);
        showToast(error.message || 'Erro na conexão', 'error');
    });

    // Eventos de notificação
    socket.on('notification', (data) => {
        console.log('Nova notificação:', data);
        showToast(data.mensagem, 'info');
        
        // Atualizar contador de notificações se existir
        updateNotificationBadge();
    });

    return socket;
}

// Desconectar do Socket.IO
function disconnectSocket() {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
}

// Enviar atualização de localização
function sendLocationUpdate(latitude, longitude, id_encomenda = null) {
    if (!socket) {
        console.error('Socket não conectado');
        return;
    }

    socket.emit('location:update', {
        latitude,
        longitude,
        id_encomenda
    });
}

// Receber atualização de localização
function onLocationUpdate(callback) {
    if (!socket) {
        console.error('Socket não conectado');
        return;
    }

    socket.on('location:updated', callback);
}

// Enviar mensagem de chat
function sendChatMessage(id_encomenda, mensagem) {
    if (!socket) {
        console.error('Socket não conectado');
        return;
    }

    socket.emit('chat:send', {
        id_encomenda,
        mensagem
    });
}

// Receber mensagem de chat
function onChatMessage(callback) {
    if (!socket) {
        console.error('Socket não conectado');
        return;
    }

    socket.on('chat:message', callback);
}

// Confirmar envio de mensagem
function onChatSent(callback) {
    if (!socket) {
        console.error('Socket não conectado');
        return;
    }

    socket.on('chat:sent', callback);
}

// Atualizar status da entrega
function sendDeliveryStatus(id_encomenda, status) {
    if (!socket) {
        console.error('Socket não conectado');
        return;
    }

    socket.emit('delivery:status', {
        id_encomenda,
        status
    });
}

// Receber atualização de status
function onDeliveryStatusUpdate(callback) {
    if (!socket) {
        console.error('Socket não conectado');
        return;
    }

    socket.on('delivery:status:updated', callback);
}

// Atualizar badge de notificações
async function updateNotificationBadge() {
    try {
        const response = await fetchWithAuth(`${API_URL}/notifications`);
        const data = await response.json();
        
        if (data.success) {
            const unreadCount = data.data.filter(n => !n.lida).length;
            const badge = document.getElementById('notificationBadge');
            
            if (badge) {
                if (unreadCount > 0) {
                    badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
                    badge.style.display = 'inline-block';
                } else {
                    badge.style.display = 'none';
                }
            }
        }
    } catch (error) {
        console.error('Erro ao atualizar badge de notificações:', error);
    }
}

// Obter localização atual do navegador
function getCurrentLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocalização não suportada pelo navegador'));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                });
            },
            (error) => {
                reject(error);
            },
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            }
        );
    });
}

// Monitorar localização continuamente
let watchId = null;

function startLocationTracking(callback, id_encomenda = null) {
    if (!navigator.geolocation) {
        console.error('Geolocalização não suportada');
        return;
    }

    watchId = navigator.geolocation.watchPosition(
        (position) => {
            const location = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
            };
            
            // Enviar para o servidor via WebSocket
            sendLocationUpdate(location.latitude, location.longitude, id_encomenda);
            
            // Callback local
            if (callback) {
                callback(location);
            }
        },
        (error) => {
            console.error('Erro ao obter localização:', error);
            showToast('Erro ao obter localização', 'error');
        },
        {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
        }
    );
}

function stopLocationTracking() {
    if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }
}
