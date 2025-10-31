// ===== VALIDAÇÃO E SANITIZAÇÃO DE DADOS =====

// Validação de Email
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
}

// Validação de Telefone (formato brasileiro)
function validatePhone(phone) {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length >= 10 && cleaned.length <= 11;
}

// Validação de Senha (mínimo 6 caracteres)
function validatePassword(password) {
    return password && password.length >= 6;
}

// Validação de Senha Forte (opcional)
function validateStrongPassword(password) {
    // Mínimo 8 caracteres, 1 maiúscula, 1 minúscula, 1 número
    const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
    return re.test(password);
}

// Validação de CPF
function validateCPF(cpf) {
    cpf = cpf.replace(/\D/g, '');
    
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
        return false;
    }
    
    let sum = 0;
    let remainder;
    
    for (let i = 1; i <= 9; i++) {
        sum += parseInt(cpf.substring(i - 1, i)) * (11 - i);
    }
    
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.substring(9, 10))) return false;
    
    sum = 0;
    for (let i = 1; i <= 10; i++) {
        sum += parseInt(cpf.substring(i - 1, i)) * (12 - i);
    }
    
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.substring(10, 11))) return false;
    
    return true;
}

// Validação de Valor Monetário
function validateMoney(value) {
    const num = parseFloat(value);
    return !isNaN(num) && num >= 0;
}

// Validação de Data
function validateDate(dateString) {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
}

// Validação de Data Futura
function validateFutureDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    return validateDate(dateString) && date > now;
}

// Sanitização de HTML (prevenir XSS)
function sanitizeHTML(str) {
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
}

// Sanitização de Input (remover caracteres especiais)
function sanitizeInput(str) {
    return str.replace(/[<>\"']/g, '');
}

// Sanitização de Número de Telefone
function sanitizePhone(phone) {
    return phone.replace(/\D/g, '');
}

// Formatação de Telefone
function formatPhone(phone) {
    const cleaned = sanitizePhone(phone);
    if (cleaned.length === 11) {
        return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    } else if (cleaned.length === 10) {
        return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
}

// Formatação de CPF
function formatCPF(cpf) {
    const cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length === 11) {
        return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9)}`;
    }
    return cpf;
}

// Formatação de Valor Monetário
function formatMoney(value) {
    return parseFloat(value).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

// Validação de Formulário Completo
function validateForm(formId, rules) {
    const form = document.getElementById(formId);
    if (!form) return { valid: false, errors: ['Formulário não encontrado'] };
    
    const errors = [];
    const data = {};
    
    for (const [fieldName, fieldRules] of Object.entries(rules)) {
        const field = form.querySelector(`[name="${fieldName}"], #${fieldName}`);
        
        if (!field) {
            if (fieldRules.required) {
                errors.push(`Campo ${fieldName} não encontrado`);
            }
            continue;
        }
        
        const value = field.value.trim();
        data[fieldName] = value;
        
        // Validação de campo obrigatório
        if (fieldRules.required && !value) {
            errors.push(fieldRules.message || `${fieldRules.label || fieldName} é obrigatório`);
            field.classList.add('error');
            continue;
        }
        
        // Validação de email
        if (fieldRules.type === 'email' && value && !validateEmail(value)) {
            errors.push(fieldRules.message || 'Email inválido');
            field.classList.add('error');
            continue;
        }
        
        // Validação de telefone
        if (fieldRules.type === 'phone' && value && !validatePhone(value)) {
            errors.push(fieldRules.message || 'Telefone inválido');
            field.classList.add('error');
            continue;
        }
        
        // Validação de senha
        if (fieldRules.type === 'password' && value && !validatePassword(value)) {
            errors.push(fieldRules.message || 'Senha deve ter no mínimo 6 caracteres');
            field.classList.add('error');
            continue;
        }
        
        // Validação de CPF
        if (fieldRules.type === 'cpf' && value && !validateCPF(value)) {
            errors.push(fieldRules.message || 'CPF inválido');
            field.classList.add('error');
            continue;
        }
        
        // Validação de valor mínimo
        if (fieldRules.min !== undefined && parseFloat(value) < fieldRules.min) {
            errors.push(fieldRules.message || `Valor mínimo: ${fieldRules.min}`);
            field.classList.add('error');
            continue;
        }
        
        // Validação de valor máximo
        if (fieldRules.max !== undefined && parseFloat(value) > fieldRules.max) {
            errors.push(fieldRules.message || `Valor máximo: ${fieldRules.max}`);
            field.classList.add('error');
            continue;
        }
        
        // Validação de comprimento mínimo
        if (fieldRules.minLength && value.length < fieldRules.minLength) {
            errors.push(fieldRules.message || `Mínimo de ${fieldRules.minLength} caracteres`);
            field.classList.add('error');
            continue;
        }
        
        // Validação de comprimento máximo
        if (fieldRules.maxLength && value.length > fieldRules.maxLength) {
            errors.push(fieldRules.message || `Máximo de ${fieldRules.maxLength} caracteres`);
            field.classList.add('error');
            continue;
        }
        
        // Validação customizada
        if (fieldRules.custom && !fieldRules.custom(value)) {
            errors.push(fieldRules.message || 'Valor inválido');
            field.classList.add('error');
            continue;
        }
        
        // Remover classe de erro se passou nas validações
        field.classList.remove('error');
    }
    
    return {
        valid: errors.length === 0,
        errors,
        data
    };
}

