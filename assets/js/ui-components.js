// ===== COMPONENTES DE UI MELHORADOS =====

// ===== LOADING STATES =====

// Mostrar loading em botão
function showButtonLoading(buttonElement, loadingText = 'Carregando...') {
    if (!buttonElement) return;
    
    // Salvar estado original
    buttonElement.dataset.originalText = buttonElement.innerHTML;
    buttonElement.dataset.originalDisabled = buttonElement.disabled;
    
    // Aplicar loading
    buttonElement.disabled = true;
    buttonElement.innerHTML = `
        <span class="btn-loading">
            <span class="spinner"></span>
            <span>${loadingText}</span>
        </span>
    `;
    buttonElement.classList.add('loading');
}

// Esconder loading do botão
function hideButtonLoading(buttonElement) {
    if (!buttonElement || !buttonElement.dataset.originalText) return;
    
    buttonElement.innerHTML = buttonElement.dataset.originalText;
    buttonElement.disabled = buttonElement.dataset.originalDisabled === 'true';
    buttonElement.classList.remove('loading');
    
    delete buttonElement.dataset.originalText;
    delete buttonElement.dataset.originalDisabled;
}

// Mostrar loading em container
function showContainerLoading(containerId, message = 'Carregando...') {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = `
        <div class="loading-container">
            <div class="loading-spinner"></div>
            <p class="loading-message">${message}</p>
        </div>
    `;
}

// Mostrar loading overlay (tela inteira)
function showLoadingOverlay(message = 'Processando...') {
    // Remover overlay existente
    hideLoadingOverlay();
    
    const overlay = document.createElement('div');
    overlay.id = 'loading-overlay';
    overlay.className = 'loading-overlay';
    overlay.innerHTML = `
        <div class="loading-overlay-content">
            <div class="loading-spinner-large"></div>
            <p class="loading-overlay-message">${message}</p>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Prevenir scroll
    document.body.style.overflow = 'hidden';
}

// Esconder loading overlay
function hideLoadingOverlay() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.remove();
        document.body.style.overflow = '';
    }
}

// ===== CONFIRMAÇÕES =====

// Modal de confirmação customizado
function showConfirmDialog(options) {
    const {
        title = 'Confirmar',
        message = 'Tem certeza?',
        confirmText = 'Confirmar',
        cancelText = 'Cancelar',
        type = 'warning', // warning, danger, info
        onConfirm = () => {},
        onCancel = () => {}
    } = options;
    
    return new Promise((resolve) => {
        // Remover diálogo existente
        const existingDialog = document.getElementById('confirm-dialog');
        if (existingDialog) existingDialog.remove();
        
        // Criar diálogo
        const dialog = document.createElement('div');
        dialog.id = 'confirm-dialog';
        dialog.className = 'confirm-dialog-overlay';
        dialog.innerHTML = `
            <div class="confirm-dialog">
                <div class="confirm-dialog-header ${type}">
                    <i class="fas fa-${type === 'danger' ? 'exclamation-triangle' : type === 'info' ? 'info-circle' : 'question-circle'}"></i>
                    <h3>${title}</h3>
                </div>
                <div class="confirm-dialog-body">
                    <p>${message}</p>
                </div>
                <div class="confirm-dialog-footer">
                    <button class="btn btn-outline" id="confirm-cancel">${cancelText}</button>
                    <button class="btn btn-${type === 'danger' ? 'danger' : 'primary'}" id="confirm-ok">${confirmText}</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        // Focar no botão de confirmar
        setTimeout(() => {
            document.getElementById('confirm-ok').focus();
        }, 100);
        
        // Event listeners
        const handleConfirm = () => {
            dialog.remove();
            onConfirm();
            resolve(true);
        };
        
        const handleCancel = () => {
            dialog.remove();
            onCancel();
            resolve(false);
        };
        
        document.getElementById('confirm-ok').addEventListener('click', handleConfirm);
        document.getElementById('confirm-cancel').addEventListener('click', handleCancel);
        
        // Fechar ao clicar fora
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                handleCancel();
            }
        });
        
        // Fechar com ESC
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                handleCancel();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    });
}

// Confirmação rápida para ações perigosas
async function confirmDangerousAction(message, actionName = 'esta ação') {
    return await showConfirmDialog({
        title: 'Atenção!',
        message: message || `Tem certeza que deseja realizar ${actionName}? Esta ação não pode ser desfeita.`,
        confirmText: 'Sim, continuar',
        cancelText: 'Cancelar',
        type: 'danger'
    });
}

// ===== FEEDBACK VISUAL =====

