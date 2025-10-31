// ===== SISTEMA DE PAGINAÇÃO =====

class Pagination {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.currentPage = 1;
        this.itemsPerPage = options.itemsPerPage || 10;
        this.totalItems = 0;
        this.totalPages = 0;
        this.data = [];
        this.filteredData = [];
        this.renderCallback = options.renderCallback || null;
        this.maxVisiblePages = options.maxVisiblePages || 5;
    }

    // Definir dados
    setData(data) {
        this.data = data;
        this.filteredData = data;
        this.totalItems = data.length;
        this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
        this.currentPage = 1;
        this.render();
    }

    // Aplicar filtro
    applyFilter(filterFn) {
        this.filteredData = this.data.filter(filterFn);
        this.totalItems = this.filteredData.length;
        this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
        this.currentPage = 1;
        this.render();
    }

    // Limpar filtro
    clearFilter() {
        this.filteredData = this.data;
        this.totalItems = this.data.length;
        this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
        this.currentPage = 1;
        this.render();
    }

    // Obter dados da página atual
    getCurrentPageData() {
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        return this.filteredData.slice(start, end);
    }

    // Ir para página
    goToPage(page) {
        if (page < 1 || page > this.totalPages) return;
        this.currentPage = page;
        this.render();
    }

    // Página anterior
    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.render();
        }
    }

    // Próxima página
    nextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            this.render();
        }
    }

    // Primeira página
    firstPage() {
        this.currentPage = 1;
        this.render();
    }

    // Última página
    lastPage() {
        this.currentPage = this.totalPages;
        this.render();
    }

    // Alterar itens por página
    setItemsPerPage(count) {
        this.itemsPerPage = count;
        this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
        this.currentPage = 1;
        this.render();
    }

    // Renderizar
    render() {
        // Renderizar dados
        if (this.renderCallback) {
            const pageData = this.getCurrentPageData();
            this.renderCallback(pageData);
        }

        // Renderizar controles de paginação
        this.renderControls();
    }

    // Renderizar controles
    renderControls() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        // Remover controles existentes
        const existingControls = container.querySelector('.pagination-controls');
        if (existingControls) {
            existingControls.remove();
        }

        // Se não há dados, não mostrar controles
        if (this.totalItems === 0) return;

        const controls = document.createElement('div');
        controls.className = 'pagination-controls';

        // Informações
        const start = (this.currentPage - 1) * this.itemsPerPage + 1;
        const end = Math.min(this.currentPage * this.itemsPerPage, this.totalItems);

        controls.innerHTML = `
            <div class="pagination-info">
                Mostrando ${start} a ${end} de ${this.totalItems} itens
            </div>
            <div class="pagination-buttons">
                <button class="pagination-btn" onclick="pagination_${this.containerId}.firstPage()" ${this.currentPage === 1 ? 'disabled' : ''}>
                    <i class="fas fa-angle-double-left"></i>
                </button>
                <button class="pagination-btn" onclick="pagination_${this.containerId}.previousPage()" ${this.currentPage === 1 ? 'disabled' : ''}>
                    <i class="fas fa-angle-left"></i>
                </button>
                ${this.renderPageNumbers()}
                <button class="pagination-btn" onclick="pagination_${this.containerId}.nextPage()" ${this.currentPage === this.totalPages ? 'disabled' : ''}>
                    <i class="fas fa-angle-right"></i>
                </button>
                <button class="pagination-btn" onclick="pagination_${this.containerId}.lastPage()" ${this.currentPage === this.totalPages ? 'disabled' : ''}>
                    <i class="fas fa-angle-double-right"></i>
                </button>
            </div>
            <div class="pagination-per-page">
                <label>Itens por página:</label>
                <select onchange="pagination_${this.containerId}.setItemsPerPage(parseInt(this.value))">
                    <option value="10" ${this.itemsPerPage === 10 ? 'selected' : ''}>10</option>
                    <option value="25" ${this.itemsPerPage === 25 ? 'selected' : ''}>25</option>
                    <option value="50" ${this.itemsPerPage === 50 ? 'selected' : ''}>50</option>
                    <option value="100" ${this.itemsPerPage === 100 ? 'selected' : ''}>100</option>
                </select>
            </div>
        `;

        container.appendChild(controls);
    }

    // Renderizar números de página
    renderPageNumbers() {
        if (this.totalPages <= 1) return '';

        let pages = [];
        const half = Math.floor(this.maxVisiblePages / 2);
        let start = Math.max(1, this.currentPage - half);
        let end = Math.min(this.totalPages, start + this.maxVisiblePages - 1);

        // Ajustar início se estiver no final
        if (end - start < this.maxVisiblePages - 1) {
            start = Math.max(1, end - this.maxVisiblePages + 1);
        }

        // Primeira página
        if (start > 1) {
            pages.push(`
                <button class="pagination-btn" onclick="pagination_${this.containerId}.goToPage(1)">1</button>
            `);
            if (start > 2) {
                pages.push('<span class="pagination-ellipsis">...</span>');
            }
        }

        // Páginas do meio
        for (let i = start; i <= end; i++) {
            pages.push(`
                <button class="pagination-btn ${i === this.currentPage ? 'active' : ''}" 
                        onclick="pagination_${this.containerId}.goToPage(${i})">
                    ${i}
                </button>
            `);
        }

        // Última página
        if (end < this.totalPages) {
            if (end < this.totalPages - 1) {
                pages.push('<span class="pagination-ellipsis">...</span>');
            }
            pages.push(`
                <button class="pagination-btn" onclick="pagination_${this.containerId}.goToPage(${this.totalPages})">
                    ${this.totalPages}
                </button>
            `);
        }

        return pages.join('');
    }

    // Obter estatísticas
    getStats() {
        return {
            currentPage: this.currentPage,
            totalPages: this.totalPages,
            itemsPerPage: this.itemsPerPage,
            totalItems: this.totalItems,
            start: (this.currentPage - 1) * this.itemsPerPage + 1,
            end: Math.min(this.currentPage * this.itemsPerPage, this.totalItems)
        };
    }
}

