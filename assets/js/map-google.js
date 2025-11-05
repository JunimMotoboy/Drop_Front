// ===== CONFIGURAÇÃO DO MAPA COM LEAFLET.JS - USANDO TILES DO GOOGLE =====

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

    const container = document.getElementById(this.containerId)
    if (!container) {
      console.error(`❌ Container ${this.containerId} não encontrado`)
      return
    }

    console.log('✅ Container encontrado')
    console.log('📏 Dimensões:', {
      width: container.offsetWidth,
      height: container.offsetHeight,
    })

    try {
      // Criar o mapa
      this.map = L.map(this.containerId, {
        center: center,
        zoom: zoom,
        zoomControl: true,
      })

      console.log('✅ Mapa criado')

      // Usar tiles do Google Maps (Satellite + Roads)
      const googleHybrid = L.tileLayer(
        'http://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}',
        {
          maxZoom: 20,
          subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        }
      )

      // Usar tiles do Google Maps (Streets)
      const googleStreets = L.tileLayer(
        'http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
        {
          maxZoom: 20,
          subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        }
      )

      // Usar tiles do Google Maps (Terrain)
      const googleTerrain = L.tileLayer(
        'http://{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}',
        {
          maxZoom: 20,
          subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        }
      )

      // Adicionar camada padrão (Streets)
      googleStreets.addTo(this.map)
      console.log('✅ Tiles do Google Maps adicionados')

      // Controle de camadas
      const baseMaps = {
        Ruas: googleStreets,
        Satélite: googleHybrid,
        Terreno: googleTerrain,
      }

      L.control.layers(baseMaps).addTo(this.map)

      // Listeners para debug
      googleStreets.on('loading', () => {
        console.log('⏳ Carregando tiles do Google...')
      })

      googleStreets.on('load', () => {
        console.log('✅ Tiles carregados!')
      })

      googleStreets.on('tileerror', (error) => {
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
    setTimeout(() => {
      if (this.map) {
        // Forçar o container a ter dimensões corretas
        const container = document.getElementById(this.containerId)
        if (container) {
          const parent = container.parentElement
          if (parent) {
            const parentWidth = parent.offsetWidth
            const parentHeight = parent.offsetHeight

            // Limitar o tamanho do container
            if (parentWidth > 0) {
              container.style.width = '100%'
              container.style.maxWidth = parentWidth + 'px'
            }
            if (parentHeight > 0 && parentHeight < 600) {
              container.style.height = parentHeight + 'px'
              container.style.maxHeight = parentHeight + 'px'
            }
          }
        }

        this.map.invalidateSize()
        console.log('✅ Tamanho recalculado')
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

    const marker = L.marker([lat, lng], {
      title,
      icon: markerIcon,
      draggable,
    }).addTo(this.map)

    if (popup) {
      marker.bindPopup(popup)
    }

    this.markers[id] = marker
    return marker
  }

  // Atualizar posição do marcador
  updateMarker(id, lat, lng, animate = true) {
    const marker = this.markers[id]
    if (marker) {
      if (animate) {
        const currentLatLng = marker.getLatLng()
        const newLatLng = L.latLng(lat, lng)

        let start = null
        const duration = 1000

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
    console.log('🎨 Desenhando rota com', points.length, 'pontos')
    console.log('🎨 Primeiros 3 pontos:', points.slice(0, 3))

    if (this.routeLine) {
      console.log('🗑️ Removendo rota anterior')
      this.map.removeLayer(this.routeLine)
    }

    this.routeLine = L.polyline(points, {
      color: color,
      weight: 6,
      opacity: 0.8,
      smoothFactor: 1,
    }).addTo(this.map)

    console.log('✅ Polyline adicionada ao mapa:', this.routeLine)
    console.log('📍 Bounds da rota:', this.routeLine.getBounds())

    this.map.fitBounds(this.routeLine.getBounds(), {
      padding: [50, 50],
    })

    console.log('✅ Zoom ajustado para mostrar a rota')
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
          const defaultLocation = { lat: -23.5505, lng: -46.6333 }
          this.userLocation = defaultLocation
          console.warn('Usando localização padrão (São Paulo)')

          if (callback) {
            callback(null, defaultLocation)
          }
        },
        {
          enableHighAccuracy: false,
          timeout: 15000,
          maximumAge: 300000,
        }
      )
    } else {
      console.warn('Geolocalização não suportada')
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
          enableHighAccuracy: false,
          timeout: 15000,
          maximumAge: 300000,
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
    const R = 6371
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

// Estilos CSS
const mapStyles = document.createElement('style')
mapStyles.textContent = `
    .custom-marker {
        background: transparent !important;
        border: none !important;
        z-index: 1000 !important;
    }

    .marker-pin {
        font-size: 32px !important;
        text-align: center;
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
        animation: bounce 2s infinite;
        position: relative;
        z-index: 1000 !important;
    }

    .user-pin {
        color: #2563eb !important;
    }

    .delivery-pin {
        color: #10b981 !important;
    }

    .destination-pin {
        color: #ef4444 !important;
    }

    /* Garantir que a polyline seja visível */
    .leaflet-overlay-pane svg {
        z-index: 400 !important;
    }
    
    .leaflet-overlay-pane svg path {
        stroke: #2563eb !important;
        stroke-width: 6 !important;
        stroke-opacity: 0.8 !important;
        fill: none !important;
    }

    /* Garantir que os marcadores fiquem acima */
    .leaflet-marker-pane {
        z-index: 600 !important;
    }

    @keyframes bounce {
        0%, 100% {
            transform: translateY(0);
        }
        50% {
            transform: translateY(-10px);
        }
    }
`
document.head.appendChild(mapStyles)
