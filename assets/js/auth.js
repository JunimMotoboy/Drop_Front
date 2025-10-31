// Configuração da API
const API_URL = 'https://drop-29o0.onrender.com/api';

// Função para obter o token
function getToken() {
    return localStorage.getItem('token');
}

// Função para obter dados do usuário
function getUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
}

// Função para verificar se está autenticado
function isAuthenticated() {
    return !!getToken();
}

// Função para fazer logout
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '../index.html';
}

// Função para fazer requisições autenticadas
async function fetchWithAuth(url, options = {}) {
    const token = getToken();
    
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
    };

    try {
        const response = await fetch(url, {
            ...options,
            headers
        });

        // Se não autorizado, redirecionar para login
        if (response.status === 401 || response.status === 403) {
            logout();
            return;
        }

        return response;
    } catch (error) {
        console.error('Erro na requisição:', error);
        throw error;
    }
}

// Verificar autenticação ao carregar páginas protegidas
function checkAuth(requiredType = null) {
    if (!isAuthenticated()) {
        window.location.href = 'login.html';
        return false;
    }

    const user = getUser();
    
    if (requiredType && user.tipo !== requiredType) {
        alert('Você não tem permissão para acessar esta página');
        logout();
        return false;
    }

    return true;
}

// Formatar data para exibição
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Formatar status para exibição
function formatStatus(status) {
    const statusMap = {
        'aguardando': { text: 'Aguardando', class: 'status-warning' },
        'em_rota': { text: 'Em Rota', class: 'status-info' },
        'entregue': { text: 'Entregue', class: 'status-success' },
        'cancelado': { text: 'Cancelado', class: 'status-danger' }
    };
    
    return statusMap[status] || { text: status, class: '' };
}

// Mostrar notificação toast
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#2563eb'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Adicionar estilos de animação
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
