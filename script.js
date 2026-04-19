let ultimoProduto = null;

// Alternar abas
function switchTab(type) {
    document.querySelectorAll('.tabs button').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    const searchDiv = document.getElementById("searchFields");
    searchDiv.innerHTML = '';

    let label = '', placeholder = '';
    switch (type) {
        case 'barcode':
            label = 'Código de barras:';
            placeholder = 'Digite o código de barras';
            console.log('Barcode selected');
            break;
        case 'nome':
            label = 'Nome do produto:';
            placeholder = 'Digite o nome do produto';
            console.log('Nome selected');
            break;
        case 'categoria':
            label = 'Categoria (em inglês):';
            placeholder = 'Ex: Orange juices';
            console.log('Categoria selected');
            break;
        case 'nutriscore':
            label = 'Nutri-Score (A-E):';
            placeholder = 'Ex: A';
            console.log('Nutriscore selected');
            break;
        case 'ecoscore':
            label = 'Eco-Score (A-E):';
            placeholder = 'Ex: B';
            console.log('Ecoscore selected');
            break;
    }

    searchDiv.innerHTML = `
        <label class="search-label">${label}</label>
        <input type="text" id="searchInput" placeholder="${placeholder}">
        <button class="action" onclick="executarBusca('${type}')">Buscar</button>
      `;
}


function renderEcoScore(product) {
    const ecoscore = product.ecoscore_data && product.ecoscore_data.grade
        ? product.ecoscore_data.grade.toUpperCase()
        : 'N/A';
    let mensagem = '';
    if (ecoscore === 'N/A' || ecoscore === 'NOT-APPLICABLE') {
        mensagem = 'Este produto ainda não possui avaliação de impacto ecológico na base Open Food Facts.';
    } else {
        switch (ecoscore) {
            case 'A': mensagem = 'Impacto ecológico muito baixo (Excelente)'; break;
            case 'B': mensagem = 'Impacto ecológico baixo (Bom)'; break;
            case 'C': mensagem = 'Impacto ecológico moderado'; break;
            case 'D': mensagem = 'Impacto ecológico alto'; break;
            case 'E': mensagem = 'Impacto ecológico muito alto (Ruim)'; break;
            default: mensagem = 'Pontuação ecológica não disponível para este produto.'; break;
        }
    }
    let nutriscore = '';
    if (product.nutrition_grades) {
        nutriscore = `<div class="nutriscore"><span>Nutri-Score:</span> ${product.nutrition_grades.toUpperCase()}</div>`;
    }
    return `
      <div class="result">
        <div><strong>Produto:</strong> ${product.product_name || 'Nome não disponível'}</div>
        <div class="score"><strong>Eco-Score:</strong> ${ecoscore}</div>
        <div>${mensagem}</div>
        ${nutriscore}
        <div class="actions">
          <button id="btnSalvarProduto" class="save-btn">Salvar produto</button>
        </div>
      </div>
    `;
}

function showToast(msg, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.className = `toast show ${type}`;
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function renderSavedProducts(produtos) {
    const area = document.getElementById('savedProductsArea');
    const lista = document.getElementById('savedList');
    const mediaDiv = document.getElementById('mediaImpacto');

    if (!produtos.length) {
        area.style.display = 'none';
        mediaDiv.textContent = '';
        return;
    }
    area.style.display = '';
    lista.innerHTML = '';
    let soma = 0, qtd = 0;

    produtos.forEach(prod => {
        let impacto = impactoNumerico(prod.ecoscore);
        if (impacto !== null) {
            soma += impacto;
            qtd++;
        }
        const nutriscore = prod.nutriscore ? prod.nutriscore.toUpperCase() : 'N/A';

        lista.innerHTML += `
        <li class="saved-card">
          <div style="flex-grow: 1;">
            <strong title="${prod.product_name}">${prod.product_name}</strong>
            <div class="scores">
              <span class="eco">Eco: ${prod.ecoscore}</span>
              <span class="nutri">Nutri: ${nutriscore}</span>
            </div>
          </div>
          <div class="saved-card-actions">
            <button class="view-btn" data-barcode="${prod.barcode}">🔍 Analisar</button>
            <button class="delete-btn" data-barcode="${prod.barcode}">🗑️ Excluir</button>
          </div>
        </li>
      `;
    });
    if (qtd) {
        const media = soma / qtd;
        let mediaTexto = '';
        if (media < 1.5) mediaTexto = 'Média de impacto: Muito baixo (A) - Parabéns, você é um ECO-herói!';
        else if (media < 2.5) mediaTexto = 'Média de impacto: Baixo (B) - Continue assim! Você é quase um ECO-herói!';
        else if (media < 3.5) mediaTexto = 'Média de impacto: Moderado (C) - Você está no caminho certo, mas pode melhorar!';
        else if (media < 4.5) mediaTexto = 'Média de impacto: Alto (D) - Hora de rever suas escolhas!';
        else mediaTexto = 'Média de impacto: Muito alto (E) - Precisamos conversar sobre suas escolhas!';
        mediaDiv.textContent = mediaTexto;
    } else {
        mediaDiv.textContent = 'Nenhum produto com Eco-Score disponível.';
    }

    lista.querySelectorAll('.delete-btn').forEach(btn => {
        btn.onclick = () => {
            const barcode = btn.getAttribute('data-barcode');
            excluirProduto(barcode);
        };
    });

    lista.querySelectorAll('.view-btn').forEach(btn => {
        btn.onclick = () => {
            const barcode = btn.getAttribute('data-barcode');
            selecionarProdutoGaleria(barcode);
        };
    });
}

function impactoNumerico(ecoscore) {
    switch ((ecoscore || '').toUpperCase()) {
        case 'A': return 1;
        case 'B': return 2;
        case 'C': return 3;
        case 'D': return 4;
        case 'E': return 5;
        default: return null;
    }
}

async function salvarProduto() {
    if (!ultimoProduto) return;

    const res = await fetch('http://localhost:8080/produto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            product_name: ultimoProduto.product_name || '',
            barcode: ultimoProduto.code || ultimoProduto.barcode || '',
            ecoscore: (ultimoProduto.ecoscore_data?.grade)
                ? ultimoProduto.ecoscore_data.grade.toUpperCase()
                : 'N/A',
            nutriscore: ultimoProduto.nutrition_grades
                ? ultimoProduto.nutrition_grades.toUpperCase()
                : 'N/A'
        })
    });

    const data = await res.json();

    if (data.cod === 204 || data.cod === 200) {
        showToast('Produto salvo com sucesso!', 'success');
        carregarProdutosSalvos();
    } else {
        showToast(`Erro ao salvar produto: ${data.msg || 'Desconhecido'}`, 'error');
    }
}

