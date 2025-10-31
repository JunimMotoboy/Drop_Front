// ===== SISTEMA DE EXPORT DE RELATÓRIOS =====

// Export para CSV
function exportToCSV(data, filename = 'relatorio.csv', columns = null) {
    if (!data || data.length === 0) {
        showToastEnhanced('Nenhum dado para exportar', 'warning');
        return;
    }

    // Se não especificou colunas, usar todas as chaves do primeiro objeto
    if (!columns) {
        columns = Object.keys(data[0]);
    }

    // Criar cabeçalho
    let csv = columns.map(col => {
        if (typeof col === 'object') {
            return `"${col.label || col.key}"`;
        }
        return `"${col}"`;
    }).join(',') + '\n';

    // Adicionar linhas
    data.forEach(row => {
        const values = columns.map(col => {
            const key = typeof col === 'object' ? col.key : col;
            const formatter = typeof col === 'object' ? col.formatter : null;
            
            let value = row[key];
            
            // Aplicar formatação se existir
            if (formatter && typeof formatter === 'function') {
                value = formatter(value, row);
            }
            
            // Escapar aspas e adicionar aspas ao redor
            if (value === null || value === undefined) {
                return '""';
            }
            
            value = String(value).replace(/"/g, '""');
            return `"${value}"`;
        });
        
        csv += values.join(',') + '\n';
    });

    // Download
    downloadFile(csv, filename, 'text/csv;charset=utf-8;');
    showToastEnhanced(`Arquivo ${filename} exportado com sucesso!`, 'success');
}

// Export para Excel (formato HTML que Excel pode abrir)
function exportToExcel(data, filename = 'relatorio.xls', columns = null, title = 'Relatório') {
    if (!data || data.length === 0) {
        showToastEnhanced('Nenhum dado para exportar', 'warning');
        return;
    }

    // Se não especificou colunas, usar todas as chaves do primeiro objeto
    if (!columns) {
        columns = Object.keys(data[0]).map(key => ({ key, label: key }));
    }

    // Criar HTML
    let html = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
        <head>
            <meta charset="UTF-8">
            <style>
                table { border-collapse: collapse; width: 100%; }
                th { background-color: #2563eb; color: white; padding: 10px; border: 1px solid #ddd; font-weight: bold; }
                td { padding: 8px; border: 1px solid #ddd; }
                tr:nth-child(even) { background-color: #f3f4f6; }
                .title { font-size: 18px; font-weight: bold; margin-bottom: 10px; }
                .date { color: #6b7280; margin-bottom: 20px; }
            </style>
        </head>
        <body>
            <div class="title">${title}</div>
            <div class="date">Gerado em: ${new Date().toLocaleString('pt-BR')}</div>
            <table>
                <thead>
                    <tr>
                        ${columns.map(col => `<th>${col.label || col.key}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
    `;

    // Adicionar linhas
    data.forEach(row => {
        html += '<tr>';
        columns.forEach(col => {
            const key = col.key;
            const formatter = col.formatter;
            
            let value = row[key];
            
            // Aplicar formatação se existir
            if (formatter && typeof formatter === 'function') {
                value = formatter(value, row);
            }
            
            if (value === null || value === undefined) {
                value = '';
            }
            
            html += `<td>${value}</td>`;
        });
        html += '</tr>';
    });

    html += `
                </tbody>
            </table>
        </body>
        </html>
    `;

    // Download
    downloadFile(html, filename, 'application/vnd.ms-excel');
    showToastEnhanced(`Arquivo ${filename} exportado com sucesso!`, 'success');
}

// Export para JSON
function exportToJSON(data, filename = 'relatorio.json') {
    if (!data || data.length === 0) {
        showToastEnhanced('Nenhum dado para exportar', 'warning');
        return;
    }

    const json = JSON.stringify(data, null, 2);
    downloadFile(json, filename, 'application/json');
    showToastEnhanced(`Arquivo ${filename} exportado com sucesso!`, 'success');
}

// Export para PDF (usando jsPDF - precisa incluir a biblioteca)
async function exportToPDF(data, filename = 'relatorio.pdf', options = {}) {
    const {
        title = 'Relatório',
        columns = null,
        orientation = 'portrait', // portrait ou landscape
        pageSize = 'a4'
    } = options;

    if (!data || data.length === 0) {
        showToastEnhanced('Nenhum dado para exportar', 'warning');
        return;
    }

    // Verificar se jsPDF está disponível
    if (typeof jspdf === 'undefined') {
        showToastEnhanced('Biblioteca jsPDF não carregada. Exportando como Excel...', 'warning');
        exportToExcel(data, filename.replace('.pdf', '.xls'), columns, title);
        return;
    }

    showLoadingOverlay('Gerando PDF...');

    try {
        const { jsPDF } = jspdf;
        const doc = new jsPDF(orientation, 'mm', pageSize);

        // Título
        doc.setFontSize(16);
        doc.text(title, 14, 15);

        // Data
        doc.setFontSize(10);
        doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 22);

        // Preparar colunas
        let cols = columns;
        if (!cols) {
            cols = Object.keys(data[0]).map(key => ({ key, label: key }));
        }

        const headers = [cols.map(col => col.label || col.key)];
        const rows = data.map(row => {
            return cols.map(col => {
                const key = col.key;
                const formatter = col.formatter;
                
                let value = row[key];
                
                if (formatter && typeof formatter === 'function') {
                    value = formatter(value, row);
                }
                
                return value === null || value === undefined ? '' : String(value);
            });
        });

        // Adicionar tabela
        doc.autoTable({
            head: headers,
            body: rows,
            startY: 28,
            theme: 'grid',
            headStyles: {
                fillColor: [37, 99, 235],
                textColor: 255,
                fontStyle: 'bold'
            },
            alternateRowStyles: {
                fillColor: [243, 244, 246]
            },
            margin: { top: 28 }
        });

        // Download
        doc.save(filename);
        hideLoadingOverlay();
        showToastEnhanced(`Arquivo ${filename} exportado com sucesso!`, 'success');
    } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        hideLoadingOverlay();
        showToastEnhanced('Erro ao gerar PDF. Exportando como Excel...', 'error');
        exportToExcel(data, filename.replace('.pdf', '.xls'), columns, title);
    }
}

// Função auxiliar para download de arquivo
function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
}

// Modal de opções de export
function showExportModal(data, options = {}) {
    const {
        title = 'Exportar Relatório',
        filename = 'relatorio',
        columns = null,
        reportTitle = 'Relatório'
    } = options;

    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-download"></i> ${title}</h3>
                    <button class="btn-close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <p>Escolha o formato para exportar os dados:</p>
                    <div class="export-options">
                        <button class="export-option-btn" data-format="csv">
                            <i class="fas fa-file-csv"></i>
                            <span>CSV</span>
                            <small>Compatível com Excel e Google Sheets</small>
                        </button>
                        <button class="export-option-btn" data-format="excel">
                            <i class="fas fa-file-excel"></i>
                            <span>Excel</span>
                            <small>Formato Microsoft Excel</small>
                        </button>
                        <button class="export-option-btn" data-format="json">
                            <i class="fas fa-file-code"></i>
                            <span>JSON</span>
                            <small>Formato de dados estruturados</small>
                        </button>
                        <button class="export-option-btn" data-format="pdf">
                            <i class="fas fa-file-pdf"></i>
                            <span>PDF</span>
                            <small>Documento portátil</small>
                        </button>
                    </div>
                    <div class="export-info">
                        <i class="fas fa-info-circle"></i>
                        <span>${data.length} registro(s) serão exportados</span>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Event listeners
        modal.querySelectorAll('.export-option-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const format = btn.dataset.format;
                modal.remove();

                switch (format) {
                    case 'csv':
                        exportToCSV(data, `${filename}.csv`, columns);
                        break;
                    case 'excel':
                        exportToExcel(data, `${filename}.xls`, columns, reportTitle);
                        break;
                    case 'json':
                        exportToJSON(data, `${filename}.json`);
                        break;
                    case 'pdf':
                        exportToPDF(data, `${filename}.pdf`, { title: reportTitle, columns });
                        break;
                }

                resolve(format);
            });
        });

        // Fechar ao clicar fora
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
                resolve(null);
            }
        });
    });
}

