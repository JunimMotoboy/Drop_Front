// ===== GEOCODIFICAÇÃO COM OPENCAGE DATA =====

// API Key do OpenCage (gratuita - 2500 requisições/dia)
const OPENCAGE_API_KEY = 'ecc0112f185944b994704f6c478f7d4a'

// Cache de geocodificação para evitar requisições repetidas
const geocodeCache = new Map()

// Limites geográficos do Brasil
const BRAZIL_BOUNDS = {
  minLat: -33.75,
  maxLat: 5.27,
  minLng: -73.99,
  maxLng: -28.84,
}

/**
 * Validar se coordenadas estão dentro do Brasil
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {boolean}
 */
function isValidBrazilianCoordinates(lat, lng) {
  return (
    lat >= BRAZIL_BOUNDS.minLat &&
    lat <= BRAZIL_BOUNDS.maxLat &&
    lng >= BRAZIL_BOUNDS.minLng &&
    lng <= BRAZIL_BOUNDS.maxLng
  )
}

/**
 * Validar formato de coordenadas
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {boolean}
 */
function isValidCoordinates(lat, lng) {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  )
}

/**
 * Geocodificar endereço (converter endereço em coordenadas)
 * @param {string} address - Endereço para geocodificar
 * @param {number} retries - Número de tentativas (padrão: 2)
 * @returns {Promise<{lat: number, lng: number, formatted: string}>}
 */
