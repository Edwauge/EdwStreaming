// ==========================================
// CONFIGURACIÓN DE TU BASE DE DATOS EN LA NUBE
// ==========================================
const firebaseConfig = {
  databaseURL: "https://edwstreaming-eba93-default-rtdb.firebaseio.com/" 
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// PINES DE ACCESO (Añadido USDEUR con PIN 5566)
let PINES = { admin: "3859", CO: "2233", MX: "3344", AR: "4455", USDEUR: "5566" };

// PRECIOS BASE DE COMBOS POR PAÍS/REGIÓN
let COMBOS = { CO: 35000, MX: 199, AR: 2500, USDEUR: 9.99 };
let PRODUCTOS = [];

// ESTADO GLOBAL DE LA APLICACIÓN
let estado = { 
  paisActual: 'CO', 
  rolActual: null, 
  carrito: [], 
  comboSeleccionado: [null, null, null],
  monedaGlobalUS: 'USD' // Controla si la pestaña internacional muestra USD o EUR
};

// SÍMBOLOS DE MONEDAS DINÁMICOS
const Monedas = { 
  CO: 'COP $', 
  MX: 'MXN $', 
  AR: 'ARS $',
  get USDEUR() { return estado.monedaGlobalUS === 'USD' ? 'USD $' : 'EUR €'; }
};

// ==========================================
// ESCUCHAR CAMBIOS EN TIEMPO REAL DESDE LA NUBE
// ==========================================
db.ref().on('value', (snapshot) => {
  const data = snapshot.val();
  if (data) {
    // Si la base de datos tiene productos guardados, los cargamos
    PRODUCTOS = data.productos ? Object.values(data.productos) : [];
    // Recargar la interfaz de forma automática
    renderizarProductos();
    renderizarCarrito();
  }
});

// ==========================================
// LÓGICA DE NAVEGACIÓN Y CAMBIO DE PAÍS
// ==========================================
function cambiarPais(pais) {
  estado.paisActual = pais;
  estado.carrito = []; // Limpiar carrito al cambiar de región para evitar mezclas
  estado.comboSeleccionado = [null, null, null];
  
  // Controlar visualmente las pestañas activas
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.classList.remove('border-amber-500', 'text-amber-600');
    btn.classList.add('border-transparent', 'text-gray-400');
  });
  
  const botonActivo = document.getElementById(`tab-${pais}`);
  if (botonActivo) {
    botonActivo.classList.remove('border-transparent', 'text-gray-400');
    botonActivo.classList.add('border-amber-500', 'text-amber-600');
  }

  // Comprobar si se activa el selector de monedas USD/EUR
  chequearPestañaInternacional(pais);
  renderizarProductos();
  renderizarCarrito();
}

// Muestra u oculta los botones de USD/EUR de forma limpia
function chequearPestañaInternacional(pais) {
  const contenedorFiltroMoneda = document.getElementById('selector-moneda-us');
  if (!contenedorFiltroMoneda) return;

  if (pais === 'USDEUR') {
    contenedorFiltroMoneda.innerHTML = `
      <div class="flex justify-center gap-4 my-4 p-2 bg-gray-50 rounded-xl border border-gray-100 max-w-xs mx-auto shadow-xs">
        <button onclick="cambiarMonedaInternacional('USD')" class="flex-1 py-2 text-xs font-black rounded-lg transition-all ${estado.monedaGlobalUS === 'USD' ? 'bg-amber-500 text-white shadow-md scale-105' : 'bg-white text-gray-700 border border-gray-200'}">Ver en USD ($)</button>
        <button onclick="cambiarMonedaInternacional('EUR')" class="flex-1 py-2 text-xs font-black rounded-lg transition-all ${estado.monedaGlobalUS === 'EUR' ? 'bg-amber-500 text-white shadow-md scale-105' : 'bg-white text-gray-700 border border-gray-200'}">Ver en EUR (€)</button>
      </div>
    `;
  } else {
    contenedorFiltroMoneda.innerHTML = '';
  }
}

function cambiarMonedaInternacional(nuevaMoneda) {
  estado.monedaGlobalUS = nuevaMoneda;
  chequearPestañaInternacional('USDEUR');
  renderizarProductos();
  renderizarCarrito();
}

