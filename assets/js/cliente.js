// ===== DASHBOARD DO CLIENTE =====

// Verificar autenticação
if (!checkAuth('cliente')) {
  window.location.href = 'login.html'
}

// Variáveis globais
let encomendas = []
let currentEncomenda = null
let mapManager = null
let chatManager = null
let locationWatchId = null
let locationPickerMap = null
let selectedLocation = null

// Inicializar ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
  loadUserInfo()
  loadEncomendas()
  setupFormListeners()
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
  }
}

// Carregar encomendas
async function loadEncomendas() {
  const loadingText = document.getElementById('loading-text')
  const originalText = loadingText ? loadingText.textContent : ''

  try {
    if (loadingText) {
      loadingText.textContent = 'Conectando ao servidor...'
    }
    logApiDebug('Carregando encomendas', 'Iniciando requisição')

    const result = await fetchApi(
      `${API_URL}/encomendas/minhas`,
      { method: 'GET' },
      'encomendas'
    )

    if (result.success) {
      encomendas = ensureArray(result.data)
      logApiDebug('Encomendas carregadas', `${encomendas.length} itens`)
      renderEncomendas()
      updateStats()
    } else {
      console.error('Erro ao carregar encomendas:', result.message)
      showToast(result.message || 'Erro ao carregar encomendas', 'error')
      encomendas = []
      renderEncomendas()
    }
  } catch (error) {
    console.error('Erro ao carregar encomendas:', error)
    showToast(
      'Erro ao conectar com o servidor. O serviço pode estar inicializando.',
      'error'
    )
    encomendas = []
    renderEncomendas()
  } finally {
    if (loadingText && originalText) {
      loadingText.textContent = originalText
    }
  }
}

// Renderizar encomendas
function renderEncomendas() {
  const container = document.getElementById('encomendas-list')

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
    `
    return
  }

  container.innerHTML = encomendas
    .map((encomenda) => {
      const status = formatStatus(encomenda.status)
      const tipoEntrega =
        encomenda.tipo_entrega === 'agendada' ? 'Agendada' : 'Móvel'

      return `
      <div class="encomenda-card status-${
        encomenda.status
      }" onclick="verDetalhes(${encomenda.id_encomenda})">
        <div class="encomenda-header">
          <div class="encomenda-codigo">#${
            encomenda.codigo_rastreio || encomenda.id_encomenda
          }</div>
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
          ${
            encomenda.nome_entregador
              ? `
            <div class="info-row">
              <i class="fas fa-user"></i>
              <span>${encomenda.nome_entregador}</span>
            </div>
          `
              : ''
          }
        </div>
        <div class="encomenda-footer">
          <span class="encomenda-date">
            <i class="fas fa-calendar"></i>
            ${formatDate(encomenda.criado_em)}
          </span>
          <button class="btn btn-primary btn-sm btn-ver-detalhes">Ver Detalhes</button>
        </div>
      </div>
    `
    })
    .join('')
}

// Filtrar encomendas
function filterEncomendas() {
  const statusFilter = document.getElementById('filter-status').value
  const searchTerm = document
    .getElementById('search-encomenda')
    .value.toLowerCase()

  const filtered = encomendas.filter((encomenda) => {
    const matchStatus = !statusFilter || encomenda.status === statusFilter
    const matchSearch =
      !searchTerm ||
      (encomenda.codigo_rastreio &&
        encomenda.codigo_rastreio.toLowerCase().includes(searchTerm)) ||
      encomenda.loja_origem.toLowerCase().includes(searchTerm)
    return matchStatus && matchSearch
  })

  const container = document.getElementById('encomendas-list')

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-search"></i>
        <h3>Nenhuma encomenda encontrada</h3>
        <p>Tente ajustar os filtros de busca</p>
      </div>
    `
    return
  }

  const tempEncomendas = encomendas
  encomendas = filtered
  renderEncomendas()
  encomendas = tempEncomendas
}