async function excluirProduto(barcode) {
    const res = await fetch(`http://localhost:8080/produto/${barcode}`, {
        method: 'DELETE'
    });

    if (res.status === 204 || res.status === 200) {
        showToast('Produto excluído com sucesso!', 'success');
        carregarProdutosSalvos();
    } else {
        showToast('Erro ao excluir produto!', 'error');
    }
}

async function carregarProdutosSalvos() {
    const res = await fetch('http://localhost:8080/produto');
    const data = await res.json();

    if (data.cod === 200 && data.Produtos?.dados) {
        renderSavedProducts(data.Produtos.dados);
    } else {
        renderSavedProducts([]);
    }
}

async function executarBusca(type) {
    const input = document.getElementById('searchInput').value.trim();
    const output = document.getElementById('output');
    output.innerHTML = '';

    if (!input) {
        output.innerHTML = '<div class="error">Digite um valor válido.</div>';
        return;
    }

    let url = '';

    switch (type) {
        case 'barcode':
            url = `https://world.openfoodfacts.net/api/v2/product/${input}?fields=product_name,nutriscore_data,nutrition_grades,ecoscore_data,code`;
            break;

        case 'nome':
            url = `https://world.openfoodfacts.net/api/v2/search?search_terms=${encodeURIComponent(input)}&fields=product_name,nutrition_grades,ecoscore_data,code&page_size=10`;
            break;

        case 'categoria':
            url = `https://world.openfoodfacts.net/api/v2/search?categories_tags_en=${encodeURIComponent(input)}&fields=product_name,nutrition_grades,ecoscore_data,code&page_size=10`;
            break;

        case 'nutriscore':
            url = `https://world.openfoodfacts.net/api/v2/search?nutrition_grades_tags=${input.toLowerCase()}&fields=product_name,nutrition_grades,ecoscore_data,code&page_size=10`;
            break;

        case 'ecoscore':
            url = `https://world.openfoodfacts.net/api/v2/search?ecoscore_tags=${input.toLowerCase()}&fields=product_name,nutrition_grades,ecoscore_data,code&page_size=10`;
            break;
    }

    output.innerHTML = 'Buscando...';

    try {
        const res = await fetch(url);
        const data = await res.json();

        if (type === 'barcode') {
            if (data.status !== 1) {
                output.innerHTML = '<div class="error">Produto não encontrado.</div>';
                ultimoProduto = null;
                return;
            }
            ultimoProduto = data.product;
            output.innerHTML = renderEcoScore(data.product);
            document.getElementById('btnSalvarProduto').onclick = salvarProduto;
        } else {
            if (!data.products || data.products.length === 0) {
                output.innerHTML = '<div class="error">Nenhum produto encontrado.</div>';
                return;
            }
            output.innerHTML = '';
            data.products.forEach(prod => {
                ultimoProduto = prod; // mantém último para salvar
                output.innerHTML += renderEcoScore(prod);
            });

            // adiciona listener em todos os botões salvar
            document.querySelectorAll('#btnSalvarProduto').forEach(btn => {
                btn.onclick = salvarProduto;
            });
        }
    } catch (e) {
        console.error(e);
        output.innerHTML = '<div class="error">Erro ao consultar a API.</div>';
        ultimoProduto = null;
    }
}

