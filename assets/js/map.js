// ===== CONFIGURAÇÃO DO MAPA COM LEAFLET.JS =====

class MapManager {
  constructor(containerId) {
    this.containerId = containerId
    this.map = null
    this.markers = {}
    this.routeLine = null
    this.userLocation = null
  }

  // Inicializar o mapa
  init(center = [-23.5505, -46.6333], zoom = 13) {
    console.log('🗺️ Inicializando mapa no container:', this.containerId)

    // Verificar se o container existe
    const container = document.getElementById(this.containerId)
    if (!container) {
      console.error(`❌ Container ${this.containerId} não encontrado`)
      return
    }

    console.log('✅ Container encontrado:', container)
    console.log('📏 Dimensões do container:', {
      width: container.offsetWidth,
      height: container.offsetHeight,
      display: window.getComputedStyle(container).display,
    })

    try {
      // Criar o mapa
      this.map = L.map(this.containerId, {
        center: center,
        zoom: zoom,
        zoomControl: true,
        preferCanvas: false,
        attributionControl: true,
      })

      console.log('✅ Objeto do mapa criado')

      // Adicionar camada de tiles (OpenStreetMap) com mais opções
      const tileLayer = L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19,
          minZoom: 3,
          subdomains: ['a', 'b', 'c'],
          crossOrigin: true,
          keepBuffer: 2,
          updateWhenIdle: false,
          updateWhenZooming: false,
          detectRetina: true,
        }
      )

      tileLayer.addTo(this.map)
      console.log('✅ Camada de tiles adicionada')

      // Listeners para debug
      tileLayer.on('loading', () => {
        console.log('⏳ Carregando tiles...')
      })

      tileLayer.on('load', () => {
        console.log('✅ Todos os tiles carregados!')
      })

      tileLayer.on('tileerror', (error) => {
        console.warn('⚠️ Erro ao carregar tile:', error)
      })

      // Forçar recalculo do tamanho
      this.resize()