// Ver detalhes da encomenda
async function verDetalhes(idEncomenda) {
  currentEncomenda = encomendas.find((e) => e.id_encomenda === idEncomenda)

  if (!currentEncomenda) {
    showToast('Encomenda não encontrada', 'error')
    return
  }

  document.getElementById('det-codigo').textContent =
    currentEncomenda.codigo_rastreio || `#${currentEncomenda.id_encomenda}`
  document.getElementById('det-loja').textContent = currentEncomenda.loja_origem
  document.getElementById('det-valor').textContent = `R$ ${parseFloat(
    currentEncomenda.valor
  ).toFixed(2)}`

  const status = formatStatus(currentEncomenda.status)
  document.getElementById(
    'det-status'
  ).innerHTML = `<span class="encomenda-status ${status.class}">${status.text}</span>`

  document.getElementById('det-tipo').textContent =
    currentEncomenda.tipo_entrega === 'agendada' ? 'Agendada' : 'Móvel'
  document.getElementById('det-entregador').textContent =
    currentEncomenda.nome_entregador || 'Não atribuído'
  document.getElementById('det-criado').textContent = formatDate(
    currentEncomenda.criado_em
  )

  if (currentEncomenda.observacoes) {
    document.getElementById('det-obs').textContent =
      currentEncomenda.observacoes
    document.getElementById('det-obs-container').style.display = 'flex'
  } else {
    document.getElementById('det-obs-container').style.display = 'none'
  }

  const btnRastrear = document.getElementById('btn-rastrear')
  const btnChat = document.getElementById('btn-chat')
  const btnCancelar = document.getElementById('btn-cancelar')

  btnRastrear.style.display =
    currentEncomenda.id_entregador && currentEncomenda.status === 'em_rota'
      ? 'block'
      : 'none'
  btnChat.style.display = currentEncomenda.id_entregador ? 'block' : 'none'
  btnCancelar.style.display =
    currentEncomenda.status === 'aguardando' ? 'block' : 'none'

  document.getElementById('tracking-section').style.display = 'none'
  document.getElementById('chat-section').style.display = 'none'

  openModal('modal-detalhes')
}

// Mostrar rastreamento
function showTracking() {
  const trackingSection = document.getElementById('tracking-section')
  trackingSection.style.display = 'block'

  setTimeout(() => {
    if (!mapManager) {
      mapManager = new MapManager('map')
      mapManager.init()
    } else {
      mapManager.resize()
    }

    mapManager.getUserLocation((error, clientLocation) => {
      if (error) {
        showToast('Erro ao obter sua localização', 'error')
        return
      }

      mapManager.addMarker('cliente', clientLocation.lat, clientLocation.lng, {
        icon: 'user',
        popup: 'Você está aqui',
      })

      if (
        currentEncomenda.latitude_entregador &&
        currentEncomenda.longitude_entregador
      ) {
        mapManager.addMarker(
          'entregador',
          currentEncomenda.latitude_entregador,
          currentEncomenda.longitude_entregador,
          {
            icon: 'delivery',
            popup: `Entregador: ${currentEncomenda.nome_entregador}`,
          }
        )

        mapManager.drawRoute([
          [
            currentEncomenda.latitude_entregador,
            currentEncomenda.longitude_entregador,
          ],
          [clientLocation.lat, clientLocation.lng],
        ])

        const distance = mapManager.calculateDistance(
          currentEncomenda.latitude_entregador,
          currentEncomenda.longitude_entregador,
          clientLocation.lat,
          clientLocation.lng
        )
        document.getElementById(
          'tracking-distance'
        ).textContent = `${distance.toFixed(2)} km`

        const timeMinutes = Math.round((distance / 30) * 60)
        document.getElementById(
          'tracking-time'
        ).textContent = `${timeMinutes} minutos`

        mapManager.fitAllMarkers()
      } else {
        mapManager.centerMap(clientLocation.lat, clientLocation.lng, 15)
        document.getElementById('tracking-distance').textContent =
          'Aguardando localização do entregador'
        document.getElementById('tracking-time').textContent = 'Aguardando'
      }
    })
  }, 300)

  socket.on('atualizacao_localizacao', (data) => {
    if (data.id_encomenda === currentEncomenda.id_encomenda) {
      mapManager.updateMarker('entregador', data.latitude, data.longitude, true)

      mapManager.getUserLocation((error, clientLocation) => {
        if (!error) {
          const distance = mapManager.calculateDistance(
            data.latitude,
            data.longitude,
            clientLocation.lat,
            clientLocation.lng
          )
          document.getElementById(
            'tracking-distance'
          ).textContent = `${distance.toFixed(2)} km`
          const timeMinutes = Math.round((distance / 30) * 60)
          document.getElementById(
            'tracking-time'
          ).textContent = `${timeMinutes} minutos`
        }
      })
    }
  })
}