// Mostrar erros de validação
function showValidationErrors(errors, containerId = null) {
    if (errors.length === 0) return;
    
    const errorHtml = `
        <div class="validation-errors">
            <div class="alert alert-error">
                <i class="fas fa-exclamation-circle"></i>
                <div>
                    <strong>Erros de validação:</strong>
                    <ul>
                        ${errors.map(err => `<li>${sanitizeHTML(err)}</li>`).join('')}
                    </ul>
                </div>
            </div>
        </div>
    `;
    
    if (containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = errorHtml;
            container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    } else {
        showToast(errors[0], 'error');
    }
}

// Limpar erros de validação
function clearValidationErrors(formId) {
    const form = document.getElementById(formId);
    if (form) {
        form.querySelectorAll('.error').forEach(field => {
            field.classList.remove('error');
        });
        
        const errorContainer = form.querySelector('.validation-errors');
        if (errorContainer) {
            errorContainer.remove();
        }
    }
}

// Adicionar validação em tempo real
function addRealtimeValidation(fieldId, validationFn, errorMessage) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    
    field.addEventListener('blur', () => {
        const value = field.value.trim();
        if (value && !validationFn(value)) {
            field.classList.add('error');
            showFieldError(field, errorMessage);
        } else {
            field.classList.remove('error');
            hideFieldError(field);
        }
    });
    
    field.addEventListener('input', () => {
        if (field.classList.contains('error')) {
            const value = field.value.trim();
            if (validationFn(value)) {
                field.classList.remove('error');
                hideFieldError(field);
            }
        }
    });
}

// Mostrar erro em campo específico
function showFieldError(field, message) {
    hideFieldError(field);
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error';
    errorDiv.textContent = message;
    errorDiv.style.cssText = `
        color: #ef4444;
        font-size: 0.85rem;
        margin-top: 5px;
    `;
    
    field.parentNode.appendChild(errorDiv);
}

// Esconder erro de campo
function hideFieldError(field) {
    const errorDiv = field.parentNode.querySelector('.field-error');
    if (errorDiv) {
        errorDiv.remove();
    }
}

// Estilos CSS para validação
const validationStyles = document.createElement('style');
validationStyles.textContent = `
    .error {
        border-color: #ef4444 !important;
        background-color: #fef2f2 !important;
    }
    
    .validation-errors {
        margin-bottom: 20px;
        animation: slideDown 0.3s ease;
    }
    
    @keyframes slideDown {
        from {
            opacity: 0;
            transform: translateY(-10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    .field-error {
        animation: fadeIn 0.3s ease;
    }
    
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
`;
document.head.appendChild(validationStyles);