      console.log('✅ Mapa inicializado com sucesso!')
    } catch (error) {
      console.error('❌ Erro ao inicializar mapa:', error)
      throw error
    }

    return this
  }

  // Método para recalcular tamanho do mapa
  resize() {
    // O delay é importante para garantir que o container do mapa esteja
    // visível e com o tamanho correto antes de renderizar o mapa,
    // especialmente após animações ou mudanças de display.
    setTimeout(() => {
      if (this.map) {
        this.map.invalidateSize()
      }
    }, 150)
  }

  // Adicionar marcador
  addMarker(id, lat, lng, options = {}) {
    const {
      title = '',
      icon = 'default',
      popup = null,
      draggable = false,
    } = options

    // Criar ícone personalizado
    let markerIcon
    if (icon === 'user') {
      markerIcon = L.divIcon({
        className: 'custom-marker user-marker',
        html: '<div class="marker-pin user-pin">📍</div>',
        iconSize: [30, 30],
        iconAnchor: [15, 30],
      })
    } else if (icon === 'delivery') {
      markerIcon = L.divIcon({
        className: 'custom-marker delivery-marker',
        html: '<div class="marker-pin delivery-pin">🚚</div>',
        iconSize: [30, 30],
        iconAnchor: [15, 30],
      })
    } else if (icon === 'destination') {
      markerIcon = L.divIcon({
        className: 'custom-marker destination-marker',
        html: '<div class="marker-pin destination-pin">🏠</div>',
        iconSize: [30, 30],
        iconAnchor: [15, 30],
      })
    } else {
      markerIcon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
      })
    }

    // Criar marcador
    const marker = L.marker([lat, lng], {
      title,
      icon: markerIcon,
      draggable,
    }).addTo(this.map)

    // Adicionar popup se fornecido
    if (popup) {
      marker.bindPopup(popup)
    }

    // Armazenar marcador
    this.markers[id] = marker

    return marker
  }

  // Atualizar posição do marcador
  updateMarker(id, lat, lng, animate = true) {
    const marker = this.markers[id]
    if (marker) {
      if (animate) {
        // Animação suave
        const currentLatLng = marker.getLatLng()
        const newLatLng = L.latLng(lat, lng)

        let start = null
        const duration = 1000 // 1 segundo

        const animateMarker = (timestamp) => {
          if (!start) start = timestamp
          const progress = (timestamp - start) / duration

          if (progress < 1) {
            const lat =
              currentLatLng.lat + (newLatLng.lat - currentLatLng.lat) * progress
            const lng =
              currentLatLng.lng + (newLatLng.lng - currentLatLng.lng) * progress
            marker.setLatLng([lat, lng])
            requestAnimationFrame(animateMarker)
          } else {
            marker.setLatLng(newLatLng)
          }
        }

        requestAnimationFrame(animateMarker)
      } else {
        marker.setLatLng([lat, lng])
      }
    }
  }

  // Remover marcador
  removeMarker(id) {
    const marker = this.markers[id]
    if (marker) {
      this.map.removeLayer(marker)
      delete this.markers[id]
    }
  }

  // Desenhar rota entre dois pontos
  drawRoute(points, color = '#2563eb') {
    // Remover rota anterior se existir
    if (this.routeLine) {
      this.map.removeLayer(this.routeLine)
    }

    // Criar nova linha
    this.routeLine = L.polyline(points, {
      color: color,
      weight: 4,
      opacity: 0.7,
      smoothFactor: 1,
    }).addTo(this.map)

    // Ajustar zoom para mostrar toda a rota
    this.map.fitBounds(this.routeLine.getBounds(), {
      padding: [50, 50],
    })
  }

  // Centralizar mapa em uma posição
  centerMap(lat, lng, zoom = null) {
    if (zoom) {
      this.map.setView([lat, lng], zoom)
    } else {
      this.map.panTo([lat, lng])
    }
  }

  // Ajustar zoom para mostrar todos os marcadores
  fitAllMarkers() {
    const markerArray = Object.values(this.markers)
    if (markerArray.length > 0) {
      const group = L.featureGroup(markerArray)
      this.map.fitBounds(group.getBounds(), {
        padding: [50, 50],
      })
    }
  }

  // Obter localização do usuário
  getUserLocation(callback) {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude
          const lng = position.coords.longitude
          this.userLocation = { lat, lng }

          if (callback) {
            callback(null, { lat, lng })
          }
        },
        (error) => {
          console.error('Erro ao obter localização:', error)

          // Usar localização padrão (São Paulo) como fallback
          const defaultLocation = { lat: -23.5505, lng: -46.6333 }
          this.userLocation = defaultLocation

          console.warn('Usando localização padrão (São Paulo)')

          if (callback) {
            // Retornar localização padrão em vez de erro
            callback(null, defaultLocation)
          }
        },
        {
          enableHighAccuracy: false, // Mudado para false para ser mais rápido
          timeout: 15000, // Aumentado para 15 segundos
          maximumAge: 300000, // Cache de 5 minutos
        }
      )
    } else {
      console.warn('Geolocalização não suportada, usando localização padrão')
      const defaultLocation = { lat: -23.5505, lng: -46.6333 }
      this.userLocation = defaultLocation

      if (callback) {
        callback(null, defaultLocation)
      }
    }
  }

  // Monitorar localização em tempo real
  watchUserLocation(callback, errorCallback) {
    if ('geolocation' in navigator) {
      return navigator.geolocation.watchPosition(
        (position) => {
          const lat = position.coords.latitude
          const lng = position.coords.longitude
          this.userLocation = { lat, lng }

          if (callback) {
            callback({ lat, lng })
          }
        },
        (error) => {
          console.error('Erro ao monitorar localização:', error)

          // Usar localização padrão como fallback
          const defaultLocation = { lat: -23.5505, lng: -46.6333 }
          this.userLocation = defaultLocation

          if (callback) {
            callback(defaultLocation)
          }

          if (errorCallback) {
            errorCallback(error)
          }
        },
        {
          enableHighAccuracy: false, // Mudado para false
          timeout: 15000, // Aumentado para 15 segundos
          maximumAge: 300000, // Cache de 5 minutos
        }
      )
    }
    return null
  }

  // Parar de monitorar localização
  stopWatchingLocation(watchId) {
    if (watchId && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(watchId)
    }
  }

  // Calcular distância entre dois pontos (em km)
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371 // Raio da Terra em km
    const dLat = this.toRad(lat2 - lat1)
    const dLng = this.toRad(lng2 - lng1)

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2)

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const distance = R * c

    return distance
  }

  // Converter graus para radianos
  toRad(degrees) {
    return degrees * (Math.PI / 180)
  }

  // Limpar todos os marcadores
  clearMarkers() {
    Object.keys(this.markers).forEach((id) => {
      this.removeMarker(id)
    })
  }

  // Limpar rota
  clearRoute() {
    if (this.routeLine) {
      this.map.removeLayer(this.routeLine)
      this.routeLine = null
    }
  }

  // Destruir mapa
  destroy() {
    if (this.map) {
      this.map.remove()
      this.map = null
      this.markers = {}
      this.routeLine = null
    }
  }
}

// Estilos CSS para os marcadores personalizados
const mapStyles = document.createElement('style')
mapStyles.textContent = `
    .custom-marker {
        background: transparent;
        border: none;
    }

    .marker-pin {
        font-size: 24px;
        text-align: center;
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
        animation: bounce 2s infinite;
    }

    .user-pin {
        color: #2563eb;
    }

    .delivery-pin {
        color: #10b981;
    }

    .destination-pin {
        color: #ef4444;
    }

    @keyframes bounce {
        0%, 100% {
            transform: translateY(0);
        }
        50% {
            transform: translateY(-10px);
        }
    }

    #map {
        width: 100%;
        height: 500px;
        min-height: 400px;
        border-radius: 12px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }

    .detalhes-map #map {
        height: 100%;
        min-height: 500px;
    }

    @media (max-width: 768px) {
        #map {
            height: 400px;
            min-height: 300px;
        }
        
        .detalhes-map #map {
            min-height: 400px;
        }
    }

    .leaflet-popup-content-wrapper {
        border-radius: 8px;
        padding: 5px;
    }

    .leaflet-popup-content {
        margin: 10px;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }
`
document.head.appendChild(mapStyles)
