// ===== DASHBOARD DO ENTREGADOR =====

// Verificar autenticação
if (!checkAuth('entregador')) {
  window.location.href = 'login.html'
}

// Variáveis globais
let entregas = []
let historico = []
let currentEntrega = null
let mapManager = null
let chatManager = null
let locationWatchId = null
let isLocationActive = false

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
  loadUserInfo()
  loadEntregas()
  initializeSocket()
})

// Carregar informações do usuário
function loadUserInfo() {
  const user = getUser()
  if (user) {
    document.getElementById('user-name').textContent = user.nome
    document.getElementById('profile-name').textContent = user.nome
    document.getElementById('profile-email').textContent = user.email

    if (user.telefone) {
      document.getElementById('profile-phone').textContent = user.telefone
    }

    if (user.criado_em) {
      const date = new Date(user.criado_em)
      document.getElementById('stat-membro-desde').textContent =
        date.toLocaleDateString('pt-BR')
    }
  }
}

// Carregar entregas
async function loadEntregas() {
  try {
    const response = await fetchWithAuth(
      `${API_URL}/encomendas/minhas-entregas`,
      {
        method: 'GET',
      }
    )

    if (response.ok) {
      const data = await response.json()
      console.log('Dados recebidos (entregador):', data)

      // Verificar diferentes formatos de resposta
      if (data.data && data.data.entregas) {
        entregas = data.data.entregas
      } else if (data.entregas) {
        entregas = data.entregas
      } else if (Array.isArray(data.data)) {
        entregas = data.data
      } else if (Array.isArray(data)) {
        entregas = data
      } else {
        entregas = []
      }

      console.log('Entregas carregadas (entregador):', entregas.length)
      renderEntregas()
      updateQuickStats()
    } else {
      console.error('Erro ao carregar entregas:', response.status)
      showToast('Erro ao carregar entregas', 'error')
    }
  } catch (error) {
    console.error('Erro:', error)
    showToast('Erro ao carregar entregas', 'error')
  }
}

// Renderizar entregas
function renderEntregas() {
  const container = document.getElementById('entregas-list')

  const pendentes = entregas.filter(
    (e) => e.status !== 'entregue' && e.status !== 'cancelado'
  )

  if (pendentes.length === 0) {
    container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-truck"></i>
                <h3>Nenhuma entrega pendente</h3>
                <p>Você está em dia com suas entregas!</p>
            </div>
        `
    return
  }

  container.innerHTML = pendentes
    .map((entrega) => {
      const status = formatStatus(entrega.status)
      // ✅ CORREÇÃO: Exibir o tipo de entrega real do banco de dados
      const tipoEntrega =
        entrega.tipo_entrega === 'agendada'
          ? 'Agendada'
          : entrega.tipo_entrega === 'movel'
          ? 'Móvel'
          : entrega.tipo_entrega || 'Não definido'

      return `
            <div class="entrega-item status-${
              entrega.status
            }" onclick="verDetalhes(${entrega.id_encomenda})">
                <div class="entrega-icon">
                    <i class="fas fa-box"></i>
                </div>
                <div class="entrega-content">
                    <div class="entrega-header">
                        <div class="entrega-codigo">#${
                          entrega.codigo_rastreio || entrega.id_encomenda
                        }</div>
                        <span class="entrega-status ${status.class}">${
        status.text
      }</span>
                    </div>
                    <div class="entrega-info">
                        <div class="info-row">
                            <i class="fas fa-user"></i>
                            <span>${entrega.nome_cliente}</span>
                        </div>
                        <div class="info-row">
                            <i class="fas fa-store"></i>
                            <span>${entrega.loja_origem}</span>
                        </div>
                        <div class="info-row">
                            <i class="fas fa-dollar-sign"></i>
                            <span>R$ ${parseFloat(entrega.valor).toFixed(
                              2
                            )}</span>
                        </div>
                        <div class="info-row">
                            <i class="fas fa-truck"></i>
                            <span>${tipoEntrega}</span>
                        </div>
                        ${
                          entrega.tipo_entrega === 'agendada' &&
                          entrega.data_agendada
                            ? `
                            <div class="info-row">
                                <i class="fas fa-calendar"></i>
                                <span>${formatDate(
                                  entrega.data_agendada
                                )}</span>
                            </div>
                        `
                            : ''
                        }
                    </div>
                </div>
                <div class="entrega-actions">
                    <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); verDetalhes(${
                      entrega.id_encomenda
                    })">
                        Ver Detalhes
                    </button>
                </div>
            </div>
        `
    })
    .join('')
}

// Filtrar entregas
function filterEntregas() {
  const statusFilter = document.getElementById('filter-status').value
  const tipoFilter = document.getElementById('filter-tipo').value

  const filtered = entregas.filter((entrega) => {
    const matchStatus = !statusFilter || entrega.status === statusFilter
    const matchTipo = !tipoFilter || entrega.tipo_entrega === tipoFilter
    return (
      matchStatus &&
      matchTipo &&
      entrega.status !== 'entregue' &&
      entrega.status !== 'cancelado'
    )
  })

  const container = document.getElementById('entregas-list')

  if (filtered.length === 0) {
    container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <h3>Nenhuma entrega encontrada</h3>
                <p>Tente ajustar os filtros</p>
            </div>
        `
    return
  }

  const tempEntregas = entregas
  entregas = filtered
  renderEntregas()
  entregas = tempEntregas
}