// Abrir chat
function openChatModal() {
  console.log('🔵 [CLIENTE] Abrindo chat modal')
  const chatSection = document.getElementById('chat-section')
  if (!chatSection) {
    console.error('❌ [CLIENTE] Seção de chat não encontrada!')
    showToast('Erro ao abrir chat', 'error')
    return
  }

  chatSection.style.display = 'block'

  if (!socket || !socket.connected) {
    console.warn('⚠️ [CLIENTE] Socket não conectado, reconectando...')
    socket = connectSocket()
    setTimeout(() => initializeChatManager(), 1000)
  } else {
    initializeChatManager()
  }
}

function initializeChatManager() {
  if (chatManager) {
    console.log('🔄 [CLIENTE] Destruindo chat anterior')
    chatManager.destroy()
    chatManager = null
  }

  console.log('🆕 [CLIENTE] Criando nova instância do ChatManager')
  chatManager = new ChatManager('chat-container', socket)
  chatManager.openChat(
    currentEncomenda.id_encomenda,
    currentEncomenda.nome_entregador || 'Entregador'
  )
}

// Cancelar encomenda
async function cancelarEncomenda() {
  if (!confirm('Tem certeza que deseja cancelar esta encomenda?')) return

  try {
    const response = await fetchWithAuth(
      `${API_URL}/encomendas/${currentEncomenda.id_encomenda}/cancelar`,
      { method: 'PUT' }
    )

    if (response.ok) {
      showToast('Encomenda cancelada com sucesso', 'success')
      closeModal('modal-detalhes')
      loadEncomendas()
    } else {
      const data = await response.json()
      showToast(data.message || 'Erro ao cancelar encomenda', 'error')
    }
  } catch (error) {
    console.error('Erro ao cancelar encomenda:', error)
    showToast('Erro ao cancelar encomenda', 'error')
  }
}

// Configurar listeners dos formulários
function setupFormListeners() {
  const formNovaEncomenda = document.getElementById('form-nova-encomenda')
  if (formNovaEncomenda) {
    formNovaEncomenda.addEventListener('submit', async (e) => {
      e.preventDefault()
      await criarEncomenda()
    })
  }
}

// Alternar campos de entrega
function toggleEntregaFields() {
  const tipoEntrega = document.getElementById('tipo_entrega').value
  const agendadaFields = document.getElementById('agendada-fields')
  const movelFields = document.getElementById('movel-fields')
  const dataAgendada = document.getElementById('data_agendada')
  const enderecoEntrega = document.getElementById('endereco_entrega')

  if (tipoEntrega === 'agendada') {
    agendadaFields.style.display = 'block'
    movelFields.style.display = 'none'
    dataAgendada.required = true
    enderecoEntrega.required = true

    const now = new Date()
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
    dataAgendada.min = now.toISOString().slice(0, 16)

    console.log('✅ [CLIENTE] Campos de entrega agendada ativados')
  } else if (tipoEntrega === 'movel') {
    agendadaFields.style.display = 'none'
    movelFields.style.display = 'block'
    dataAgendada.required = false
    enderecoEntrega.required = false
    console.log('✅ [CLIENTE] Campos de entrega móvel ativados')
  } else {
    agendadaFields.style.display = 'none'
    movelFields.style.display = 'none'
    dataAgendada.required = false
    enderecoEntrega.required = false
  }
}