// Estilos CSS para export
const exportStyles = document.createElement('style');
exportStyles.textContent = `
    .export-options {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 15px;
        margin: 20px 0;
    }

    .export-option-btn {
        background: white;
        border: 2px solid #e5e7eb;
        border-radius: 12px;
        padding: 20px;
        cursor: pointer;
        transition: all 0.3s;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
        text-align: center;
    }

    .export-option-btn:hover {
        border-color: #2563eb;
        background: #f0f9ff;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(37, 99, 235, 0.15);
    }

    .export-option-btn i {
        font-size: 2.5rem;
        color: #2563eb;
    }

    .export-option-btn span {
        font-weight: 600;
        color: #374151;
        font-size: 1.1rem;
    }

    .export-option-btn small {
        color: #6b7280;
        font-size: 0.85rem;
    }

    .export-info {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 15px;
        background: #f0f9ff;
        border-radius: 8px;
        color: #1e40af;
        margin-top: 20px;
    }

    .export-info i {
        font-size: 1.2rem;
    }

    @media (max-width: 768px) {
        .export-options {
            grid-template-columns: 1fr;
        }
    }
`;
document.head.appendChild(exportStyles);

// Formatadores comuns
const commonFormatters = {
    date: (value) => {
        if (!value) return '';
        return new Date(value).toLocaleDateString('pt-BR');
    },
    datetime: (value) => {
        if (!value) return '';
        return new Date(value).toLocaleString('pt-BR');
    },
    money: (value) => {
        if (!value) return 'R$ 0,00';
        return parseFloat(value).toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });
    },
    phone: (value) => {
        if (!value) return '';
        const cleaned = value.replace(/\D/g, '');
        if (cleaned.length === 11) {
            return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
        } else if (cleaned.length === 10) {
            return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
        }
        return value;
    },
    cpf: (value) => {
        if (!value) return '';
        const cleaned = value.replace(/\D/g, '');
        if (cleaned.length === 11) {
            return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9)}`;
        }
        return value;
    },
    status: (value) => {
        const statusMap = {
            'aguardando': 'Aguardando',
            'em_rota': 'Em Rota',
            'entregue': 'Entregue',
            'cancelado': 'Cancelado',
            'ativo': 'Ativo',
            'inativo': 'Inativo'
        };
        return statusMap[value] || value;
    }
};