// Ver detalhes
async function verDetalhes(idEncomenda) {
  currentEntrega = entregas.find((e) => e.id_encomenda === idEncomenda)

  if (!currentEntrega) {
    showToast('Entrega não encontrada', 'error')
    return
  }

  // Preencher informações
  document.getElementById('det-codigo').textContent =
    currentEntrega.codigo_rastreio || `#${currentEntrega.id_encomenda}`
  document.getElementById('det-cliente').textContent =
    currentEntrega.nome_cliente
  document.getElementById('det-loja').textContent = currentEntrega.loja_origem
  document.getElementById('det-valor').textContent = `R$ ${parseFloat(
    currentEntrega.valor
  ).toFixed(2)}`

  const status = formatStatus(currentEntrega.status)
  document.getElementById(
    'det-status'
  ).innerHTML = `<span class="entrega-status ${status.class}">${status.text}</span>`

  // ✅ CORREÇÃO: Exibir o tipo de entrega real do banco de dados
  const tipoEntregaTexto =
    currentEntrega.tipo_entrega === 'agendada'
      ? 'Agendada'
      : currentEntrega.tipo_entrega === 'movel'
      ? 'Móvel'
      : currentEntrega.tipo_entrega || 'Não definido'
  document.getElementById('det-tipo').textContent = tipoEntregaTexto

  // Endereço e agendamento
  if (currentEntrega.tipo_entrega === 'agendada') {
    document.getElementById('det-endereco').textContent =
      currentEntrega.endereco_entrega || 'Não informado'
    document.getElementById('det-endereco-container').style.display = 'flex'

    if (currentEntrega.data_agendada) {
      document.getElementById('det-agendamento').textContent = formatDate(
        currentEntrega.data_agendada
      )
      document.getElementById('det-agendamento-container').style.display =
        'flex'
    } else {
      document.getElementById('det-agendamento-container').style.display =
        'none'
    }
  } else {
    document.getElementById('det-endereco-container').style.display = 'none'
    document.getElementById('det-agendamento-container').style.display = 'none'
  }

  // Observações
  if (currentEntrega.observacoes) {
    document.getElementById('det-obs').textContent = currentEntrega.observacoes
    document.getElementById('det-obs-container').style.display = 'flex'
  } else {
    document.getElementById('det-obs-container').style.display = 'none'
  }

  // Controlar botões de status
  const btnAceitar = document.getElementById('btn-aceitar')
  const btnConcluir = document.getElementById('btn-concluir')

  btnAceitar.style.display =
    currentEntrega.status === 'aguardando' ? 'block' : 'none'
  btnConcluir.style.display =
    currentEntrega.status === 'em_rota' ? 'block' : 'none'

  // Esconder seções
  document.getElementById('map-section').style.display = 'none'
  document.getElementById('chat-section').style.display = 'none'

  openModal('modal-detalhes')
}