async function geocodeAddress(address, retries = 2) {
  // Validar entrada
  if (!address || typeof address !== 'string' || address.trim() === '') {
    throw new Error('Endereço inválido')
  }

  const normalizedAddress = address.trim()

  // Verificar cache
  if (geocodeCache.has(normalizedAddress)) {
    console.log('📍 Usando endereço do cache:', normalizedAddress)
    return geocodeCache.get(normalizedAddress)
  }

  let lastError = null

  // Tentar com retry
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`🔄 Tentativa ${attempt + 1} de ${retries + 1}...`)
        // Aguardar antes de tentar novamente
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt))
      }

      console.log('🔍 Geocodificando endereço:', normalizedAddress)

      const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(
        normalizedAddress
      )}&key=${OPENCAGE_API_KEY}&language=pt&countrycode=br`

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.results && data.results.length > 0) {
        const result = data.results[0]
        const location = {
          lat: result.geometry.lat,
          lng: result.geometry.lng,
          formatted: result.formatted,
        }

        // Validar coordenadas
        if (!isValidCoordinates(location.lat, location.lng)) {
          throw new Error('Coordenadas inválidas retornadas pela API')
        }

        // Verificar se está no Brasil
        if (!isValidBrazilianCoordinates(location.lat, location.lng)) {
          console.warn('⚠️ Coordenadas fora do Brasil:', location)
          throw new Error('Endereço fora do Brasil')
        }

        // Salvar no cache
        geocodeCache.set(normalizedAddress, location)

        console.log('✅ Endereço geocodificado:', location)
        return location
      } else {
        throw new Error('Endereço não encontrado')
      }
    } catch (error) {
      lastError = error
      console.error(`❌ Erro na tentativa ${attempt + 1}:`, error.message)

      // Se não for a última tentativa, continuar
      if (attempt < retries) {
        continue
      }
    }
  }

  // Se todas as tentativas falharam, usar fallback
  console.warn('⚠️ Todas as tentativas falharam, usando fallback')
  return useFallbackCoordinates(normalizedAddress)
}

/**
 * Usar coordenadas aproximadas como fallback
 * @param {string} address - Endereço original
 * @returns {object}
 */
function useFallbackCoordinates(address) {
  const addressLower = address.toLowerCase()

  // Principais cidades brasileiras
  const cityCoordinates = {
    'são paulo': { lat: -23.5505, lng: -46.6333, name: 'São Paulo, SP' },
    'rio de janeiro': {
      lat: -22.9068,
      lng: -43.1729,
      name: 'Rio de Janeiro, RJ',
    },
    brasília: { lat: -15.7939, lng: -47.8828, name: 'Brasília, DF' },
    salvador: { lat: -12.9714, lng: -38.5014, name: 'Salvador, BA' },
    fortaleza: { lat: -3.7172, lng: -38.5433, name: 'Fortaleza, CE' },
    'belo horizonte': {
      lat: -19.9167,
      lng: -43.9345,
      name: 'Belo Horizonte, MG',
    },
    manaus: { lat: -3.119, lng: -60.0217, name: 'Manaus, AM' },
    curitiba: { lat: -25.4284, lng: -49.2733, name: 'Curitiba, PR' },
    recife: { lat: -8.0476, lng: -34.877, name: 'Recife, PE' },
    'porto alegre': { lat: -30.0346, lng: -51.2177, name: 'Porto Alegre, RS' },
  }

  // Tentar encontrar cidade no endereço
  for (const [city, coords] of Object.entries(cityCoordinates)) {
    if (addressLower.includes(city)) {
      console.log(`📍 Usando coordenadas aproximadas de ${coords.name}`)
      return {
        lat: coords.lat,
        lng: coords.lng,
        formatted: `${address} (aproximado - ${coords.name})`,
        isApproximate: true,
      }
    }
  }

  // Usar São Paulo como padrão
  console.log('📍 Usando coordenadas padrão (São Paulo)')
  return {
    lat: -23.5505,
    lng: -46.6333,
    formatted: `${address} (localização aproximada - São Paulo, SP)`,
    isApproximate: true,
  }
}

/**
 * Geocodificação reversa (converter coordenadas em endereço)
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {number} retries - Número de tentativas (padrão: 2)
 * @param {boolean} returnStructured - Se true, retorna objeto estruturado (padrão: false)
 * @returns {Promise<string|object>}
 */
async function reverseGeocode(lat, lng, retries = 2, returnStructured = false) {
  // Validar coordenadas
  if (!isValidCoordinates(lat, lng)) {
    throw new Error('Coordenadas inválidas')
  }

  if (!isValidBrazilianCoordinates(lat, lng)) {
    console.warn('⚠️ Coordenadas fora do Brasil')
  }

  const cacheKey = `${lat.toFixed(6)},${lng.toFixed(6)}${returnStructured ? '_structured' : ''}`

  // Verificar cache
  if (geocodeCache.has(cacheKey)) {
    console.log('📍 Usando endereço reverso do cache')
    return geocodeCache.get(cacheKey)
  }

  let lastError = null

  // Tentar com retry
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`🔄 Tentativa ${attempt + 1} de ${retries + 1}...`)
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt))
      }

      console.log('🔍 Geocodificação reversa:', { lat, lng })

      const url = `https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lng}&key=${OPENCAGE_API_KEY}&language=pt`

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.results && data.results.length > 0) {
        const result = data.results[0]
        const components = result.components

        if (returnStructured) {
          // Retornar objeto estruturado com componentes do endereço
          const structuredAddress = {
            formatted: result.formatted,
            rua: components.road || components.street || components.pedestrian || '',
            numero: components.house_number || 'S/N',
            bairro: components.suburb || components.neighbourhood || components.quarter || components.district || '',
            cidade: components.city || components.town || components.village || components.municipality || '',
            estado: components.state || '',
            cep: components.postcode || '',
            pais: components.country || 'Brasil',
            lat: result.geometry.lat,
            lng: result.geometry.lng
          }

          // Salvar no cache
          geocodeCache.set(cacheKey, structuredAddress)

          console.log('✅ Endereço estruturado encontrado:', structuredAddress)
          return structuredAddress
        } else {
          // Retornar apenas string formatada
          const address = result.formatted

          // Salvar no cache
          geocodeCache.set(cacheKey, address)

          console.log('✅ Endereço encontrado:', address)
          return address
        }
      } else {
        throw new Error('Endereço não encontrado para estas coordenadas')
      }
    } catch (error) {
      lastError = error
      console.error(`❌ Erro na tentativa ${attempt + 1}:`, error.message)

      if (attempt < retries) {
        continue
      }
    }
  }

  // Fallback
  console.warn('⚠️ Não foi possível obter endereço, retornando fallback')
  
  if (returnStructured) {
    return {
      formatted: `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`,
      rua: '',
      numero: '',
      bairro: '',
      cidade: '',
      estado: '',
      cep: '',
      pais: 'Brasil',
      lat: lat,
      lng: lng,
      isApproximate: true
    }
  } else {
    return `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`
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
window.isValidCoordinates = isValidCoordinates
window.isValidBrazilianCoordinates = isValidBrazilianCoordinates
