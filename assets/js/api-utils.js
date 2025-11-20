// ===== UTILITÁRIOS PARA PADRONIZAÇÃO DE RESPOSTAS DA API =====

/**
 * Extrai dados de uma resposta da API de forma padronizada
 * Suporta múltiplos formatos de resposta para compatibilidade
 *
 * @param {Object} response - Resposta da API
 * @param {string} dataKey - Chave esperada para os dados (ex: 'encomendas', 'entregas', 'usuarios')
 * @returns {Array|Object} - Dados extraídos ou array/objeto vazio
 */
function extractApiData(response, dataKey = 'data') {
  // Formato padrão esperado: { success: true, data: { [dataKey]: [...] } }
  if (response.success && response.data) {
    // Se data contém a chave específica
    if (response.data[dataKey]) {
      return response.data[dataKey]
    }
    // Se data é diretamente um array
    if (Array.isArray(response.data)) {
      return response.data
    }
    // Se data é um objeto (para casos de item único)
    return response.data
  }

  // Formato alternativo: { [dataKey]: [...] }
  if (response[dataKey]) {
    return response[dataKey]
  }

  // Formato alternativo: { data: [...] } onde data é array
  if (response.data && Array.isArray(response.data)) {
    return response.data
  }

  // Se a resposta é diretamente um array
  if (Array.isArray(response)) {
    return response
  }

  // Retornar array vazio se nenhum formato foi reconhecido
  console.warn(
    `Formato de resposta não reconhecido para chave '${dataKey}':`,
    response
  )
  return Array.isArray(response) ? [] : {}
}

/**
 * Valida se a resposta da API foi bem-sucedida
 *
 * @param {Object} response - Resposta da API
 * @returns {boolean} - true se sucesso, false caso contrário
 */
function isApiSuccess(response) {
  // Formato padrão: { success: true }
  if (response.hasOwnProperty('success')) {
    return response.success === true
  }

  // Se não tem campo success, considera sucesso se tem dados
  if (
    response.data ||
    response.encomendas ||
    response.entregas ||
    response.usuarios
  ) {
    return true
  }

  // Se é um array, considera sucesso
  if (Array.isArray(response)) {
    return true
  }

  return false
}

/**
 * Extrai mensagem de erro da resposta da API
 *
 * @param {Object} response - Resposta da API
 * @param {string} defaultMessage - Mensagem padrão se não encontrar
 * @returns {string} - Mensagem de erro
 */
function getApiErrorMessage(response, defaultMessage = 'Erro desconhecido') {
  // Formato padrão: { success: false, message: '...' }
  if (response.message) {
    return response.message
  }

  // Formato alternativo: { error: '...' }
  if (response.error) {
    return response.error
  }

  // Formato alternativo: { errors: [...] }
  if (
    response.errors &&
    Array.isArray(response.errors) &&
    response.errors.length > 0
  ) {
    return response.errors[0]
  }

  return defaultMessage
}

/**
 * Processa resposta da API de forma padronizada
 *
 * @param {Response} fetchResponse - Resposta do fetch
 * @param {string} dataKey - Chave esperada para os dados
 * @returns {Promise<Object>} - Objeto com { success, data, message }
 */
async function processApiResponse(fetchResponse, dataKey = 'data') {
  try {
    const jsonData = await fetchResponse.json()

    if (fetchResponse.ok) {
      return {
        success: true,
        data: extractApiData(jsonData, dataKey),
        message: jsonData.message || 'Operação realizada com sucesso',
      }
    } else {
      return {
        success: false,
        data: null,
        message: getApiErrorMessage(jsonData, 'Erro ao processar requisição'),
      }
    }
  } catch (error) {
    console.error('Erro ao processar resposta da API:', error)
    return {
      success: false,
      data: null,
      message: 'Erro ao processar resposta do servidor',
    }
  }
}

/**
 * Wrapper para fetchWithAuth que padroniza a resposta
 *
 * @param {string} url - URL da requisição
 * @param {Object} options - Opções do fetch
 * @param {string} dataKey - Chave esperada para os dados
 * @returns {Promise<Object>} - Objeto com { success, data, message }
 */
async function fetchApi(url, options = {}, dataKey = 'data') {
  try {
    // Configurar opções de retry para cold start do Render
    const retryOptions = {
      maxRetries: 5, // Mais tentativas para cold start
      baseDelay: 2000, // Delay inicial maior
      maxDelay: 15000, // Delay máximo maior
      ...options,
    }

    const response = await fetchWithAuth(url, retryOptions)
    return await processApiResponse(response, dataKey)
  } catch (error) {
    console.error('Erro na requisição:', error)
    return {
      success: false,
      data: null,
      message: 'Erro ao conectar com o servidor. O serviço pode estar inicializando.',
    }
  }
}

/**
 * Formata resposta de lista (encomendas, entregas, etc)
 * Garante que sempre retorna um array
 *
 * @param {*} data - Dados recebidos
 * @returns {Array} - Array de itens
 */
function ensureArray(data) {
  if (Array.isArray(data)) {
    return data
  }
  if (data && typeof data === 'object') {
    // Se é um objeto com propriedades numéricas, converter para array
    const keys = Object.keys(data)
    if (keys.length > 0 && keys.every((k) => !isNaN(k))) {
      return Object.values(data)
    }
    // Se é um objeto único, retornar como array de um elemento
    return [data]
  }
  return []
}

/**
 * Log padronizado para debug de API
 *
 * @param {string} operation - Nome da operação
 * @param {*} data - Dados para log
 */
function logApiDebug(operation, data) {
  if (typeof console !== 'undefined' && console.log) {
    console.log(`[API] ${operation}:`, data)
  }
}
