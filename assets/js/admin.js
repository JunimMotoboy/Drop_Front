// ===== DASHBOARD DO ADMIN =====

// Verificar autenticação
if (!checkAuth('admin')) {
    window.location.href = 'login.html';
}

// Variáveis globais
let encomendas = [];
let entregadores = [];
let clientes = [];
let currentEncomenda = null;
let charts = {};

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    loadUserInfo();
    loadDashboardData();
    setupFormListeners();
    initializeSocket();
});

// Carregar informações do usuário
function loadUserInfo() {
    const user = getUser();
    if (user) {
        document.getElementById('user-name').textContent = user.nome;
    }
}

// Carregar dados do dashboard
async function loadDashboardData() {
    await Promise.all([
        loadEncomendas(),
        loadEntregadores(),
        loadClientes()
    ]);
    
    updateStats();
    renderCharts();
}

// Carregar encomendas
async function loadEncomendas() {
    try {
        const response = await fetchWithAuth(`${API_URL}/admin/encomendas`, {
            method: 'GET'
        });

        if (response.ok) {
            const data = await response.json();
            console.log('Dados recebidos (admin):', data);
            
            // Verificar diferentes formatos de resposta
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
            
            console.log('Encomendas carregadas (admin):', encomendas.length);
            renderEncomendas();
        } else {
            console.error('Erro ao carregar encomendas:', response.status);
            showToast('Erro ao carregar encomendas', 'error');
        }
    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro ao carregar encomendas', 'error');
    }
}

// Carregar entregadores
async function loadEntregadores() {
    try {
        const response = await fetchWithAuth(`${API_URL}/admin/entregadores`, {
            method: 'GET'
        });

        if (response.ok) {
            const data = await response.json();
            entregadores = data.entregadores || [];
            renderEntregadores();
            updateEntregadorSelect();
        }
    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro ao carregar entregadores', 'error');
    }
}

// Carregar clientes
async function loadClientes() {
    try {
        const response = await fetchWithAuth(`${API_URL}/admin/clientes`, {
            method: 'GET'
        });

        if (response.ok) {
            const data = await response.json();
            clientes = data.clientes || [];
            renderClientes();
        }
    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro ao carregar clientes', 'error');
    }
}