// Criar nova encomenda
async function criarEncomenda() {
  const tipoEntrega = document.getElementById('tipo_entrega').value

  console.log('🔍 [CLIENTE] Tipo de entrega selecionado:', tipoEntrega)

  if (!tipoEntrega || tipoEntrega === '') {
    showToast('Por favor, selecione o tipo de entrega', 'error')
    console.error('❌ [CLIENTE] Tipo de entrega não selecionado')
    return
  }

  const lojaOrigem = document.getElementById('loja_origem').value.trim()
  const valor = document.getElementById('valor').value

  if (!lojaOrigem) {
    showToast('Por favor, informe a loja de origem', 'error')
    return
  }

  if (!valor || parseFloat(valor) <= 0) {
    showToast('Por favor, informe um valor válido', 'error')
    return
  }

  const encomendaData = {
    codigo_rastreio:
      document.getElementById('codigo_rastreio').value.trim() || null,
    loja_origem: lojaOrigem,
    valor: parseFloat(valor),
    tipo_entrega: tipoEntrega,
    observacoes: document.getElementById('observacoes').value.trim() || null,
  }

  // ===== TRATAMENTO PARA ENTREGA AGENDADA =====
  if (tipoEntrega === 'agendada') {
    const dataAgendada = document.getElementById('data_agendada').value

    if (!dataAgendada) {
      showToast('Por favor, informe a data e hora da entrega', 'error')
      console.error('❌ [CLIENTE] Data agendada não informada')
      return
    }

    // Validar se a data não está no passado
    const dataEscolhida = new Date(dataAgendada)
    const agora = new Date()

    if (dataEscolhida <= agora) {
      showToast('A data de entrega deve ser futura', 'error')
      console.error('❌ [CLIENTE] Data de entrega no passado')
      return
    }

    // Coletar dados dos campos separados
    const rua = document.getElementById('rua').value.trim()
    const numero = document.getElementById('numero').value.trim()
    const bairro = document.getElementById('bairro').value.trim()
    const cidade = document.getElementById('cidade').value.trim()

    // Verificar se campos foram preenchidos
    if (!rua || !numero || !bairro || !cidade) {
      showToast('Por favor, preencha todos os campos de endereço', 'error')
      console.error('❌ [CLIENTE] Campos de endereço incompletos')
      return
    }

    // Verificar se já tem coordenadas (selecionadas no mapa)
    let lat = document.getElementById('lat_cliente').value
    let lng = document.getElementById('lng_cliente').value

    // Se não tem coordenadas, geocodificar o endereço
    if (!lat || !lng) {
      console.log(
        '🔍 [CLIENTE] Coordenadas não encontradas, geocodificando endereço...'
      )
      const location = await geocodeFromFields()

      if (location) {
        lat = location.lat
        lng = location.lng
      } else {
        showToast(
          'Não foi possível obter as coordenadas do endereço. Tente selecionar no mapa.',
          'warning'
        )
        // Continuar mesmo sem coordenadas (backend pode lidar com isso)
      }
    }

    // Montar endereço completo
    const enderecoCompleto = `${rua}, ${numero}, ${bairro}, ${cidade}`

    // Adicionar dados de entrega agendada
    encomendaData.data_agendada = new Date(dataAgendada).toISOString()
    encomendaData.endereco_entrega = enderecoCompleto
    encomendaData.rua = rua
    encomendaData.numero = numero
    encomendaData.bairro = bairro
    encomendaData.cidade = cidade

    if (lat && lng) {
      encomendaData.lat_cliente = parseFloat(lat)
      encomendaData.lng_cliente = parseFloat(lng)
    }

    console.log('📅 [CLIENTE] Dados de entrega agendada:', {
      endereco: enderecoCompleto,
      coordenadas: lat && lng ? { lat, lng } : 'Não disponível',
    })
  }

  // ===== TRATAMENTO PARA ENTREGA MÓVEL =====
  else if (tipoEntrega === 'movel') {
    console.log(
      '📍 [CLIENTE] Capturando localização atual para entrega móvel...'
    )

    try {
      const locationData = await captureCurrentLocation()

      // Adicionar dados de localização
      encomendaData.lat_cliente = locationData.lat
      encomendaData.lng_cliente = locationData.lng
      encomendaData.rua = locationData.rua
      encomendaData.numero = locationData.numero
      encomendaData.bairro = locationData.bairro
      encomendaData.cidade = locationData.cidade
      encomendaData.endereco_entrega = locationData.address

      console.log('✅ [CLIENTE] Localização capturada:', locationData)
      showToast('Localização capturada com sucesso!', 'success')
    } catch (error) {
      console.error('❌ [CLIENTE] Erro ao capturar localização:', error)
      showToast(
        'Não foi possível capturar sua localização. Por favor, permita o acesso.',
        'error'
      )
      return
    }
  }

  console.log(
    '📦 [CLIENTE] Dados completos da encomenda a serem enviados:',
    JSON.stringify(encomendaData, null, 2)
  )

  try {
    const response = await fetchWithAuth(`${API_URL}/encomendas`, {
      method: 'POST',
      body: JSON.stringify(encomendaData),
    })

    console.log('📡 [CLIENTE] Status da resposta:', response.status)

    if (response.ok) {
      const responseData = await response.json()
      console.log('✅ [CLIENTE] Encomenda criada com sucesso:', responseData)

      showToast(
        `Encomenda criada com sucesso! Tipo: ${
          tipoEntrega === 'agendada' ? 'Agendada' : 'Móvel'
        }`,
        'success'
      )

      // Limpar formulário e campos ocultos
      document.getElementById('form-nova-encomenda').reset()
      document.getElementById('lat_cliente').value = ''
      document.getElementById('lng_cliente').value = ''
      document.getElementById('location-indicator').style.display = 'none'

      toggleEntregaFields()
      showSection('encomendas')
      loadEncomendas()
    } else {
      const data = await response.json()
      console.error('❌ [CLIENTE] Erro na resposta:', data)
      showToast(data.message || 'Erro ao criar encomenda', 'error')
    }
  } catch (error) {
    console.error('❌ [CLIENTE] Erro ao criar encomenda:', error)
    showToast('Erro ao conectar com o servidor', 'error')
  }
}