// Atualizar status
async function atualizarStatus(novoStatus) {
  if (!currentEntrega) return

  const confirmMsg =
    novoStatus === 'em_rota'
      ? 'Aceitar e iniciar esta entrega?'
      : novoStatus === 'entregue'
      ? 'Marcar como entregue?'
      : 'Atualizar status?'

  if (!confirm(confirmMsg)) return

  try {
    // O corpo da requisição agora só precisa do status.
    const requestBody = { status: novoStatus }

    const response = await fetchWithAuth(
      `${API_URL}/encomendas/${currentEntrega.id_encomenda}/status`,
      {
        method: 'PUT',
        body: JSON.stringify(requestBody),
      }
    )

    if (response.ok) {
      showToast('Status atualizado com sucesso!', 'success')
      closeModal('modal-detalhes')
      loadEntregas()

      // Se iniciou entrega, ativar localização
      if (novoStatus === 'em_rota' && !isLocationActive) {
        toggleLocationSharing()
      }
    } else {
      const data = await response.json()
      showToast(data.message || 'Erro ao atualizar status', 'error')
    }
  } catch (error) {
    console.error('Erro:', error)
    showToast('Erro ao atualizar status', 'error')
  }
}

// Abrir mapa
async function openMapModal() {
  const mapSection = document.getElementById('map-section')
  mapSection.style.display = 'block'

  console.log('🗺️ [ENTREGADOR] Abrindo mapa para entrega:', currentEntrega)

  // Aguardar o DOM atualizar antes de inicializar/redimensionar o mapa
  setTimeout(async () => {
    if (!mapManager) {
      mapManager = new MapManager('map')
      mapManager.init()
    } else {
      // Se o mapa já existe, apenas redimensionar
      mapManager.resize()
    }

    mapManager.getUserLocation(async (error, myLocation) => {
      if (error) {
        console.error('❌ [ENTREGADOR] Erro ao obter localização:', error)
        showToast('Erro ao obter localização', 'error')
        return
      }

      console.log('📍 [ENTREGADOR] Localização do entregador:', myLocation)

      // Limpar marcadores anteriores
      mapManager.clearMarkers()
      mapManager.clearRoute()

      // Adicionar marcador do entregador
      mapManager.addMarker('entregador', myLocation.lat, myLocation.lng, {
        icon: 'delivery',
        popup: 'Você está aqui',
      })
      console.log('✅ [ENTREGADOR] Marcador do entregador adicionado')

      // ===== USAR COORDENADAS SALVAS DO CLIENTE =====
      console.log('🔍 [ENTREGADOR] Verificando coordenadas salvas...')
      console.log('🔍 [ENTREGADOR] lat_cliente:', currentEntrega.lat_cliente)
      console.log('🔍 [ENTREGADOR] lng_cliente:', currentEntrega.lng_cliente)

      // Verificar se tem coordenadas salvas
      if (currentEntrega.lat_cliente && currentEntrega.lng_cliente) {
        console.log('✅ [ENTREGADOR] Usando coordenadas salvas do cliente!')

        try {
          const clientLocation = {
            lat: parseFloat(currentEntrega.lat_cliente),
            lng: parseFloat(currentEntrega.lng_cliente),
          }

          console.log('📍 [ENTREGADOR] Coordenadas do cliente:', clientLocation)

          // Adicionar marcador do cliente
          mapManager.addMarker(
            'cliente',
            clientLocation.lat,
            clientLocation.lng,
            {
              icon: 'destination',
              popup: `Cliente: ${currentEntrega.nome_cliente}`,
            }
          )
          console.log('✅ [ENTREGADOR] Marcador do cliente adicionado')

          // Calcular e desenhar rota
          console.log('🛣️ [ENTREGADOR] Calculando rota...')
          const route = await calculateRoute(
            myLocation.lat,
            myLocation.lng,
            clientLocation.lat,
            clientLocation.lng
          )

          console.log('✅ [ENTREGADOR] Rota calculada:', route)

          // Desenhar rota no mapa
          mapManager.drawRoute(route.coordinates, '#2563eb')
          console.log('✅ [ENTREGADOR] Rota desenhada no mapa')

          // Atualizar informações de distância e tempo
          document.getElementById('map-distance').textContent = formatDistance(
            route.distance
          )
          document.getElementById('map-time').textContent = formatDuration(
            route.duration
          )

          console.log(
            '✅ [ENTREGADOR] Informações de distância e tempo atualizadas'
          )

          // Ajustar zoom para mostrar ambos os marcadores
          mapManager.fitAllMarkers()
          console.log(
            '✅ [ENTREGADOR] Zoom ajustado para mostrar todos os marcadores'
          )

          showToast('Rota calculada com sucesso!', 'success')
        } catch (error) {
          console.error('❌ [ENTREGADOR] Erro ao processar coordenadas:', error)
          showToast('Erro ao calcular rota', 'error')
          mapManager.centerMap(myLocation.lat, myLocation.lng, 15)
        }
      }
      // ===== FALLBACK: GEOCODIFICAR ENDEREÇO =====
      else if (
        currentEntrega.tipo_entrega === 'agendada' &&
        currentEntrega.endereco_entrega &&
        currentEntrega.endereco_entrega.trim() !== ''
      ) {
        console.log(
          '⚠️ [ENTREGADOR] Coordenadas não disponíveis, usando fallback de geocodificação'
        )

        try {
          // Geocodificar o endereço do cliente como fallback
          console.log(
            '🔍 [ENTREGADOR] Geocodificando endereço:',
            currentEntrega.endereco_entrega
          )
          showToast('Localizando endereço do cliente...', 'info')

          const clientLocation = await geocodeAddress(
            currentEntrega.endereco_entrega
          )

          console.log('✅ [ENTREGADOR] Endereço geocodificado:', clientLocation)

          // Adicionar marcador do cliente
          mapManager.addMarker(
            'cliente',
            clientLocation.lat,
            clientLocation.lng,
            {
              icon: 'destination',
              popup: `Cliente: ${currentEntrega.nome_cliente}`,
            }
          )

          console.log(
            '✅ [ENTREGADOR] Marcador do cliente adicionado (fallback)'
          )

          // Calcular e desenhar rota
          const route = await calculateRoute(
            myLocation.lat,
            myLocation.lng,
            clientLocation.lat,
            clientLocation.lng
          )

          // Desenhar rota no mapa
          mapManager.drawRoute(route.coordinates, '#2563eb')

          // Atualizar informações de distância e tempo
          document.getElementById('map-distance').textContent = formatDistance(
            route.distance
          )
          document.getElementById('map-time').textContent = formatDuration(
            route.duration
          )

          // Ajustar zoom para mostrar ambos os marcadores
          mapManager.fitAllMarkers()

          showToast(
            'Rota calculada com sucesso! (usando geocodificação)',
            'success'
          )
        } catch (error) {
          console.error('❌ [ENTREGADOR] Erro ao processar endereço:', error)
          showToast(
            'Não foi possível localizar o endereço do cliente',
            'warning'
          )
          // Centralizar apenas no entregador
          mapManager.centerMap(myLocation.lat, myLocation.lng, 15)
        }
      }
      // ===== SEM LOCALIZAÇÃO DISPONÍVEL =====
      else {
        console.log(
          'ℹ️ [ENTREGADOR] Entrega móvel ou sem localização - apenas marcador do entregador'
        )
        // Para entregas móveis ou sem localização, apenas centralizar no entregador
        mapManager.centerMap(myLocation.lat, myLocation.lng, 15)
        document.getElementById('map-distance').textContent =
          currentEntrega.tipo_entrega === 'movel'
            ? 'Entrega no local atual do cliente'
            : 'Localização não disponível'
        document.getElementById('map-time').textContent =
          currentEntrega.tipo_entrega === 'movel'
            ? 'Aguardando localização do cliente'
            : '-'
      }
    })
  }, 200)
}