// Renderizar encomendas
function renderEncomendas() {
    const tbody = document.getElementById('encomendas-tbody');
    
    if (encomendas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state"><i class="fas fa-box"></i><h3>Nenhuma encomenda</h3></td></tr>';
        return;
    }

    tbody.innerHTML = encomendas.map(enc => {
        const status = formatStatus(enc.status);
        return `
            <tr>
                <td>#${enc.codigo_rastreio || enc.id_encomenda}</td>
                <td>${enc.nome_cliente}</td>
                <td>${enc.nome_entregador || '<span style="color: #6b7280;">Não atribuído</span>'}</td>
                <td>${enc.loja_origem}</td>
                <td>R$ ${parseFloat(enc.valor).toFixed(2)}</td>
                <td><span class="status-badge ${enc.status}">${status.text}</span></td>
                <td>
                    <div class="table-actions">
                        ${!enc.id_entregador && enc.status === 'aguardando' ? `
                            <button class="btn btn-primary btn-sm btn-icon" onclick="abrirAtribuir(${enc.id_encomenda})">
                                <i class="fas fa-user-plus"></i> Atribuir
                            </button>
                        ` : ''}
                        <button class="btn btn-outline btn-sm btn-icon" onclick="verDetalhesEncomenda(${enc.id_encomenda})">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Renderizar entregadores
function renderEntregadores() {
    const tbody = document.getElementById('entregadores-tbody');
    
    if (entregadores.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state"><i class="fas fa-truck"></i><h3>Nenhum entregador</h3></td></tr>';
        return;
    }

    tbody.innerHTML = entregadores.map(ent => `
        <tr>
            <td>${ent.nome}</td>
            <td>${ent.email}</td>
            <td>${ent.telefone || '-'}</td>
            <td><span class="status-badge ${ent.status}">${ent.status === 'ativo' ? 'Ativo' : 'Inativo'}</span></td>
            <td>${ent.total_entregas || 0}</td>
            <td>
                <div class="table-actions">
                    <button class="btn btn-sm btn-icon ${ent.status === 'ativo' ? 'btn-danger' : 'btn-success'}" 
                            onclick="toggleStatusEntregador(${ent.id_entregador}, '${ent.status}')">
                        <i class="fas fa-${ent.status === 'ativo' ? 'ban' : 'check'}"></i>
                        ${ent.status === 'ativo' ? 'Desativar' : 'Ativar'}
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Renderizar clientes
function renderClientes() {
    const tbody = document.getElementById('clientes-tbody');
    
    if (clientes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state"><i class="fas fa-users"></i><h3>Nenhum cliente</h3></td></tr>';
        return;
    }

    tbody.innerHTML = clientes.map(cli => `
        <tr>
            <td>${cli.nome}</td>
            <td>${cli.email}</td>
            <td>${cli.telefone || '-'}</td>
            <td>${cli.total_encomendas || 0}</td>
            <td>${formatDate(cli.criado_em)}</td>
            <td>
                <div class="table-actions">
                    <button class="btn btn-outline btn-sm btn-icon" onclick="verDetalhesCliente(${cli.id_cliente})">
                        <i class="fas fa-eye"></i> Ver
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Atualizar estatísticas
function updateStats() {
    document.getElementById('stat-total-encomendas').textContent = encomendas.length;
    document.getElementById('stat-aguardando').textContent = encomendas.filter(e => e.status === 'aguardando').length;
    document.getElementById('stat-em-rota').textContent = encomendas.filter(e => e.status === 'em_rota').length;
    document.getElementById('stat-entregues').textContent = encomendas.filter(e => e.status === 'entregue').length;
    document.getElementById('stat-clientes').textContent = clientes.length;
    document.getElementById('stat-entregadores').textContent = entregadores.length;
}

// Renderizar gráficos
function renderCharts() {
    // Gráfico de Status
    const statusCtx = document.getElementById('chart-status');
    if (statusCtx) {
        if (charts.status) charts.status.destroy();
        
        const statusData = {
            aguardando: encomendas.filter(e => e.status === 'aguardando').length,
            em_rota: encomendas.filter(e => e.status === 'em_rota').length,
            entregue: encomendas.filter(e => e.status === 'entregue').length,
            cancelado: encomendas.filter(e => e.status === 'cancelado').length
        };

        charts.status = new Chart(statusCtx, {
            type: 'doughnut',
            data: {
                labels: ['Aguardando', 'Em Rota', 'Entregue', 'Cancelado'],
                datasets: [{
                    data: [statusData.aguardando, statusData.em_rota, statusData.entregue, statusData.cancelado],
                    backgroundColor: ['#f59e0b', '#2563eb', '#10b981', '#ef4444']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    // Gráfico de Timeline
    const timelineCtx = document.getElementById('chart-timeline');
    if (timelineCtx) {
        if (charts.timeline) charts.timeline.destroy();
        
        // Últimos 7 dias
        const last7Days = [];
        const counts = [];
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            last7Days.push(dateStr);
            
            const count = encomendas.filter(e => {
                if (e.status === 'entregue' && e.atualizado_em) {
                    const encDate = new Date(e.atualizado_em);
                    return encDate.toDateString() === date.toDateString();
                }
                return false;
            }).length;
            
            counts.push(count);
        }

        charts.timeline = new Chart(timelineCtx, {
            type: 'line',
            data: {
                labels: last7Days,
                datasets: [{
                    label: 'Entregas Concluídas',
                    data: counts,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }
}

// Filtrar encomendas
function filterEncomendas() {
    const statusFilter = document.getElementById('filter-encomenda-status').value;
    const searchTerm = document.getElementById('search-encomenda').value.toLowerCase();

    const filtered = encomendas.filter(enc => {
        const matchStatus = !statusFilter || enc.status === statusFilter;
        const matchSearch = !searchTerm || 
            (enc.codigo_rastreio && enc.codigo_rastreio.toLowerCase().includes(searchTerm)) ||
            enc.nome_cliente.toLowerCase().includes(searchTerm) ||
            enc.loja_origem.toLowerCase().includes(searchTerm);
        
        return matchStatus && matchSearch;
    });

    const tempEncomendas = encomendas;
    encomendas = filtered;
    renderEncomendas();
    encomendas = tempEncomendas;
}

// Abrir modal de atribuir
function abrirAtribuir(idEncomenda) {
    currentEncomenda = encomendas.find(e => e.id_encomenda === idEncomenda);
    
    if (!currentEncomenda) return;

    document.getElementById('atribuir-encomenda-info').textContent = 
        `#${currentEncomenda.codigo_rastreio || currentEncomenda.id_encomenda} - ${currentEncomenda.nome_cliente}`;
    
    // Carregar entregadores ativos
    loadEntregadoresAtivos();
    
    openModal('modal-atribuir');
}

// Atualizar select de entregadores
function updateEntregadorSelect() {
    const select = document.getElementById('select-entregador');
    
    const ativos = entregadores.filter(e => e.status === 'ativo');
    
    if (ativos.length === 0) {
        select.innerHTML = '<option value="">Nenhum entregador ativo</option>';
        return;
    }

    select.innerHTML = '<option value="">Selecione...</option>' + 
        ativos.map(e => `<option value="${e.id_entregador}">${e.nome}</option>`).join('');
}

// Carregar apenas entregadores ativos para o select
async function loadEntregadoresAtivos() {
    try {
        const response = await fetchWithAuth(`${API_URL}/admin/entregadores?status_filter=ativo`, {
            method: 'GET'
        });

        if (response.ok) {
            const data = await response.json();
            const entregadoresAtivos = data.entregadores || [];
            
            const select = document.getElementById('select-entregador');
            
            if (entregadoresAtivos.length === 0) {
                select.innerHTML = '<option value="">Nenhum entregador ativo</option>';
                return;
            }

            select.innerHTML = '<option value="">Selecione...</option>' + 
                entregadoresAtivos.map(e => `<option value="${e.id_entregador}">${e.nome}</option>`).join('');
        }
    } catch (error) {
        console.error('Erro:', error);
    }
}

// Atribuir entregador
async function atribuirEntregador(e) {
    e.preventDefault();
    
    const idEntregador = document.getElementById('select-entregador').value;
    
    if (!idEntregador) {
        showToast('Selecione um entregador', 'error');
        return;
    }

    try {
        const response = await fetchWithAuth(
            `${API_URL}/admin/encomendas/${currentEncomenda.id_encomenda}/atribuir`,
            {
                method: 'PUT',
                body: JSON.stringify({ id_entregador: parseInt(idEntregador) })
            }
        );

        if (response.ok) {
            showToast('Entregador atribuído com sucesso!', 'success');
            closeModal('modal-atribuir');
            loadEncomendas();
        } else {
            const data = await response.json();
            showToast(data.message || 'Erro ao atribuir', 'error');
        }
    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro ao atribuir entregador', 'error');
    }
}

// Cadastrar entregador
async function cadastrarEntregador(e) {
    e.preventDefault();
    
    const entregadorData = {
        nome: document.getElementById('entregador-nome').value,
        email: document.getElementById('entregador-email').value,
        senha: document.getElementById('entregador-senha').value,
        telefone: document.getElementById('entregador-telefone').value || null
    };

    try {
        const response = await fetchWithAuth(`${API_URL}/admin/entregadores`, {
            method: 'POST',
            body: JSON.stringify(entregadorData)
        });

        if (response.ok) {
            showToast('Entregador cadastrado com sucesso!', 'success');
            document.getElementById('form-novo-entregador').reset();
            closeModal('modal-novo-entregador');
            loadEntregadores();
        } else {
            const data = await response.json();
            showToast(data.message || 'Erro ao cadastrar', 'error');
        }
    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro ao cadastrar entregador', 'error');
    }
}

// Alternar status do entregador
async function toggleStatusEntregador(idEntregador, statusAtual) {
    const novoStatus = statusAtual === 'ativo' ? 'inativo' : 'ativo';
    
    if (!confirm(`Deseja ${novoStatus === 'ativo' ? 'ativar' : 'desativar'} este entregador?`)) {
        return;
    }

    try {
        const response = await fetchWithAuth(
            `${API_URL}/admin/entregadores/${idEntregador}/status`,
            {
                method: 'PUT',
                body: JSON.stringify({ status: novoStatus })
            }
        );

        if (response.ok) {
            showToast('Status atualizado!', 'success');
            loadEntregadores();
        } else {
            showToast('Erro ao atualizar status', 'error');
        }
    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro ao atualizar status', 'error');
    }
}

// Ver detalhes (placeholder)
function verDetalhesEncomenda(id) {
    const enc = encomendas.find(e => e.id_encomenda === id);
    if (enc) {
        alert(`Detalhes da Encomenda #${enc.codigo_rastreio || enc.id_encomenda}\n\nCliente: ${enc.nome_cliente}\nLoja: ${enc.loja_origem}\nValor: R$ ${enc.valor}\nStatus: ${formatStatus(enc.status).text}`);
    }
}

function verDetalhesCliente(id) {
    const cli = clientes.find(c => c.id_cliente === id);
    if (cli) {
        alert(`Detalhes do Cliente\n\nNome: ${cli.nome}\nEmail: ${cli.email}\nTelefone: ${cli.telefone || 'Não informado'}\nEncomendas: ${cli.total_encomendas || 0}`);
    }
}

// Configurar listeners
function setupFormListeners() {
    const formAtribuir = document.getElementById('form-atribuir');
    if (formAtribuir) {
        formAtribuir.addEventListener('submit', atribuirEntregador);
    }

    const formNovoEntregador = document.getElementById('form-novo-entregador');
    if (formNovoEntregador) {
        formNovoEntregador.addEventListener('submit', cadastrarEntregador);
    }
}

// Mostrar seção
function showSection(sectionName) {
    document.querySelectorAll('.dashboard-section').forEach(section => {
        section.classList.remove('active');
    });

    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });

    const section = document.getElementById(`section-${sectionName}`);
    if (section) {
        section.classList.add('active');
    }

    const activeLink = document.querySelector(`.nav-link[onclick*="${sectionName}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }
}

// Abrir/Fechar modal
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
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

    // Escutar nova encomenda
    socket.on('nova_encomenda', (data) => {
        console.log('Nova encomenda recebida:', data);
        showToast('Nova encomenda criada!', 'info');
        loadEncomendas();
    });

    // Escutar atualização de status
    socket.on('status_atualizado', (data) => {
        console.log('Status atualizado:', data);
        loadEncomendas();
    });

    // Escutar atribuição de entregador
    socket.on('entregador_atribuido', (data) => {
        console.log('Entregador atribuído:', data);
        loadEncomendas();
    });
}