// Estilos CSS para paginação
const paginationStyles = document.createElement('style');
paginationStyles.textContent = `
    .pagination-controls {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px;
        background: white;
        border-top: 1px solid #e5e7eb;
        flex-wrap: wrap;
        gap: 15px;
    }

    .pagination-info {
        color: #6b7280;
        font-size: 0.95rem;
    }

    .pagination-buttons {
        display: flex;
        gap: 5px;
        align-items: center;
    }

    .pagination-btn {
        padding: 8px 12px;
        border: 1px solid #e5e7eb;
        background: white;
        color: #374151;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.3s;
        font-size: 0.9rem;
        min-width: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .pagination-btn:hover:not(:disabled) {
        background: #f3f4f6;
        border-color: #2563eb;
        color: #2563eb;
    }

    .pagination-btn.active {
        background: #2563eb;
        color: white;
        border-color: #2563eb;
    }

    .pagination-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .pagination-ellipsis {
        padding: 0 8px;
        color: #6b7280;
    }

    .pagination-per-page {
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .pagination-per-page label {
        color: #6b7280;
        font-size: 0.95rem;
    }

    .pagination-per-page select {
        padding: 6px 10px;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        background: white;
        color: #374151;
        cursor: pointer;
        font-size: 0.9rem;
    }

    .pagination-per-page select:focus {
        outline: none;
        border-color: #2563eb;
    }

    @media (max-width: 768px) {
        .pagination-controls {
            flex-direction: column;
            align-items: stretch;
        }

        .pagination-buttons {
            justify-content: center;
            flex-wrap: wrap;
        }

        .pagination-info,
        .pagination-per-page {
            text-align: center;
            justify-content: center;
        }
    }
`;
document.head.appendChild(paginationStyles);

// Helper para criar instância global
function createPagination(containerId, options = {}) {
    const pagination = new Pagination(containerId, options);
    window[`pagination_${containerId}`] = pagination;
    return pagination;
}
