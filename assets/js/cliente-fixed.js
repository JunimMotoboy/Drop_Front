// Arquivo temporário - copiar conteúdo para cliente.js
// A função openLocationPickerModal() corrigida está aqui

// Abrir modal de seleção de localização
function openLocationPickerModal() {
  console.log('🗺️ [CLIENTE] Função openLocationPickerModal() chamada')
  
  // Verificar se Leaflet está carregado
  if (typeof L === 'undefined') {
    console.error('❌ [CLIENTE] Leaflet (L) não está carregado!')
    showToast('Erro: Biblioteca de mapas não carregada. Recarregue a página.', 'error')
    return
  }
  
  console.log('✅ [CLIENTE] Leaflet está carregado')

  const modal = document.getElementById('modal-location-picker')
  if (!modal) {
    console.error('❌ [CLIENTE] Modal de localização não encontrado!')
    showToast('Erro ao abrir seletor de localização', 'error')
    return
  }
  
  console.log('✅ [CLIENTE] Modal encontrado:', modal)

  // Resetar seleção anterior
  selectedLocation = null
  const selectedAddressEl = document.getElementById('selected-address')
  const confirmBtn = document.getElementById('btn-confirm-location')
  const loadingIndicator = document.getElementById('location-loading')
  
  selectedAddressEl.textContent = 'Clique no mapa para selecionar'
  selectedAddressEl.style.color = '#666'
  confirmBtn.disabled = true

  // Abrir modal
  modal.classList.add('active')

  // Aguardar modal ficar visível antes de inicializar mapa
  setTimeout(() => {
    if (!locationPickerMap) {
      console.log('🗺️ [CLIENTE] Criando novo mapa de seleção')
      
      // Criar novo mapa para seleção
      locationPickerMap = L.map('location-picker-map').setView(
        [-23.5505, -46.6333],
        13
      )

      // Adicionar camada de tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(locationPickerMap)

      // Adicionar evento de clique no mapa
      locationPickerMap.on('click', async (e) => {
        const lat = e.latlng.lat
        const lng = e.latlng.lng

        console.log('📍 [CLIENTE] Localização selecionada:', { lat, lng })

        // Salvar localização selecionada (temporária)
        selectedLocation = { lat, lng }

        // Limpar marcadores anteriores
        locationPickerMap.eachLayer((layer) => {
          if (layer instanceof L.Marker) {
            locationPickerMap.removeLayer(layer)
          }
        })

        // Adicionar marcador na posição clicada com ícone personalizado
        const marker = L.marker([lat, lng], {
          icon: L.divIcon({
            className: 'custom-location-marker',
            html: '<div class="marker-pin-selected">📍</div>',
            iconSize: [40, 40],
            iconAnchor: [20, 40],
          })
        })
          .addTo(locationPickerMap)
          .bindPopup('Localização selecionada')
          .openPopup()

        // Mostrar loading
        if (loadingIndicator) {
          loadingIndicator.style.display = 'flex'
        }
        selectedAddressEl.textContent = 'Obtendo endereço...'
        selectedAddressEl.style.color = '#666'
        confirmBtn.disabled = true

        // Fazer geocodificação reversa para obter endereço estruturado
        try {
          console.log('🔍 [CLIENTE] Iniciando geocodificação reversa estruturada...')
          
          // Usar nova função com dados estruturados
          const addressData = await reverseGeocode(lat, lng, 2, true)
          
          console.log('✅ [CLIENTE] Dados estruturados recebidos:', addressData)

          // Salvar dados estruturados na seleção
          selectedLocation.addressData = addressData
          selectedLocation.address = addressData.formatted

          // Atualizar display
          selectedAddressEl.textContent = addressData.formatted
          selectedAddressEl.style.color = '#2e7d32'
          
          // Habilitar botão de confirmar
          confirmBtn.disabled = false

          // Esconder loading
          if (loadingIndicator) {
            loadingIndicator.style.display = 'none'
          }

          showToast('Endereço obtido com sucesso!', 'success')
          console.log('✅ [CLIENTE] Endereço estruturado obtido:', addressData)
        } catch (error) {
          console.error('❌ [CLIENTE] Erro ao obter endereço:', error)
          
          // Fallback: usar coordenadas
          selectedLocation.address = `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`
          selectedLocation.addressData = {
            formatted: selectedLocation.address,
            rua: '',
            numero: 'S/N',
            bairro: '',
            cidade: '',
            lat: lat,
            lng: lng,
            isApproximate: true
          }
          
          selectedAddressEl.textContent = selectedLocation.address
          selectedAddressEl.style.color = '#856404'
          confirmBtn.disabled = false

          // Esconder loading
          if (loadingIndicator) {
            loadingIndicator.style.display = 'none'
          }

          showToast('Não foi possível obter endereço. Você pode preencher manualmente.', 'warning')
        }
      })
    } else {
      console.log('🔄 [CLIENTE] Redimensionando mapa existente')
      // Se mapa já existe, apenas redimensionar
      locationPickerMap.invalidateSize()
    }

    // Tentar centralizar no local atual do usuário
    if (navigator.geolocation) {
      console.log('📍 [CLIENTE] Tentando obter localização atual...')
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude
          const lng = position.coords.longitude
          locationPickerMap.setView([lat, lng], 15)
          console.log('✅ [CLIENTE] Mapa centralizado na localização atual:', { lat, lng })
        },
        (error) => {
          console.warn(
            '⚠️ [CLIENTE] Não foi possível obter localização atual:',
            error.message
          )
        },
        {
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 60000
        }
      )
    }
  }, 300)
}