// Atualizar estatísticas
function updateStats() {
  const total = encomendas.length
  const aguardando = encomendas.filter((e) => e.status === 'aguardando').length
  const emRota = encomendas.filter((e) => e.status === 'em_rota').length
  const entregue = encomendas.filter((e) => e.status === 'entregue').length

  document.getElementById('stat-total').textContent = total
  document.getElementById('stat-aguardando').textContent = aguardando
  document.getElementById('stat-em-rota').textContent = emRota
  document.getElementById('stat-entregue').textContent = entregue
}

// Mostrar seção
function showSection(sectionName) {
  document
    .querySelectorAll('.dashboard-section')
    .forEach((section) => section.classList.remove('active'))
  document
    .querySelectorAll('.nav-link')
    .forEach((link) => link.classList.remove('active'))

  const section = document.getElementById(`section-${sectionName}`)
  if (section) section.classList.add('active')

  const activeLink = document.querySelector(
    `.nav-link[onclick*="${sectionName}"]`
  )
  if (activeLink) activeLink.classList.add('active')
}

// Abrir modal
function openModal(modalId) {
  const modal = document.getElementById(modalId)
  if (modal) modal.classList.add('active')
}

// Fechar modal
function closeModal(modalId) {
  const modal = document.getElementById(modalId)
  if (modal) modal.classList.remove('active')

  if (mapManager) {
    mapManager.clearMarkers()
    mapManager.clearRoute()
  }

  if (chatManager) chatManager.closeChat()
}

// Fechar modal ao clicar fora
window.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal')) {
    e.target.classList.remove('active')
  }
})