// MAPA

const mapMini = document.getElementById('mapMini');
const mapImg = document.getElementById('mapIconImage');
const mapFrame = document.getElementById('mapFrame');
let lat = 0, lon = 0;

function loadElegantMap() {
    if (!navigator.geolocation) {
        mapMini.innerHTML = '<div class="error">Geolocalização não suportada</div>';
        return;
    }

    navigator.geolocation.getCurrentPosition(pos => {
        lat = pos.coords.latitude;
        lon = pos.coords.longitude;

        // Define a URL do iframe (sem exibir ainda)
        mapFrame.src = `https://www.google.com/maps?q=supermercados&center=${lat},${lon}&z=15&output=embed`;

        // Expande e mostra mapa ao passar o mouse
        mapMini.addEventListener('mouseenter', () => {
            mapMini.classList.add('expanded');
            mapFrame.style.display = 'block';
            mapImg.style.opacity = 0; // esconde a imagem suavemente
        });

        // Volta para a miniatura ao tirar o mouse
        mapMini.addEventListener('mouseleave', () => {
            mapMini.classList.remove('expanded');
            mapFrame.style.display = 'none';
            mapImg.style.opacity = 1; // mostra a imagem
        });

        // Abre Google Maps ao clicar
        mapMini.addEventListener('click', () => {
            window.open(`https://www.google.com/maps/search/supermercados/@${lat},${lon},15z`, '_blank');
        });

    }, err => {
        mapMini.innerHTML = '<div class="error">Não foi possível obter sua localização</div>';
    });
}

// Carrega produtos salvos ao abrir
carregarProdutosSalvos();

// Permite buscar ao pressionar Enter no input
document.getElementById('barcode').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') document.getElementById('searchBtn').click();
});

// Galeria de Produtos Paginada
let paginaAtual = 1;

async function carregarGaleria(pagina = 1) {
    const grid = document.getElementById('galleryGrid');
    const loading = document.getElementById('galleryLoading');
    const indicator = document.getElementById('pageIndicator');
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');

    if (!grid) return;

    grid.innerHTML = '';
    loading.style.display = 'block';

    prevBtn.disabled = true;
    nextBtn.disabled = true;

    try {
        const url = `https://world.openfoodfacts.net/api/v2/search?ecoscore_tags=a&fields=product_name,nutrition_grades,ecoscore_data,code,image_url,image_front_url&page_size=10&page=${pagina}&sort_by=popularity_key`;
        const res = await fetch(url);
        const data = await res.json();

        loading.style.display = 'none';

        if (data && data.products && data.products.length > 0) {
            data.products.forEach(prod => {
                const ecoscore = prod.ecoscore_data && prod.ecoscore_data.grade ? prod.ecoscore_data.grade.toUpperCase() : 'A';
                const nutriscore = prod.nutrition_grades ? prod.nutrition_grades.toUpperCase() : 'N/A';
                const imgSrc = prod.image_front_url || prod.image_url || 'https://placehold.co/150x150/0E311D/FFF?text=Sem+Imagem';

                grid.innerHTML += `
                    <div class="product-card">
                        <div class="img-wrapper">
                            <img src="${imgSrc}" alt="${prod.product_name}">
                        </div>
                        <h4 title="${prod.product_name}">${prod.product_name || 'Produto sem nome'}</h4>
                        <div class="ecoscore">Eco-Score: ${ecoscore}</div>
                        <div class="nutriscore">Nutri-Score: ${nutriscore}</div>
                        <button onclick="selecionarProdutoGaleria('${prod.code}')">Analisar Produto</button>
                    </div>
                `;
            });

            paginaAtual = pagina;
            indicator.textContent = `Página ${paginaAtual}`;

            prevBtn.disabled = paginaAtual <= 1;
            nextBtn.disabled = data.products.length < 10;
        } else {
            grid.innerHTML = '<div class="error" style="grid-column: 1 / -1;">Nenhum produto encontrado.</div>';
        }
    } catch (e) {
        console.error(e);
        loading.style.display = 'none';
        grid.innerHTML = '<div class="error" style="grid-column: 1 / -1;">Erro ao carregar galeria.</div>';
    }
}

function mudarPagina(direcao) {
    const novaPagina = paginaAtual + direcao;
    if (novaPagina >= 1) {
        carregarGaleria(novaPagina);
    }
}

async function selecionarProdutoGaleria(code) {
    switchTab('barcode');
    const input = document.getElementById('searchInput');
    if (input) input.value = code;
    executarBusca('barcode');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Inicializa o mapa e a galeria ao carregar a página
window.onload = () => {
    loadElegantMap();
    carregarGaleria(1);
};