// Toast melhorado com mais opções
function showToastEnhanced(message, type = 'info', duration = 3000, options = {}) {
    const {
        position = 'top-right', // top-right, top-left, bottom-right, bottom-left, top-center
        closable = true,
        icon = true,
        action = null // { text: 'Ação', onClick: () => {} }
    } = options;
    
    const toast = document.createElement('div');
    toast.className = `toast-enhanced toast-${type} toast-${position}`;
    
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    
    toast.innerHTML = `
        ${icon ? `<i class="fas fa-${icons[type] || 'info-circle'}"></i>` : ''}
        <span class="toast-message">${message}</span>
        ${action ? `<button class="toast-action">${action.text}</button>` : ''}
        ${closable ? '<button class="toast-close">&times;</button>' : ''}
    `;
    
    document.body.appendChild(toast);
    
    // Animação de entrada
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Event listeners
    if (closable) {
        toast.querySelector('.toast-close').addEventListener('click', () => {
            removeToast(toast);
        });
    }
    
    if (action) {
        toast.querySelector('.toast-action').addEventListener('click', () => {
            action.onClick();
            removeToast(toast);
        });
    }
    
    // Auto-remover
    if (duration > 0) {
        setTimeout(() => removeToast(toast), duration);
    }
    
    return toast;
}

function removeToast(toast) {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
}

// Progress bar
function showProgressBar(containerId, progress = 0, message = '') {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    let progressBar = container.querySelector('.progress-bar-container');
    
    if (!progressBar) {
        progressBar = document.createElement('div');
        progressBar.className = 'progress-bar-container';
        progressBar.innerHTML = `
            <div class="progress-bar-message"></div>
            <div class="progress-bar">
                <div class="progress-bar-fill"></div>
                <div class="progress-bar-text">0%</div>
            </div>
        `;
        container.appendChild(progressBar);
    }
    
    const fill = progressBar.querySelector('.progress-bar-fill');
    const text = progressBar.querySelector('.progress-bar-text');
    const messageEl = progressBar.querySelector('.progress-bar-message');
    
    fill.style.width = `${progress}%`;
    text.textContent = `${Math.round(progress)}%`;
    messageEl.textContent = message;
}

// Badge de notificação
function updateNotificationBadge(elementId, count) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    let badge = element.querySelector('.notification-badge');
    
    if (count > 0) {
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'notification-badge';
            element.style.position = 'relative';
            element.appendChild(badge);
        }
        badge.textContent = count > 99 ? '99+' : count;
        badge.style.display = 'flex';
    } else if (badge) {
        badge.style.display = 'none';
    }
}

// Skeleton loading (placeholder)
function showSkeleton(containerId, type = 'list', count = 3) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const skeletons = {
        list: `
            <div class="skeleton-item">
                <div class="skeleton-avatar"></div>
                <div class="skeleton-content">
                    <div class="skeleton-line"></div>
                    <div class="skeleton-line short"></div>
                </div>
            </div>
        `,
        card: `
            <div class="skeleton-card">
                <div class="skeleton-image"></div>
                <div class="skeleton-line"></div>
                <div class="skeleton-line short"></div>
            </div>
        `,
        table: `
            <div class="skeleton-table-row">
                <div class="skeleton-line"></div>
                <div class="skeleton-line"></div>
                <div class="skeleton-line"></div>
            </div>
        `
    };
    
    const skeletonHTML = Array(count).fill(skeletons[type] || skeletons.list).join('');
    container.innerHTML = `<div class="skeleton-container">${skeletonHTML}</div>`;
}

// Animação de sucesso
function showSuccessAnimation(containerId, message = 'Sucesso!') {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const animation = document.createElement('div');
    animation.className = 'success-animation';
    animation.innerHTML = `
        <div class="success-checkmark">
            <div class="check-icon">
                <span class="icon-line line-tip"></span>
                <span class="icon-line line-long"></span>
                <div class="icon-circle"></div>
                <div class="icon-fix"></div>
            </div>
        </div>
        <p class="success-message">${message}</p>
    `;
    
    container.appendChild(animation);
    
    setTimeout(() => {
        animation.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        animation.remove();
    }, 3000);
}

// Empty state customizado
function showEmptyState(containerId, options = {}) {
    const {
        icon = 'inbox',
        title = 'Nenhum item encontrado',
        message = 'Não há dados para exibir no momento.',
        actionText = null,
        actionCallback = null
    } = options;
    
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = `
        <div class="empty-state-custom">
            <i class="fas fa-${icon}"></i>
            <h3>${title}</h3>
            <p>${message}</p>
            ${actionText ? `<button class="btn btn-primary" onclick="(${actionCallback})()">${actionText}</button>` : ''}
        </div>
    `;
}

// ===== ESTILOS CSS =====