// Inicializar Socket.IO
function initializeSocket() {
  if (!socket) socket = connectSocket()

  if (!socket) {
    console.error('Falha ao conectar Socket.IO')
    return
  }

  socket.on('encomenda_criada', (data) => {
    console.log('Nova encomenda criada:', data)
    loadEncomendas()
  })

  socket.on('status_atualizado', (data) => {
    console.log('Status atualizado:', data)
    const encomenda = encomendas.find(
      (e) => e.id_encomenda === data.id_encomenda
    )
    if (encomenda) {
      encomenda.status = data.status
      renderEncomendas()
      updateStats()
      showToast(`Status atualizado: ${formatStatus(data.status).text}`, 'info')
    } else {
      loadEncomendas()
    }
  })

  socket.on('entregador_atribuido', (data) => {
    console.log('Entregador atribuído:', data)
    const encomenda = encomendas.find(
      (e) => e.id_encomenda === data.id_encomenda
    )
    if (encomenda) {
      encomenda.id_entregador = data.id_entregador
      encomenda.nome_entregador = data.nome_entregador
      renderEncomendas()
      showToast(`Entregador atribuído: ${data.nome_entregador}`, 'success')
    } else {
      loadEncomendas()
    }
  })
}

// ===== FUNÇÕES DE LOCALIZAÇÃO =====

// Abrir modal de seleção de localização
function openLocationPickerModal() {
  console.log('🗺️ [CLIENTE] Abrindo modal de seleção de localização')

  const modal = document.getElementById('modal-location-picker')
  if (!modal) {
    console.error('❌ [CLIENTE] Modal de localização não encontrado!')
    showToast('Erro ao abrir seletor de localização', 'error')
    return
  }

  // Resetar seleção anterior
  selectedLocation = null
  document.getElementById('selected-address').textContent =
    'Clique no mapa para selecionar'
  document.getElementById('btn-confirm-location').disabled = true

  // Abrir modal
  modal.classList.add('active')

  // Aguardar modal ficar visível antes de inicializar mapa
  setTimeout(() => {
    if (!locationPickerMap) {
      // Criar novo mapa para seleção
      locationPickerMap = L.map('location-picker-map').setView(
        [-23.5505, -46.6333],
        13
      )

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(locationPickerMap)

      // Adicionar evento de clique no mapa
      locationPickerMap.on('click', async (e) => {
        const lat = e.latlng.lat
        const lng = e.latlng.lng

        console.log('📍 [CLIENTE] Localização selecionada:', { lat, lng })

        // Salvar localização selecionada
        selectedLocation = { lat, lng }

        // Limpar marcadores anteriores
        locationPickerMap.eachLayer((layer) => {
          if (layer instanceof L.Marker) {
            locationPickerMap.removeLayer(layer)
          }
        })

        // Adicionar marcador na posição clicada
        L.marker([lat, lng])
          .addTo(locationPickerMap)
          .bindPopup('Localização selecionada')
          .openPopup()

        // Fazer geocodificação reversa para obter endereço
        try {
          showToast('Obtendo endereço...', 'info')
          const address = await reverseGeocode(lat, lng)
          document.getElementById('selected-address').textContent = address
          selectedLocation.address = address

          // Habilitar botão de confirmar
          document.getElementById('btn-confirm-location').disabled = false

          console.log('✅ [CLIENTE] Endereço obtido:', address)
        } catch (error) {
          console.error('❌ [CLIENTE] Erro ao obter endereço:', error)
          document.getElementById(
            'selected-address'
          ).textContent = `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`
          document.getElementById('btn-confirm-location').disabled = false
        }
      })
    } else {
      // Se mapa já existe, apenas redimensionar
      locationPickerMap.invalidateSize()
    }

    // Tentar centralizar no local atual do usuário
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude
          const lng = position.coords.longitude
          locationPickerMap.setView([lat, lng], 15)
          console.log('✅ [CLIENTE] Mapa centralizado na localização atual')
        },
        (error) => {
          console.warn(
            '⚠️ [CLIENTE] Não foi possível obter localização atual:',
            error
          )
        }
      )
    }
  }, 300)
}