// Abrir chat
function openChatModal() {
  console.log('🔵 [ENTREGADOR] Abrindo chat modal')
  console.log('🔵 [ENTREGADOR] Entrega atual:', currentEntrega)
  console.log('🔵 [ENTREGADOR] Socket existe?', !!socket)
  console.log('🔵 [ENTREGADOR] ChatManager existe?', !!chatManager)

  const chatSection = document.getElementById('chat-section')
  if (!chatSection) {
    console.error('❌ [ENTREGADOR] Seção de chat não encontrada!')
    showToast('Erro ao abrir chat', 'error')
    return
  }

  chatSection.style.display = 'block'

  // Verificar se socket está conectado
  if (!socket || !socket.connected) {
    console.warn('⚠️ [ENTREGADOR] Socket não conectado, reconectando...')
    socket = connectSocket()

    // Aguardar conexão
    setTimeout(() => {
      initializeChatManager()
    }, 1000)
  } else {
    initializeChatManager()
  }
}

// Função auxiliar para inicializar o chat manager
function initializeChatManager() {
  // Destruir chat anterior se existir
  if (chatManager) {
    console.log('🔄 [ENTREGADOR] Destruindo chat anterior')
    chatManager.destroy()
    chatManager = null
  }

  // Criar nova instância
  console.log('🆕 [ENTREGADOR] Criando nova instância do ChatManager')
  chatManager = new ChatManager('chat-container', socket)

  // Abrir chat para esta entrega
  console.log(
    '📂 [ENTREGADOR] Abrindo chat para entrega:',
    currentEntrega.id_encomenda
  )
  chatManager.openChat(
    currentEntrega.id_encomenda,
    currentEntrega.nome_cliente || 'Cliente'
  )
}

