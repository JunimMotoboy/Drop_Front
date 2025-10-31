// ===== DASHBOARD DO CLIENTE =====

// Verificar autenticação
if (!checkAuth('cliente')) {
    window.location.href = 'login.html';
}

// Variáveis globais
let encomendas = [];
let currentEncomenda = null;
let mapManager = null;
let chatManager = null;
let locationWatchId = null;

// Inicializar ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    loadUserInfo();
    loadEncomendas();
    setupFormListeners();
    initializeSocket();
});

// Carregar informações do usuário
function loadUserInfo() {
    const user = getUser();
    if (user) {
        document.getElementById('user-name').textContent = user.nome;
        document.getElementById('profile-name').textContent = user.nome;
        document.getElementById('profile-email').textContent = user.email;
        
        if (user.telefone) {
            document.getElementById('profile-phone').textContent = user.telefone;
        }
    }
}

// Carregar encomendas
async function loadEncomendas() {
    try {
        console.log('Carregando encomendas...');
        const response = await fetchWithAuth(`${API_URL}/encomendas/minhas`, {
            method: 'GET'
        });

        console.log('Response status:', response.status);

        if (response.ok) {
            const data = await response.json();
            console.log('Dados recebidos:', data);
            
            // Verificar se data.data existe (formato antigo) ou data.encomendas (formato novo)
            if (data.data && data.data.encomendas) {
                encomendas = data.data.encomendas;
            } else if (data.encomendas) {
                encomendas = data.encomendas;
            } else if (Array.isArray(data.data)) {
                encomendas = data.data;
            } else if (Array.isArray(data)) {
                encomendas = data;
            } else {
                encomendas = [];
            }
            
            console.log('Encomendas carregadas:', encomendas.length);
            renderEncomendas();
            updateStats();
        } else {
            console.error('Erro na resposta:', response.status);
            showToast('Erro ao carregar encomendas', 'error');
        }
    } catch (error) {
        console.error('Erro ao carregar encomendas:', error);
        showToast('Erro ao carregar encomendas', 'error');
    }
}

