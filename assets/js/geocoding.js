// ===== GEOCODIFICAÇÃO COM OPENCAGE DATA =====

// API Key do OpenCage (gratuita - 2500 requisições/dia)
const OPENCAGE_API_KEY = '8c0892e8c224444d8c5e0e6e4e961d8e' // Chave de exemplo - substitua pela sua

// Cache de geocodificação para evitar requisições repetidas
const geocodeCache = new Map()

/**
 * Geocodificar endereço (converter endereço em coordenadas)
 * @param {string} address - Endereço para geocodificar
 * @returns {Promise<{lat: number, lng: number, formatted: string}>}
 */
async function geocodeAddress(address) {
  // Verificar cache
  if (geocodeCache.has(address)) {
    console.log('📍 Usando endereço do cache:', address)
    return geocodeCache.get(address)
  }

  try {
    console.log('🔍 Geocodificando endereço:', address)

    const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(
      address
    )}&key=${OPENCAGE_API_KEY}&language=pt&countrycode=br`

    const response = await fetch(url)
    const data = await response.json()

    if (data.results && data.results.length > 0) {
      const result = data.results[0]
      const location = {
        lat: result.geometry.lat,
        lng: result.geometry.lng,
        formatted: result.formatted,
      }

      // Salvar no cache
      geocodeCache.set(address, location)

      console.log('✅ Endereço geocodificado:', location)
      return location
    } else {
      throw new Error('Endereço não encontrado')
    }
  } catch (error) {
    console.error('❌ Erro ao geocodificar:', error)

    // Fallback: tentar extrair cidade e usar coordenadas aproximadas
    if (
      address.toLowerCase().includes('são paulo') ||
      address.toLowerCase().includes('sp')
    ) {
      console.warn('⚠️ Usando coordenadas de São Paulo como fallback')
      return {
        lat: -23.5505,
        lng: -46.6333,
        formatted: 'São Paulo, SP, Brasil',
      }
    }

    throw error
  }
}

/**
 * Geocodificação reversa (converter coordenadas em endereço)
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<string>}
 */
async function reverseGeocode(lat, lng) {
  const cacheKey = `${lat},${lng}`

  // Verificar cache
  if (geocodeCache.has(cacheKey)) {
    console.log('📍 Usando endereço reverso do cache')
    return geocodeCache.get(cacheKey)
  }

  try {
    console.log('🔍 Geocodificação reversa:', { lat, lng })

    const url = `https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lng}&key=${OPENCAGE_API_KEY}&language=pt`

    const response = await fetch(url)
    const data = await response.json()

    if (data.results && data.results.length > 0) {
      const address = data.results[0].formatted

      // Salvar no cache
      geocodeCache.set(cacheKey, address)

      console.log('✅ Endereço encontrado:', address)
      return address
    } else {
      throw new Error('Endereço não encontrado para estas coordenadas')
    }
  } catch (error) {
    console.error('❌ Erro na geocodificação reversa:', error)
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
  }
}

/**
 * Calcular rota entre dois pontos usando OSRM (Open Source Routing Machine)
 * @param {number} startLat - Latitude inicial
 * @param {number} startLng - Longitude inicial
 * @param {number} endLat - Latitude final
 * @param {number} endLng - Longitude final
 * @returns {Promise<{coordinates: Array, distance: number, duration: number}>}
 */
async function calculateRoute(startLat, startLng, endLat, endLng) {
  try {
    console.log('🛣️ Calculando rota...')

    const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`

    const response = await fetch(url)
    const data = await response.json()

    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      const route = data.routes[0]

      // Converter coordenadas de [lng, lat] para [lat, lng]
      const coordinates = route.geometry.coordinates.map((coord) => [
        coord[1],
        coord[0],
      ])

      const result = {
        coordinates: coordinates,
        distance: route.distance, // em metros
        duration: route.duration, // em segundos
      }

      console.log('✅ Rota calculada:', {
        distance: `${(result.distance / 1000).toFixed(2)} km`,
        duration: `${Math.round(result.duration / 60)} min`,
      })

      return result
    } else {
      throw new Error('Não foi possível calcular a rota')
    }
  } catch (error) {
    console.error('❌ Erro ao calcular rota:', error)

    // Fallback: linha reta
    return {
      coordinates: [
        [startLat, startLng],
        [endLat, endLng],
      ],
      distance:
        calculateStraightDistance(startLat, startLng, endLat, endLng) * 1000,
      duration: 0,
    }
  }
}

/**
 * Calcular distância em linha reta entre dois pontos (em km)
 * @param {number} lat1 - Latitude do ponto 1
 * @param {number} lng1 - Longitude do ponto 1
 * @param {number} lat2 - Latitude do ponto 2
 * @param {number} lng2 - Longitude do ponto 2
 * @returns {number} Distância em quilômetros
 */
function calculateStraightDistance(lat1, lng1, lat2, lng2) {
  const R = 6371 // Raio da Terra em km
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c

  return distance
}

/**
 * Converter graus para radianos
 */
function toRad(degrees) {
  return degrees * (Math.PI / 180)
}

/**
 * Formatar distância para exibição
 * @param {number} meters - Distância em metros
 * @returns {string}
 */
function formatDistance(meters) {
  if (meters < 1000) {
    return `${Math.round(meters)} m`
  } else {
    return `${(meters / 1000).toFixed(2)} km`
  }
}

/**
 * Formatar duração para exibição
 * @param {number} seconds - Duração em segundos
 * @returns {string}
 */
function formatDuration(seconds) {
  const minutes = Math.round(seconds / 60)

  if (minutes < 60) {
    return `${minutes} min`
  } else {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}min`
  }
}

/**
 * Obter sugestões de endereços (autocomplete)
 * @param {string} query - Texto de busca
 * @returns {Promise<Array>}
 */
async function getAddressSuggestions(query) {
  if (!query || query.length < 3) {
    return []
  }

  try {
    const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(
      query
    )}&key=${OPENCAGE_API_KEY}&language=pt&countrycode=br&limit=5`

    const response = await fetch(url)
    const data = await response.json()

    if (data.results && data.results.length > 0) {
      return data.results.map((result) => ({
        formatted: result.formatted,
        lat: result.geometry.lat,
        lng: result.geometry.lng,
      }))
    }

    return []
  } catch (error) {
    console.error('❌ Erro ao buscar sugestões:', error)
    return []
  }
}

// Exportar funções
window.geocodeAddress = geocodeAddress
window.reverseGeocode = reverseGeocode
window.calculateRoute = calculateRoute
window.calculateStraightDistance = calculateStraightDistance
window.formatDistance = formatDistance
window.formatDuration = formatDuration
window.getAddressSuggestions = getAddressSuggestions