// Alternar compartilhamento de localização
function toggleLocationSharing() {
  if (isLocationActive) {
    // Desativar
    if (locationWatchId) {
      navigator.geolocation.clearWatch(locationWatchId)
      locationWatchId = null
    }
    isLocationActive = false
    document.getElementById('location-status').classList.remove('active')
    document.getElementById('location-text').textContent =
      'Localização desativada'
    document.getElementById('btn-toggle-location').innerHTML =
      '<i class="fas fa-map-marker-alt"></i> Ativar Localização'
    showToast('Compartilhamento de localização desativado', 'info')
  } else {
    // Ativar
    if ('geolocation' in navigator) {
      locationWatchId = navigator.geolocation.watchPosition(
        (position) => {
          const lat = position.coords.latitude
          const lng = position.coords.longitude

          // Enviar localização via Socket.IO
          socket.emit('atualizar_localizacao', {
            latitude: lat,
            longitude: lng,
          })
        },
        (error) => {
          console.error('Erro de geolocalização:', error)
          showToast('Erro ao obter localização', 'error')
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0,
        }
      )

      isLocationActive = true
      document.getElementById('location-status').classList.add('active')
      document.getElementById('location-text').textContent = 'Localização ativa'
      document.getElementById('btn-toggle-location').innerHTML =
        '<i class="fas fa-map-marker-alt"></i> Desativar Localização'
      showToast('Compartilhamento de localização ativado', 'success')
    } else {
      showToast('Geolocalização não suportada', 'error')
    }
  }
}