// ==========================================
// RENDERIZADO DE PRODUCTOS Y CATÁLOGO
// ==========================================
function renderizarProductos() {
  const container = document.getElementById('contenedor-productos');
  if (!container) return;
  container.innerHTML = '';

  // Filtrar productos que correspondan al país actual
  const productosFiltrados = PRODUCTOS.filter(p => p.pais === estado.paisActual);

  if (productosFiltrados.length === 0) {
    container.innerHTML = `<p class="text-center text-gray-400 py-8 text-sm">No hay productos disponibles para esta región todavía.</p>`;
    return;
  }

  productosFiltrados.forEach(prod => {
    const precio = estado.rolActual === 'revendedor' ? prod.precioRevendedor : prod.precioCliente;
    const precioTexto = `${Monedas[estado.paisActual]}${Number(precio).toLocaleString()}`;
    
    container.innerHTML += `
      <div class="bg-white rounded-2xl p-4 shadow-xs border border-gray-100 flex flex-col justify-between hover:shadow-md transition-all">
        <div>
          <div class="flex justify-between items-start mb-2">
            <h3 class="font-bold text-gray-800 text-sm sm:text-base">${prod.nombre}</h3>
            <span class="text-xs bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded-md">${prod.categoria || 'Streaming'}</span>
          </div>
          <p class="text-lg font-black text-amber-600 mb-4">${precioTexto}</p>
        </div>
        <div class="flex gap-2">
          <button onclick="agregarAlCarrito('${prod.id}')" class="flex-1 bg-gray-900 text-white text-xs font-bold py-2.5 rounded-xl hover:bg-gray-800 transition-all">🛒 Agregar</button>
          ${estado.rolActual !== 'revendedor' ? `<button onclick="seleccionarParaCombo('${prod.id}')" class="bg-amber-500 text-white text-xs font-bold px-3 py-2.5 rounded-xl hover:bg-amber-600 transition-all">➕ Combo</button>` : ''}
        </div>
      </div>
    `;
  });
}

// ==========================================
// MANEJO DE CARRITO Y SELECCIÓN DE COMBOS
// ==========================================
function agregarAlCarrito(id) {
  const prod = PRODUCTOS.find(p => p.id === id);
  if (!prod) return;

  const itemExistente = estado.carrito.find(item => item.producto.id === id);
  if (itemExistente) {
    itemExistente.cantidad++;
  } else {
    estado.carrito.push({ producto: prod, cantidad: 1 });
  }
  renderizarCarrito();
}

function seleccionarParaCombo(id) {
  const prod = PRODUCTOS.find(p => p.id === id);
  if (!prod) return;

  // Buscar un espacio vacío en el combo de 3 slots
  const slotLibre = estado.comboSeleccionado.findIndex(slot => slot === null);
  if (slotLibre !== -1) {
    estado.comboSeleccionado[slotLibre] = prod;
  } else {
    alert("🔥 Tu Combo Especial ya tiene 3 productos seleccionados.");
  }
  renderizarCarrito();
}

function quitarDelCombo(idx) {
  estado.comboSeleccionado[idx] = null;
  renderizarCarrito();
}

function cambiarCantidad(id, cambio) {
  const item = estado.carrito.find(item => item.producto.id === id);
  if (!item) return;
  item.cantidad += cambio;
  if (item.cantidad <= 0) {
    estado.carrito = estado.carrito.filter(i => i.producto.id !== id);
  }
  renderizarCarrito();
}

// ==========================================
// RENDERIZADO DEL PANEL DEL CARRITO DE COMPRAS
// ==========================================
function renderizarCarrito() {
  const container = document.getElementById('items-carrito');
  if (!container) return;
  container.innerHTML = '';

  let total = 0;

  // 1. Renderizar ítems del carrito regular
  estado.carrito.forEach(item => {
    const precioUnidad = estado.rolActual === 'revendedor' ? item.producto.precioRevendedor : item.producto.precioCliente;
    const subtotalItem = precioUnidad * item.cantidad;
    total += subtotalItem;

    container.innerHTML += `
      <div class="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100 text-xs">
        <div class="flex-1 pr-2">
          <p class="font-bold text-gray-800">${item.producto.nombre}</p>
          <p class="text-amber-600 font-medium">${Monedas[estado.paisActual]}${subtotalItem.toLocaleString()}</p>
        </div>
        <div class="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-1">
          <button onclick="cambiarCantidad('${item.producto.id}', -1)" class="w-5 h-5 font-bold flex items-center justify-center bg-gray-100 rounded-sm text-gray-600 hover:bg-gray-200">-</button>
          <span class="font-bold text-gray-700 min-w-4 text-center">${item.cantidad}</span>
          <button onclick="cambiarCantidad('${item.producto.id}', 1)" class="w-5 h-5 font-bold flex items-center justify-center bg-gray-100 rounded-sm text-gray-600 hover:bg-gray-200">+</button>
        </div>
      </div>
    `;
  });

  // 2. Renderizar ranuras del Combo de 3 Productos
  const pCombo = estado.comboSeleccionado.filter(p => p !== null).length;
  
  if (estado.rolActual !== 'revendedor') {
    let comboHTML = `<div class="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-200"><p class="text-xs font-black text-amber-900 mb-2 flex justify-between">🔥 Súper Combo (Elige 3 Productos): <span>${pCombo}/3</span></p><div class="grid grid-cols-3 gap-2">`;
    
    estado.comboSeleccionado.forEach((prod, idx) => {
      if (prod) {
        comboHTML += `
          <div class="relative bg-white border border-amber-300 p-2 rounded-lg text-[10px] font-bold text-center text-amber-800 flex flex-col justify-between min-h-[50px]">
            <span>${prod.nombre}</span>
            <button onclick="quitarDelCombo(${idx})" class="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[8px] font-black shadow-xs">×</button>
          </div>
        `;
      } else {
        comboHTML += `
          <div class="bg-dashed border-2 border-dashed border-gray-200 rounded-lg text-[10px] text-gray-400 flex items-center justify-center text-center p-2 min-h-[50px]">
            Vacío
          </div>
        `;
      }
    });
    
    comboHTML += `</div>`;

    // Si el combo está completo (3 ítems), se suma el precio promocional directo de Firebase
    if (pCombo === 3) {
      total += COMBOS[estado.paisActual];
      comboHTML += `
        <div class="mt-2 flex justify-between items-center text-xs bg-amber-500 text-white p-2 rounded-lg font-black animate-pulse">
          <span>¡Combo Activado con Éxito!</span>
          <span>${Monedas[estado.paisActual]}${COMBOS[estado.paisActual].toLocaleString()}</span>
        </div>
      `;
    }
    comboHTML += `</div>`;
    container.innerHTML += comboHTML;
  }

  // Actualizar el valor Neto Final en la Pantalla
  const elementoTotal = document.getElementById('total-carrito');
  if (elementoTotal) {
    elementoTotal.innerText = `${Monedas[estado.paisActual]}${total.toLocaleString()}`;
  }
}

