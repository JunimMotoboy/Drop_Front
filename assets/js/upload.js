// ===== SISTEMA DE UPLOAD DE FOTOS =====

class FileUploader {
    constructor(options = {}) {
        this.maxSize = options.maxSize || 5 * 1024 * 1024; // 5MB padrão
        this.allowedTypes = options.allowedTypes || ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        this.maxFiles = options.maxFiles || 5;
        this.uploadUrl = options.uploadUrl || '/api/upload';
        this.onSuccess = options.onSuccess || null;
        this.onError = options.onError || null;
        this.onProgress = options.onProgress || null;
        this.files = [];
    }

    // Criar interface de upload
    createUploadInterface(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="upload-container">
                <div class="upload-area" id="upload-area-${containerId}">
                    <input type="file" 
                           id="file-input-${containerId}" 
                           class="file-input" 
                           accept="${this.allowedTypes.join(',')}"
                           ${this.maxFiles > 1 ? 'multiple' : ''}
                           style="display: none;">
                    <div class="upload-placeholder">
                        <i class="fas fa-cloud-upload-alt"></i>
                        <p>Arraste fotos aqui ou clique para selecionar</p>
                        <small>Máximo ${this.maxFiles} arquivo(s) • Até ${this.formatFileSize(this.maxSize)} cada</small>
                        <small>Formatos: JPG, PNG, GIF, WEBP</small>
                    </div>
                </div>
                <div class="upload-preview" id="upload-preview-${containerId}"></div>
            </div>
        `;

        this.setupEventListeners(containerId);
    }

    // Configurar event listeners
    setupEventListeners(containerId) {
        const uploadArea = document.getElementById(`upload-area-${containerId}`);
        const fileInput = document.getElementById(`file-input-${containerId}`);

        // Click para abrir seletor
        uploadArea.addEventListener('click', () => {
            fileInput.click();
        });

        // Seleção de arquivo
        fileInput.addEventListener('change', (e) => {
            this.handleFiles(e.target.files, containerId);
        });

        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('drag-over');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('drag-over');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
            this.handleFiles(e.dataTransfer.files, containerId);
        });
    }

    // Processar arquivos
    handleFiles(fileList, containerId) {
        const files = Array.from(fileList);

        // Validar número de arquivos
        if (this.files.length + files.length > this.maxFiles) {
            showToastEnhanced(`Máximo de ${this.maxFiles} arquivo(s) permitido(s)`, 'error');
            return;
        }

        // Validar cada arquivo
        const validFiles = [];
        for (const file of files) {
            const validation = this.validateFile(file);
            if (validation.valid) {
                validFiles.push(file);
            } else {
                showToastEnhanced(validation.error, 'error');
            }
        }

        if (validFiles.length > 0) {
            this.files.push(...validFiles);
            this.renderPreviews(containerId);
        }
    }

    // Validar arquivo
    validateFile(file) {
        // Validar tipo
        if (!this.allowedTypes.includes(file.type)) {
            return {
                valid: false,
                error: `Tipo de arquivo não permitido: ${file.name}`
            };
        }

        // Validar tamanho
        if (file.size > this.maxSize) {
            return {
                valid: false,
                error: `Arquivo muito grande: ${file.name} (máximo ${this.formatFileSize(this.maxSize)})`
            };
        }

        return { valid: true };
    }

    // Renderizar previews
    renderPreviews(containerId) {
        const previewContainer = document.getElementById(`upload-preview-${containerId}`);
        if (!previewContainer) return;

        previewContainer.innerHTML = '';

        this.files.forEach((file, index) => {
            const preview = document.createElement('div');
            preview.className = 'upload-preview-item';
            preview.innerHTML = `
                <div class="preview-image" id="preview-${containerId}-${index}">
                    <div class="preview-loading">
                        <div class="spinner"></div>
                    </div>
                </div>
                <div class="preview-info">
                    <span class="preview-name">${file.name}</span>
                    <span class="preview-size">${this.formatFileSize(file.size)}</span>
                </div>
                <button class="preview-remove" onclick="fileUploader_${containerId}.removeFile(${index})">
                    <i class="fas fa-times"></i>
                </button>
                <div class="preview-progress" id="progress-${containerId}-${index}" style="display: none;">
                    <div class="progress-bar-fill" style="width: 0%"></div>
                </div>
            `;

            previewContainer.appendChild(preview);

            // Carregar preview da imagem
            this.loadImagePreview(file, `preview-${containerId}-${index}`);
        });
    }

    // Carregar preview da imagem
    loadImagePreview(file, elementId) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const element = document.getElementById(elementId);
            if (element) {
                element.style.backgroundImage = `url(${e.target.result})`;
                element.querySelector('.preview-loading').remove();
            }
        };
        reader.readAsDataURL(file);
    }

    // Remover arquivo
    removeFile(index) {
        this.files.splice(index, 1);
        this.renderPreviews(this.currentContainerId);
    }

    // Upload de arquivos
    async uploadFiles(containerId) {
        if (this.files.length === 0) {
            showToastEnhanced('Nenhum arquivo selecionado', 'warning');
            return;
        }

        this.currentContainerId = containerId;
        const results = [];

        showLoadingOverlay('Enviando arquivos...');

        for (let i = 0; i < this.files.length; i++) {
            const file = this.files[i];
            
            try {
                const result = await this.uploadSingleFile(file, i, containerId);
                results.push(result);
            } catch (error) {
                console.error('Erro no upload:', error);
                results.push({ success: false, file: file.name, error: error.message });
            }
        }

        hideLoadingOverlay();

        // Callback de sucesso
        if (this.onSuccess) {
            this.onSuccess(results);
        }

        // Mostrar resultado
        const successCount = results.filter(r => r.success).length;
        const errorCount = results.length - successCount;

        if (errorCount === 0) {
            showToastEnhanced(`${successCount} arquivo(s) enviado(s) com sucesso!`, 'success');
        } else {
            showToastEnhanced(`${successCount} enviado(s), ${errorCount} com erro`, 'warning');
        }

        return results;
    }

    // Upload de arquivo único
    async uploadSingleFile(file, index, containerId) {
        const formData = new FormData();
        formData.append('file', file);

        const progressElement = document.getElementById(`progress-${containerId}-${index}`);
        if (progressElement) {
            progressElement.style.display = 'block';
        }

        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();

            // Progress
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percentComplete = (e.loaded / e.total) * 100;
                    
                    if (progressElement) {
                        const fill = progressElement.querySelector('.progress-bar-fill');
                        if (fill) {
                            fill.style.width = `${percentComplete}%`;
                        }
                    }

                    if (this.onProgress) {
                        this.onProgress(percentComplete, index, file);
                    }
                }
            });

            // Load
            xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        resolve({
                            success: true,
                            file: file.name,
                            data: response
                        });
                    } catch (error) {
                        resolve({
                            success: true,
                            file: file.name,
                            data: { url: xhr.responseText }
                        });
                    }
                } else {
                    reject(new Error(`Erro no upload: ${xhr.status}`));
                }
            });

            // Error
            xhr.addEventListener('error', () => {
                reject(new Error('Erro de rede no upload'));
            });

            // Enviar
            xhr.open('POST', this.uploadUrl);
            
            // Adicionar token se existir
            const token = getToken();
            if (token) {
                xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            }
            
            xhr.send(formData);
        });
    }

    // Formatar tamanho de arquivo
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    // Limpar arquivos
    clear() {
        this.files = [];
        if (this.currentContainerId) {
            this.renderPreviews(this.currentContainerId);
        }
    }

    // Obter arquivos
    getFiles() {
        return this.files;
    }
}

// Estilos CSS para upload
const uploadStyles = document.createElement('style');
uploadStyles.textContent = `
    .upload-container {
        margin: 20px 0;
    }

    .upload-area {
        border: 2px dashed #d1d5db;
        border-radius: 12px;
        padding: 40px 20px;
        text-align: center;
        cursor: pointer;
        transition: all 0.3s;
        background: #f9fafb;
    }

    .upload-area:hover {
        border-color: #2563eb;
        background: #f0f9ff;
    }

    .upload-area.drag-over {
        border-color: #2563eb;
        background: #dbeafe;
        transform: scale(1.02);
    }

    .upload-placeholder i {
        font-size: 3rem;
        color: #2563eb;
        margin-bottom: 15px;
    }

    .upload-placeholder p {
        font-size: 1.1rem;
        color: #374151;
        margin-bottom: 10px;
        font-weight: 500;
    }

    .upload-placeholder small {
        display: block;
        color: #6b7280;
        font-size: 0.9rem;
        margin-top: 5px;
    }

    .upload-preview {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        gap: 15px;
        margin-top: 20px;
    }

    .upload-preview-item {
        position: relative;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        overflow: hidden;
        background: white;
    }

    .preview-image {
        width: 100%;
        height: 150px;
        background-size: cover;
        background-position: center;
        background-color: #f3f4f6;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .preview-loading {
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .preview-info {
        padding: 10px;
        display: flex;
        flex-direction: column;
        gap: 5px;
    }

    .preview-name {
        font-size: 0.85rem;
        color: #374151;
        font-weight: 500;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .preview-size {
        font-size: 0.75rem;
        color: #6b7280;
    }

    .preview-remove {
        position: absolute;
        top: 5px;
        right: 5px;
        background: rgba(239, 68, 68, 0.9);
        color: white;
        border: none;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s;
    }

    .preview-remove:hover {
        background: #dc2626;
        transform: scale(1.1);
    }

    .preview-progress {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: #e5e7eb;
    }

    .preview-progress .progress-bar-fill {
        height: 100%;
        background: #2563eb;
        transition: width 0.3s;
    }

    @media (max-width: 768px) {
        .upload-preview {
            grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
        }

        .preview-image {
            height: 120px;
        }
    }
`;
document.head.appendChild(uploadStyles);

// Helper para criar instância global
function createFileUploader(containerId, options = {}) {
    const uploader = new FileUploader(options);
    uploader.createUploadInterface(containerId);
    window[`fileUploader_${containerId}`] = uploader;
    return uploader;
}