// Carregar histórico
async function loadHistorico() {
  const container = document.getElementById('historico-list')

  // Mostrar loading
  container.innerHTML = `
    <div class="loading-container">
      <div class="loading"></div>
      <p>Carregando histórico...</p>
    </div>
  `

  const dataInicio = document.getElementById('filter-hist-data-inicio').value
  const dataFim = document.getElementById('filter-hist-data-fim').value
  const tipoFiltro = document.getElementById('filter-hist-tipo').value

  let url = `${API_URL}/encomendas/historico`
  const params = new URLSearchParams()

  if (dataInicio) params.append('data_inicio', dataInicio)
  if (dataFim) params.append('data_fim', dataFim)

  if (params.toString()) url += `?${params.toString()}`

  try {
    const response = await fetchWithAuth(url, { method: 'GET' })

    if (response.ok) {
      const data = await response.json()
      console.log('Dados do histórico recebidos:', data)

      // Usar extractApiData para tratamento consistente
      // O backend retorna { success: true, data: { historico: [...] } }
      historico = extractApiData(data, 'historico')

      // Aplicar filtro de tipo se selecionado
      if (tipoFiltro) {
        historico = historico.filter((e) => e.tipo_entrega === tipoFiltro)
      }

      console.log('Histórico carregado:', historico.length, 'entregas')
      renderHistorico()
      updateHistoricoStats()
    } else {
      const errorData = await response.json()
      showToast(
        getApiErrorMessage(errorData, 'Erro ao carregar histórico'),
        'error'
      )
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-exclamation-circle"></i>
          <h3>Erro ao carregar histórico</h3>
          <p>Tente novamente mais tarde</p>
        </div>
      `
    }
  } catch (error) {
    console.error('Erro ao carregar histórico:', error)
    showToast('Erro ao conectar com o servidor', 'error')
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-exclamation-circle"></i>
        <h3>Erro ao carregar histórico</h3>
        <p>Verifique sua conexão e tente novamente</p>
      </div>
    `
  }
}

// Renderizar histórico
function renderHistorico() {
  const container = document.getElementById('historico-list')

  if (historico.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-history"></i>
        <h3>Nenhuma entrega no histórico</h3>
        <p>Suas entregas concluídas aparecerão aqui</p>
      </div>
    `
    return
  }

  container.innerHTML = `
    <table class="historico-table">
      <thead>
        <tr>
          <th>Código</th>
          <th>Cliente</th>
          <th>Loja</th>
          <th>Tipo</th>
          <th>Valor</th>
          <th>Data</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${historico
          .map((entrega) => {
            const tipoEntrega =
              entrega.tipo_entrega === 'agendada'
                ? 'Agendada'
                : entrega.tipo_entrega === 'movel'
                ? 'Móvel'
                : entrega.tipo_entrega || 'N/D'

            return `
              <tr onclick="verDetalhesHistorico(${entrega.id_encomenda})">
                <td>#${entrega.codigo_rastreio || entrega.id_encomenda}</td>
                <td>${entrega.nome_cliente}</td>
                <td>${entrega.loja_origem}</td>
                <td>${tipoEntrega}</td>
                <td>R$ ${parseFloat(entrega.valor).toFixed(2)}</td>
                <td>${formatDate(entrega.atualizado_em)}</td>
                <td><span class="status-badge entregue">Entregue</span></td>
              </tr>
            `
          })
          .join('')}
      </tbody>
    </table>
  `
}

// Ver detalhes de entrega do histórico
function verDetalhesHistorico(idEncomenda) {
  const entrega = historico.find((e) => e.id_encomenda === idEncomenda)

  if (!entrega) {
    showToast('Entrega não encontrada', 'error')
    return
  }

  // Usar a mesma função de detalhes, mas sem botões de ação
  currentEntrega = entrega

  // Preencher informações
  document.getElementById('det-codigo').textContent =
    entrega.codigo_rastreio || `#${entrega.id_encomenda}`
  document.getElementById('det-cliente').textContent = entrega.nome_cliente
  document.getElementById('det-loja').textContent = entrega.loja_origem
  document.getElementById('det-valor').textContent = `R$ ${parseFloat(
    entrega.valor
  ).toFixed(2)}`

  const status = formatStatus('entregue')
  document.getElementById(
    'det-status'
  ).innerHTML = `<span class="entrega-status ${status.class}">${status.text}</span>`

  const tipoEntregaTexto =
    entrega.tipo_entrega === 'agendada'
      ? 'Agendada'
      : entrega.tipo_entrega === 'movel'
      ? 'Móvel'
      : entrega.tipo_entrega || 'Não definido'
  document.getElementById('det-tipo').textContent = tipoEntregaTexto

  // Endereço e agendamento
  if (entrega.tipo_entrega === 'agendada') {
    document.getElementById('det-endereco').textContent =
      entrega.endereco_entrega || 'Não informado'
    document.getElementById('det-endereco-container').style.display = 'flex'

    if (entrega.data_agendada) {
      document.getElementById('det-agendamento').textContent = formatDate(
        entrega.data_agendada
      )
      document.getElementById('det-agendamento-container').style.display =
        'flex'
    } else {
      document.getElementById('det-agendamento-container').style.display =
        'none'
    }
  } else {
    document.getElementById('det-endereco-container').style.display = 'none'
    document.getElementById('det-agendamento-container').style.display = 'none'
  }

  // Observações
  if (entrega.observacoes) {
    document.getElementById('det-obs').textContent = entrega.observacoes
    document.getElementById('det-obs-container').style.display = 'flex'
  } else {
    document.getElementById('det-obs-container').style.display = 'none'
  }

  // Esconder botões de ação (entrega já concluída)
  document.getElementById('btn-aceitar').style.display = 'none'
  document.getElementById('btn-concluir').style.display = 'none'

  // Esconder seções
  document.getElementById('map-section').style.display = 'none'
  document.getElementById('chat-section').style.display = 'none'

  openModal('modal-detalhes')
}

// Atualizar estatísticas do histórico
function updateHistoricoStats() {
  const total = historico.length
  const agendadas = historico.filter(
    (e) => e.tipo_entrega === 'agendada'
  ).length
  const moveis = historico.filter((e) => e.tipo_entrega === 'movel').length
  const valorTotal = historico.reduce(
    (sum, e) => sum + parseFloat(e.valor || 0),
    0
  )

  document.getElementById('stat-hist-total').textContent = total
  document.getElementById('stat-hist-agendadas').textContent = agendadas
  document.getElementById('stat-hist-moveis').textContent = moveis
  document.getElementById(
    'stat-hist-valor'
  ).textContent = `R$ ${valorTotal.toFixed(2)}`
}

// Limpar filtros do histórico
function clearHistoricoFilters() {
  document.getElementById('filter-hist-data-inicio').value = ''
  document.getElementById('filter-hist-data-fim').value = ''
  document.getElementById('filter-hist-tipo').value = ''
  loadHistorico()
}

// Atualizar estatísticas rápidas
function updateQuickStats() {
  const pendentes = entregas.filter((e) => e.status === 'aguardando').length
  const emRota = entregas.filter((e) => e.status === 'em_rota').length

  // Contar entregas de hoje
  const hoje = new Date().toDateString()
  const concluidasHoje = entregas.filter((e) => {
    if (e.status === 'entregue' && e.atualizado_em) {
      return new Date(e.atualizado_em).toDateString() === hoje
    }
    return false
  }).length

  document.getElementById('stat-pendentes').textContent = pendentes
  document.getElementById('stat-em-rota').textContent = emRota
  document.getElementById('stat-concluidas-hoje').textContent = concluidasHoje

  // Estatísticas do perfil
  const totalEntregas = entregas.length
  const concluidas = entregas.filter((e) => e.status === 'entregue').length

  document.getElementById('stat-total-entregas').textContent = totalEntregas
  document.getElementById('stat-concluidas').textContent = concluidas
}

// Mostrar seção
function showSection(sectionName) {
  document.querySelectorAll('.dashboard-section').forEach((section) => {
    section.classList.remove('active')
  })

  document.querySelectorAll('.nav-link').forEach((link) => {
    link.classList.remove('active')
  })

  const section = document.getElementById(`section-${sectionName}`)
  if (section) {
    section.classList.add('active')
  }

  const activeLink = document.querySelector(
    `.nav-link[onclick*="${sectionName}"]`
  )
  if (activeLink) {
    activeLink.classList.add('active')
  }

  // Carregar dados específicos da seção
  if (sectionName === 'historico') {
    loadHistorico()
  }
}

// Abrir/Fechar modal
function openModal(modalId) {
  const modal = document.getElementById(modalId)
  if (modal) modal.classList.add('active')
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId)
  if (modal) modal.classList.remove('active')

  if (mapManager) {
    mapManager.clearMarkers()
    mapManager.clearRoute()
  }

  if (chatManager) {
    chatManager.closeChat()
  }
}

// Fechar modal ao clicar fora
window.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal')) {
    e.target.classList.remove('active')
  }
})

// Inicializar Socket.IO
function initializeSocket() {
  // Conectar ao socket
  if (!socket) {
    socket = connectSocket()
  }

  if (!socket) {
    console.error('Falha ao conectar Socket.IO')
    return
  }

  // Escutar nova entrega atribuída
  socket.on('nova_entrega_atribuida', (data) => {
    console.log('Nova entrega atribuída:', data)
    showToast('Nova entrega atribuída!', 'success')
    loadEntregas()
  })

  // Escutar entrega cancelada
  socket.on('entrega_cancelada', (data) => {
    console.log('Entrega cancelada:', data)
    showToast('Uma entrega foi cancelada', 'info')
    loadEntregas()
  })
}