// Renderizar encomendas
function renderEncomendas() {
    const container = document.getElementById('encomendas-list');
    
    if (encomendas.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-box-open"></i>
                <h3>Nenhuma encomenda encontrada</h3>
                <p>Crie sua primeira encomenda para começar!</p>
                <button class="btn btn-primary" onclick="showSection('nova-encomenda')">
                    <i class="fas fa-plus"></i> Nova Encomenda
                </button>
            </div>
        `;
        return;
    }

    container.innerHTML = encomendas.map(encomenda => {
        const status = formatStatus(encomenda.status);
        const tipoEntrega = encomenda.tipo_entrega === 'agendada' ? 'Agendada' : 'Móvel';
        
        return `
            <div class="encomenda-card status-${encomenda.status}" onclick="verDetalhes(${encomenda.id_encomenda})">
                <div class="encomenda-header">
                    <div class="encomenda-codigo">#${encomenda.codigo_rastreio || encomenda.id_encomenda}</div>
                    <span class="encomenda-status ${status.class}">${status.text}</span>
                </div>
                <div class="encomenda-info">
                    <div class="info-row">
                        <i class="fas fa-store"></i>
                        <span>${encomenda.loja_origem}</span>
                    </div>
                    <div class="info-row">
                        <i class="fas fa-dollar-sign"></i>
                        <span>R$ ${parseFloat(encomenda.valor).toFixed(2)}</span>
                    </div>
                    <div class="info-row">
                        <i class="fas fa-truck"></i>
                        <span>${tipoEntrega}</span>
                    </div>
                    ${encomenda.nome_entregador ? `
                        <div class="info-row">
                            <i class="fas fa-user"></i>
                            <span>${encomenda.nome_entregador}</span>
                        </div>
                    ` : ''}
                </div>
                <div class="encomenda-footer">
                    <span class="encomenda-date">
                        <i class="fas fa-calendar"></i>
                        ${formatDate(encomenda.criado_em)}
                    </span>
                    <button class="btn btn-primary btn-sm btn-ver-detalhes">
                        Ver Detalhes
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Filtrar encomendas
function filterEncomendas() {
    const statusFilter = document.getElementById('filter-status').value;
    const searchTerm = document.getElementById('search-encomenda').value.toLowerCase();

    const filtered = encomendas.filter(encomenda => {
        const matchStatus = !statusFilter || encomenda.status === statusFilter;
        const matchSearch = !searchTerm || 
            (encomenda.codigo_rastreio && encomenda.codigo_rastreio.toLowerCase().includes(searchTerm)) ||
            encomenda.loja_origem.toLowerCase().includes(searchTerm);
        
        return matchStatus && matchSearch;
    });

    const container = document.getElementById('encomendas-list');
    
    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <h3>Nenhuma encomenda encontrada</h3>
                <p>Tente ajustar os filtros de busca</p>
            </div>
        `;
        return;
    }

    // Renderizar apenas as filtradas
    const tempEncomendas = encomendas;
    encomendas = filtered;
    renderEncomendas();
    encomendas = tempEncomendas;
}

// Ver detalhes da encomenda
async function verDetalhes(idEncomenda) {
    currentEncomenda = encomendas.find(e => e.id_encomenda === idEncomenda);
    
    if (!currentEncomenda) {
        showToast('Encomenda não encontrada', 'error');
        return;
    }

    // Preencher informações
    document.getElementById('det-codigo').textContent = currentEncomenda.codigo_rastreio || `#${currentEncomenda.id_encomenda}`;
    document.getElementById('det-loja').textContent = currentEncomenda.loja_origem;
    document.getElementById('det-valor').textContent = `R$ ${parseFloat(currentEncomenda.valor).toFixed(2)}`;
    
    const status = formatStatus(currentEncomenda.status);
    document.getElementById('det-status').innerHTML = `<span class="encomenda-status ${status.class}">${status.text}</span>`;
    
    document.getElementById('det-tipo').textContent = currentEncomenda.tipo_entrega === 'agendada' ? 'Agendada' : 'Móvel';
    document.getElementById('det-entregador').textContent = currentEncomenda.nome_entregador || 'Não atribuído';
    document.getElementById('det-criado').textContent = formatDate(currentEncomenda.criado_em);

    // Observações
    if (currentEncomenda.observacoes) {
        document.getElementById('det-obs').textContent = currentEncomenda.observacoes;
        document.getElementById('det-obs-container').style.display = 'flex';
    } else {
        document.getElementById('det-obs-container').style.display = 'none';
    }

    // Controlar visibilidade dos botões
    const btnRastrear = document.getElementById('btn-rastrear');
    const btnChat = document.getElementById('btn-chat');
    const btnCancelar = document.getElementById('btn-cancelar');

    // Rastrear: apenas se tiver entregador e status em_rota
    btnRastrear.style.display = (currentEncomenda.id_entregador && currentEncomenda.status === 'em_rota') ? 'block' : 'none';
    
    // Chat: apenas se tiver entregador
    btnChat.style.display = currentEncomenda.id_entregador ? 'block' : 'none';
    
    // Cancelar: apenas se status for aguardando
    btnCancelar.style.display = currentEncomenda.status === 'aguardando' ? 'block' : 'none';

    // Esconder seções de rastreamento e chat
    document.getElementById('tracking-section').style.display = 'none';
    document.getElementById('chat-section').style.display = 'none';

    // Abrir modal
    openModal('modal-detalhes');
}

// Mostrar rastreamento
function showTracking() {
    const trackingSection = document.getElementById('tracking-section');
    trackingSection.style.display = 'block';

    // Inicializar mapa se ainda não foi
    if (!mapManager) {
        mapManager = new MapManager('map');
        mapManager.init();
    }

    // Obter localização do cliente
    mapManager.getUserLocation((error, clientLocation) => {
        if (error) {
            showToast('Erro ao obter sua localização', 'error');
            return;
        }

        // Adicionar marcador do cliente
        mapManager.addMarker('cliente', clientLocation.lat, clientLocation.lng, {
            icon: 'user',
            popup: 'Você está aqui'
        });

        // Se tiver localização do entregador, adicionar
        if (currentEncomenda.latitude_entregador && currentEncomenda.longitude_entregador) {
            mapManager.addMarker('entregador', 
                currentEncomenda.latitude_entregador, 
                currentEncomenda.longitude_entregador, 
                {
                    icon: 'delivery',
                    popup: `Entregador: ${currentEncomenda.nome_entregador}`
                }
            );

            // Desenhar rota
            mapManager.drawRoute([
                [currentEncomenda.latitude_entregador, currentEncomenda.longitude_entregador],
                [clientLocation.lat, clientLocation.lng]
            ]);

            // Calcular distância
            const distance = mapManager.calculateDistance(
                currentEncomenda.latitude_entregador,
                currentEncomenda.longitude_entregador,
                clientLocation.lat,
                clientLocation.lng
            );

            document.getElementById('tracking-distance').textContent = `${distance.toFixed(2)} km`;
            
            // Estimar tempo (assumindo 30 km/h)
            const timeMinutes = Math.round((distance / 30) * 60);
            document.getElementById('tracking-time').textContent = `${timeMinutes} minutos`;

            // Ajustar zoom para mostrar ambos
            mapManager.fitAllMarkers();
        } else {
            // Apenas centralizar no cliente
            mapManager.centerMap(clientLocation.lat, clientLocation.lng, 15);
            document.getElementById('tracking-distance').textContent = 'Aguardando localização do entregador';
            document.getElementById('tracking-time').textContent = 'Aguardando';
        }
    });

    // Escutar atualizações de localização via Socket.IO
    socket.on('atualizacao_localizacao', (data) => {
        if (data.id_encomenda === currentEncomenda.id_encomenda) {
            mapManager.updateMarker('entregador', data.latitude, data.longitude, true);
            
            // Recalcular distância
            mapManager.getUserLocation((error, clientLocation) => {
                if (!error) {
                    const distance = mapManager.calculateDistance(
                        data.latitude,
                        data.longitude,
                        clientLocation.lat,
                        clientLocation.lng
                    );
                    
                    document.getElementById('tracking-distance').textContent = `${distance.toFixed(2)} km`;
                    const timeMinutes = Math.round((distance / 30) * 60);
                    document.getElementById('tracking-time').textContent = `${timeMinutes} minutos`;
                }
            });
        }
    });
}

// Abrir chat
function openChatModal() {
    const chatSection = document.getElementById('chat-section');
    chatSection.style.display = 'block';

    // Inicializar chat se ainda não foi
    if (!chatManager) {
        chatManager = new ChatManager('chat-container', socket);
    }

    // Abrir chat para esta encomenda
    chatManager.openChat(currentEncomenda.id_encomenda, currentEncomenda.nome_entregador);
}

// Cancelar encomenda
async function cancelarEncomenda() {
    if (!confirm('Tem certeza que deseja cancelar esta encomenda?')) {
        return;
    }

    try {
        const response = await fetchWithAuth(
            `${API_URL}/encomendas/${currentEncomenda.id_encomenda}/cancelar`,
            { method: 'PUT' }
        );

        if (response.ok) {
            showToast('Encomenda cancelada com sucesso', 'success');
            closeModal('modal-detalhes');
            loadEncomendas();
        } else {
            const data = await response.json();
            showToast(data.message || 'Erro ao cancelar encomenda', 'error');
        }
    } catch (error) {
        console.error('Erro ao cancelar encomenda:', error);
        showToast('Erro ao cancelar encomenda', 'error');
    }
}

// Configurar listeners dos formulários
function setupFormListeners() {
    // Formulário de nova encomenda
    const formNovaEncomenda = document.getElementById('form-nova-encomenda');
    if (formNovaEncomenda) {
        formNovaEncomenda.addEventListener('submit', async (e) => {
            e.preventDefault();
            await criarEncomenda();
        });
    }
}

// Alternar campos de entrega
function toggleEntregaFields() {
    const tipoEntrega = document.getElementById('tipo_entrega').value;
    const agendadaFields = document.getElementById('agendada-fields');
    const movelFields = document.getElementById('movel-fields');

    if (tipoEntrega === 'agendada') {
        agendadaFields.style.display = 'block';
        movelFields.style.display = 'none';
        document.getElementById('data_agendada').required = true;
        document.getElementById('endereco_entrega').required = true;
    } else if (tipoEntrega === 'movel') {
        agendadaFields.style.display = 'none';
        movelFields.style.display = 'block';
        document.getElementById('data_agendada').required = false;
        document.getElementById('endereco_entrega').required = false;
    } else {
        agendadaFields.style.display = 'none';
        movelFields.style.display = 'none';
    }
}

// Criar nova encomenda
async function criarEncomenda() {
    const tipoEntrega = document.getElementById('tipo_entrega').value;
    
    const encomendaData = {
        codigo_rastreio: document.getElementById('codigo_rastreio').value || null,
        loja_origem: document.getElementById('loja_origem').value,
        valor: parseFloat(document.getElementById('valor').value),
        tipo_entrega: tipoEntrega,
        observacoes: document.getElementById('observacoes').value || null
    };

    if (tipoEntrega === 'agendada') {
        encomendaData.data_agendada = document.getElementById('data_agendada').value;
        encomendaData.endereco_entrega = document.getElementById('endereco_entrega').value;
    }

    try {
        const response = await fetchWithAuth(`${API_URL}/encomendas`, {
            method: 'POST',
            body: JSON.stringify(encomendaData)
        });

        if (response.ok) {
            showToast('Encomenda criada com sucesso!', 'success');
            document.getElementById('form-nova-encomenda').reset();
            toggleEntregaFields();
            showSection('encomendas');
            loadEncomendas();
        } else {
            const data = await response.json();
            showToast(data.message || 'Erro ao criar encomenda', 'error');
        }
    } catch (error) {
        console.error('Erro ao criar encomenda:', error);
        showToast('Erro ao criar encomenda', 'error');
    }
}

// Atualizar estatísticas
function updateStats() {
    const total = encomendas.length;
    const aguardando = encomendas.filter(e => e.status === 'aguardando').length;
    const emRota = encomendas.filter(e => e.status === 'em_rota').length;
    const entregue = encomendas.filter(e => e.status === 'entregue').length;

    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-aguardando').textContent = aguardando;
    document.getElementById('stat-em-rota').textContent = emRota;
    document.getElementById('stat-entregue').textContent = entregue;
}

// Mostrar seção
function showSection(sectionName) {
    // Esconder todas as seções
    document.querySelectorAll('.dashboard-section').forEach(section => {
        section.classList.remove('active');
    });

    // Remover active dos links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });

    // Mostrar seção selecionada
    const section = document.getElementById(`section-${sectionName}`);
    if (section) {
        section.classList.add('active');
    }

    // Adicionar active ao link correspondente
    const activeLink = document.querySelector(`.nav-link[onclick*="${sectionName}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }
}

// Abrir modal
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
    }
}

// Fechar modal
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }

    // Limpar mapa e chat se existirem
    if (mapManager) {
        mapManager.clearMarkers();
        mapManager.clearRoute();
    }

    if (chatManager) {
        chatManager.closeChat();
    }
}

// Fechar modal ao clicar fora
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
    }
});

// Inicializar Socket.IO
function initializeSocket() {
    // Conectar ao socket
    if (!socket) {
        socket = connectSocket();
    }

    if (!socket) {
        console.error('Falha ao conectar Socket.IO');
        return;
    }

    // Escutar criação de encomenda (para o próprio cliente)
    socket.on('encomenda_criada', (data) => {
        console.log('Nova encomenda criada:', data);
        // Recarregar lista de encomendas
        loadEncomendas();
    });

    // Escutar atualizações de status
    socket.on('status_atualizado', (data) => {
        console.log('Status atualizado:', data);
        const encomenda = encomendas.find(e => e.id_encomenda === data.id_encomenda);
        if (encomenda) {
            encomenda.status = data.status;
            renderEncomendas();
            updateStats();
            showToast(`Status atualizado: ${formatStatus(data.status).text}`, 'info');
        } else {
            // Se não encontrou, recarregar lista
            loadEncomendas();
        }
    });

    // Escutar atribuição de entregador
    socket.on('entregador_atribuido', (data) => {
        console.log('Entregador atribuído:', data);
        const encomenda = encomendas.find(e => e.id_encomenda === data.id_encomenda);
        if (encomenda) {
            encomenda.id_entregador = data.id_entregador;
            encomenda.nome_entregador = data.nome_entregador;
            renderEncomendas();
            showToast(`Entregador atribuído: ${data.nome_entregador}`, 'success');
        } else {
            // Se não encontrou, recarregar lista
            loadEncomendas();
        }
    });
}