// ==========================================
// VALIDACIÓN DE ROLES (CLIENTE / REVENDEDOR)
// ==========================================
function validarPinAcceso(pinIngresado) {
  if (pinIngresado === PINES.admin) {
    estado.rolActual = 'admin';
    alert("👑 Modo Administrador Global Conectado.");
    abrirPanelAdmin();
    return;
  }

  // Comprobar si corresponde al PIN de revendedor de la región actual
  if (pinIngresado === PINES[estado.paisActual]) {
    estado.rolActual = 'revendedor';
    alert(`💼 Modo Revendedor Autorizado (${estado.paisActual}) Activo.`);
  } else {
    estado.rolActual = 'cliente';
    alert("👤 Acceso correcto como Cliente Final.");
  }
  
  renderizarProductos();
  renderizarCarrito();
}

// ==========================================
// CONFIGURACIÓN FINAL DEL MENSAJE DE WHATSAPP
// ==========================================
function obtenerProductoWhatsApp() {
  const pCombo = estado.comboSeleccionado.filter(p => p !== null);
  if (estado.carrito.length === 0 && pCombo.length === 0) { 
    alert("🛒 Tu carrito de compras está vacío."); 
    return; 
  }
  
  let mensaje = `👋 ¡Hola *Edwauge.Vip*! Me interesa adquirir los siguientes productos de Streaming:\n\n🌍 *Catálogo:* ${estado.paisActual}\n👤 *Perfil:* ${estado.rolActual || 'cliente'}\n-------------------------------------------\n`;
  let total = 0;
  
  // 1. Listar productos del carrito regular en el texto
  estado.carrito.forEach(item => {
    const pU = estado.rolActual === 'revendedor' ? item.producto.precioRevendedor : item.producto.precioCliente;
    total += pU * item.cantidad; 
    mensaje += `📦 *${item.cantidad}x* ${item.producto.nombre} (${Monedas[estado.paisActual]}${(pU * item.cantidad).toLocaleString()})\n`;
  });
  
  // 2. DETALLAR PRODUCTOS DEL COMBO ESPECIAL DE FORMA CORRECTA
  if (estado.rolActual !== 'revendedor' && pCombo.length === 3) { 
    total += COMBOS[estado.paisActual]; 
    mensaje += `\n🔥 *Súper Combo Especial (3 Productos):*\n`;
    pCombo.forEach((prod, idx) => {
      mensaje += `  ✨ *Ítem ${idx + 1}:* ${prod.nombre}\n`;
    });
    mensaje += `💰 *Precio Combo:* ${Monedas[estado.paisActual]}${COMBOS[estado.paisActual].toLocaleString()}\n`; 
  }
  
  mensaje += `-------------------------------------------\n💰 *TOTAL NETO A PAGAR:* ${Monedas[estado.paisActual]}${total.toLocaleString()}`;
  
  // Abrir API de WhatsApp hacia tu número comercial
  window.open(`https://api.whatsapp.com/send?phone=3022237839&text=${encodeURIComponent(mensaje)}`, '_blank');
}