const uiComponentsStyles = document.createElement('style');
uiComponentsStyles.textContent = `
    /* Loading Button */
    .btn.loading {
        opacity: 0.7;
        cursor: not-allowed;
    }
    
    .btn-loading {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
    }
    
    .spinner {
        width: 16px;
        height: 16px;
        border: 2px solid rgba(255,255,255,0.3);
        border-top-color: white;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
    }
    
    /* Loading Overlay */
    .loading-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        animation: fadeIn 0.3s ease;
    }
    
    .loading-overlay-content {
        text-align: center;
        color: white;
    }
    
    .loading-spinner-large {
        width: 60px;
        height: 60px;
        border: 4px solid rgba(255,255,255,0.3);
        border-top-color: white;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 20px;
    }
    
    .loading-overlay-message {
        font-size: 1.1rem;
        font-weight: 500;
    }
    
    /* Confirm Dialog */
    .confirm-dialog-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        animation: fadeIn 0.3s ease;
    }
    
    .confirm-dialog {
        background: white;
        border-radius: 12px;
        max-width: 500px;
        width: 90%;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        animation: slideUp 0.3s ease;
    }
    
    .confirm-dialog-header {
        padding: 20px;
        border-bottom: 2px solid #e5e7eb;
        display: flex;
        align-items: center;
        gap: 15px;
    }
    
    .confirm-dialog-header.warning {
        background: #fef3c7;
        color: #92400e;
    }
    
    .confirm-dialog-header.danger {
        background: #fee2e2;
        color: #991b1b;
    }
    
    .confirm-dialog-header.info {
        background: #dbeafe;
        color: #1e40af;
    }
    
    .confirm-dialog-header i {
        font-size: 2rem;
    }
    
    .confirm-dialog-header h3 {
        margin: 0;
        font-size: 1.3rem;
    }
    
    .confirm-dialog-body {
        padding: 30px 20px;
    }
    
    .confirm-dialog-body p {
        margin: 0;
        font-size: 1.05rem;
        color: #374151;
        line-height: 1.6;
    }
    
    .confirm-dialog-footer {
        padding: 20px;
        border-top: 1px solid #e5e7eb;
        display: flex;
        gap: 10px;
        justify-content: flex-end;
    }
    
    /* Toast Enhanced */
    .toast-enhanced {
        position: fixed;
        background: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 300px;
        max-width: 500px;
        z-index: 10001;
        opacity: 0;
        transform: translateY(-20px);
        transition: all 0.3s ease;
    }
    
    .toast-enhanced.show {
        opacity: 1;
        transform: translateY(0);
    }
    
    .toast-enhanced.toast-top-right {
        top: 20px;
        right: 20px;
    }
    
    .toast-enhanced.toast-top-left {
        top: 20px;
        left: 20px;
    }
    
    .toast-enhanced.toast-bottom-right {
        bottom: 20px;
        right: 20px;
    }
    
    .toast-enhanced.toast-bottom-left {
        bottom: 20px;
        left: 20px;
    }
    
    .toast-enhanced.toast-top-center {
        top: 20px;
        left: 50%;
        transform: translateX(-50%) translateY(-20px);
    }
    
    .toast-enhanced.toast-top-center.show {
        transform: translateX(-50%) translateY(0);
    }
    
    .toast-enhanced i {
        font-size: 1.5rem;
    }
    
    .toast-enhanced.toast-success {
        border-left: 4px solid #10b981;
    }
    
    .toast-enhanced.toast-success i {
        color: #10b981;
    }
    
    .toast-enhanced.toast-error {
        border-left: 4px solid #ef4444;
    }
    
    .toast-enhanced.toast-error i {
        color: #ef4444;
    }
    
    .toast-enhanced.toast-warning {
        border-left: 4px solid #f59e0b;
    }
    
    .toast-enhanced.toast-warning i {
        color: #f59e0b;
    }
    
    .toast-enhanced.toast-info {
        border-left: 4px solid #2563eb;
    }
    
    .toast-enhanced.toast-info i {
        color: #2563eb;
    }
    
    .toast-message {
        flex: 1;
        color: #374151;
    }
    
    .toast-action {
        background: transparent;
        border: none;
        color: #2563eb;
        font-weight: 600;
        cursor: pointer;
        padding: 5px 10px;
        border-radius: 4px;
        transition: background 0.3s;
    }
    
    .toast-action:hover {
        background: #f3f4f6;
    }
    
    .toast-close {
        background: transparent;
        border: none;
        font-size: 1.5rem;
        color: #6b7280;
        cursor: pointer;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: background 0.3s;
    }
    
    .toast-close:hover {
        background: #f3f4f6;
    }
    
    /* Progress Bar */
    .progress-bar-container {
        margin: 20px 0;
    }
    
    .progress-bar-message {
        margin-bottom: 10px;
        color: #374151;
        font-weight: 500;
    }
    
    .progress-bar {
        height: 30px;
        background: #e5e7eb;
        border-radius: 15px;
        overflow: hidden;
        position: relative;
    }
    
    .progress-bar-fill {
        height: 100%;
        background: linear-gradient(90deg, #2563eb, #1e40af);
        transition: width 0.3s ease;
        border-radius: 15px;
    }
    
    .progress-bar-text {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: white;
        font-weight: 600;
        text-shadow: 0 1px 2px rgba(0,0,0,0.3);
    }
    
    /* Notification Badge */
    .notification-badge {
        position: absolute;
        top: -8px;
        right: -8px;
        background: #ef4444;
        color: white;
        border-radius: 10px;
        padding: 2px 6px;
        font-size: 0.75rem;
        font-weight: 700;
        min-width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
    
    /* Skeleton Loading */
    .skeleton-container {
        animation: fadeIn 0.3s ease;
    }
    
    .skeleton-item, .skeleton-card, .skeleton-table-row {
        background: white;
        padding: 15px;
        border-radius: 8px;
        margin-bottom: 10px;
    }
    
    .skeleton-item {
        display: flex;
        gap: 15px;
    }
    
    .skeleton-avatar {
        width: 50px;
        height: 50px;
        border-radius: 50%;
        background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
    }
    
    .skeleton-content {
        flex: 1;
    }
    
    .skeleton-line {
        height: 12px;
        background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
        border-radius: 4px;
        margin-bottom: 8px;
    }
    
    .skeleton-line.short {
        width: 60%;
    }
    
    .skeleton-image {
        height: 150px;
        background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
        border-radius: 8px;
        margin-bottom: 10px;
    }
    
    @keyframes shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
    }
    
    /* Success Animation */
    .success-animation {
        text-align: center;
        padding: 40px;
        opacity: 0;
        transform: scale(0.8);
        transition: all 0.5s ease;
    }
    
    .success-animation.show {
        opacity: 1;
        transform: scale(1);
    }
    
    .success-checkmark {
        width: 80px;
        height: 80px;
        margin: 0 auto 20px;
        border-radius: 50%;
        display: block;
        stroke-width: 2;
        stroke: #10b981;
        stroke-miterlimit: 10;
        box-shadow: inset 0px 0px 0px #10b981;
        animation: fill 0.4s ease-in-out 0.4s forwards, scale 0.3s ease-in-out 0.9s both;
        position: relative;
    }
    
    .check-icon {
        width: 80px;
        height: 80px;
        position: relative;
        border-radius: 50%;
        box-sizing: content-box;
        border: 4px solid #10b981;
    }
    
    .icon-line {
        height: 5px;
        background-color: #10b981;
        display: block;
        border-radius: 2px;
        position: absolute;
        z-index: 10;
    }
    
    .icon-line.line-tip {
        top: 46px;
        left: 14px;
        width: 25px;
        transform: rotate(45deg);
        animation: icon-line-tip 0.75s;
    }
    
    .icon-line.line-long {
        top: 38px;
        right: 8px;
        width: 47px;
        transform: rotate(-45deg);
        animation: icon-line-long 0.75s;
    }
    
    .icon-circle {
        top: -4px;
        left: -4px;
        z-index: 10;
        width: 80px;
        height: 80px;
        border-radius: 50%;
        position: absolute;
        box-sizing: content-box;
        border: 4px solid rgba(16, 185, 129, 0.5);
    }
    
    .icon-fix {
        top: 8px;
        width: 5px;
        left: 26px;
        z-index: 1;
        height: 85px;
        position: absolute;
        transform: rotate(-45deg);
        background-color: white;
    }
    
    @keyframes icon-line-tip {
        0% { width: 0; left: 1px; top: 19px; }
        54% { width: 0; left: 1px; top: 19px; }
        70% { width: 50px; left: -8px; top: 37px; }
        84% { width: 17px; left: 21px; top: 48px; }
        100% { width: 25px; left: 14px; top: 45px; }
    }
    
    @keyframes icon-line-long {
        0% { width: 0; right: 46px; top: 54px; }
        65% { width: 0; right: 46px; top: 54px; }
        84% { width: 55px; right: 0px; top: 35px; }
        100% { width: 47px; right: 8px; top: 38px; }
    }
    
    /* Empty State */
    .empty-state-custom {
        text-align: center;
        padding: 60px 20px;
        color: #6b7280;
    }
    
    .empty-state-custom i {
        font-size: 5rem;
        color: #d1d5db;
        margin-bottom: 20px;
    }
    
    .empty-state-custom h3 {
        color: #374151;
        margin-bottom: 10px;
        font-size: 1.5rem;
    }
    
    .empty-state-custom p {
        margin-bottom: 20px;
        font-size: 1.05rem;
    }
    
    /* Animations */
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    
    @keyframes slideUp {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
`;
document.head.appendChild(uiComponentsStyles);