// Confirmar localização selecionada
function confirmLocationSelection() {
  if (!selectedLocation) {
    showToast('Por favor, selecione uma localização no mapa', 'error')
    return
  }

  console.log('✅ [CLIENTE] Confirmando localização:', selectedLocation)

  // Preencher campos ocultos com coordenadas
  document.getElementById('lat_cliente').value = selectedLocation.lat
  document.getElementById('lng_cliente').value = selectedLocation.lng

  // Tentar extrair partes do endereço
  if (selectedLocation.address) {
    const addressParts = selectedLocation.address
      .split(',')
      .map((part) => part.trim())

    // Preencher campos de endereço (melhor esforço)
    if (addressParts.length >= 4) {
      document.getElementById('rua').value = addressParts[0] || ''
      document.getElementById('numero').value = addressParts[1] || ''
      document.getElementById('bairro').value = addressParts[2] || ''
      document.getElementById('cidade').value = addressParts[3] || ''
    } else {
      // Se não conseguir separar, colocar endereço completo na rua
      document.getElementById('rua').value = selectedLocation.address
    }

    // Preencher campo oculto de endereço completo
    document.getElementById('endereco_entrega').value = selectedLocation.address
  }

  // Mostrar indicador de sucesso
  document.getElementById('location-indicator').style.display = 'block'

  // Fechar modal
  closeModal('modal-location-picker')

  showToast('Localização selecionada com sucesso!', 'success')
}

// Geocodificar endereço a partir dos campos separados
async function geocodeFromFields() {
  const rua = document.getElementById('rua').value.trim()
  const numero = document.getElementById('numero').value.trim()
  const bairro = document.getElementById('bairro').value.trim()
  const cidade = document.getElementById('cidade').value.trim()

  if (!rua || !numero || !bairro || !cidade) {
    console.warn('⚠️ [CLIENTE] Campos de endereço incompletos')
    return null
  }

  // Concatenar endereço completo
  const enderecoCompleto = `${rua}, ${numero}, ${bairro}, ${cidade}`

  console.log('🔍 [CLIENTE] Geocodificando endereço:', enderecoCompleto)

  try {
    const location = await geocodeAddress(enderecoCompleto)

    console.log('✅ [CLIENTE] Coordenadas obtidas:', location)

    // Salvar coordenadas nos campos ocultos
    document.getElementById('lat_cliente').value = location.lat
    document.getElementById('lng_cliente').value = location.lng
    document.getElementById('endereco_entrega').value =
      location.formatted || enderecoCompleto

    return location
  } catch (error) {
    console.error('❌ [CLIENTE] Erro ao geocodificar:', error)
    showToast('Não foi possível localizar o endereço informado', 'warning')
    return null
  }
}

// Capturar localização atual do cliente (para entregas móveis)
async function captureCurrentLocation() {
  console.log('📍 [CLIENTE] Capturando localização atual...')

  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      const error = 'Geolocalização não suportada pelo navegador'
      console.error('❌ [CLIENTE]', error)
      showToast(error, 'error')
      reject(error)
      return
    }

    showToast('Obtendo sua localização...', 'info')

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude

        console.log('✅ [CLIENTE] Localização capturada:', { lat, lng })

        try {
          // Fazer geocodificação reversa para obter endereço
          const address = await reverseGeocode(lat, lng)

          console.log('✅ [CLIENTE] Endereço obtido:', address)

          // Tentar extrair partes do endereço
          const addressParts = address.split(',').map((part) => part.trim())

          const locationData = {
            lat,
            lng,
            address,
            rua: addressParts[0] || '',
            numero: addressParts[1] || 'S/N',
            bairro: addressParts[2] || '',
            cidade: addressParts[3] || '',
          }

          resolve(locationData)
        } catch (error) {
          console.error('❌ [CLIENTE] Erro ao obter endereço:', error)
          // Mesmo sem endereço, retornar coordenadas
          resolve({
            lat,
            lng,
            address: `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`,
            rua: '',
            numero: '',
            bairro: '',
            cidade: '',
          })
        }
      },
      (error) => {
        console.error('❌ [CLIENTE] Erro ao capturar localização:', error)
        let errorMessage = 'Erro ao obter localização'

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage =
              'Permissão de localização negada. Por favor, permita o acesso à localização.'
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Localização indisponível'
            break
          case error.TIMEOUT:
            errorMessage = 'Tempo esgotado ao obter localização'
            break
        }

        showToast(errorMessage, 'error')
        reject(errorMessage)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    )
  })
}
