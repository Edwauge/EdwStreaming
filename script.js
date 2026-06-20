// ==========================================
// CONFIGURACIÓN DE TU BASE DE DATOS EN LA NUBE
// ==========================================
const firebaseConfig = {
  databaseURL: "https://edwstreaming-eba93-default-rtdb.firebaseio.com/" 
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let PINES = { admin: "3859", CO: "2233", MX: "3344", AR: "4455", USDEUR: "5566" };
let COMBOS = { CO: 35000, MX: 199, AR: 2500, USDEUR: 9.99 };
let PRODUCTOS = [];

let estado = { 
  paisActual: 'CO', 
  rolActual: 'cliente', 
  carrito: [], 
  comboSeleccionado: [null, null, null],
  monedaGlobalUS: 'USD',
  tipoValidacionPin: '' // Guarda si estamos intentando validar 'revendedor' o 'admin'
};

const Monedas = { 
  CO: 'COP $', 
  MX: 'MXN $', 
  AR: 'ARS $',
  get USDEUR() { return estado.monedaGlobalUS === 'USD' ? 'USD $' : 'EUR €'; }
};

// ==========================================
// ESCUCHAR EN TIEMPO REAL DESDE FIREBASE
// ==========================================
db.ref().on('value', (snapshot) => {
  const data = snapshot.val();
  if (data) {
    PRODUCTOS = data.productos ? Object.values(data.productos) : [];
    renderizarProductos();
    renderizarCarrito();
  }
});

// ==========================================
// CONTROL DEL FLUJO DE PANTALLAS DE BIENVENIDA
// ==========================================
function seleccionarRolDirecto(rol) {
  estado.rolActual = rol;
  document.getElementById('etiqueta-rol').innerText = 'Cliente';
  
  // Ocultar pantallas de acceso y mostrar catálogo principal
  document.getElementById('pantalla-perfiles').classList.add('hidden');
  document.getElementById('interfaz-catalogo').classList.remove('hidden');
  
  renderizarProductos();
  renderizarCarrito();
}

function mostrarVistaPinRevendedor() {
  estado.tipoValidacionPin = 'revendedor';
  document.getElementById('titulo-pin').innerText = '🤝 Acceso para Revendedores';
  document.getElementById('pantalla-perfiles').classList.add('hidden');
  document.getElementById('pantalla-pin').classList.remove('hidden');
  document.getElementById('input-pin-seguro').value = '';
  document.getElementById('input-pin-seguro').focus();
}

function mostrarVistaPinAdmin() {
  estado.tipoValidacionPin = 'admin';
  document.getElementById('titulo-pin').innerText = '👑 Acceso de Administrador';
  document.getElementById('pantalla-perfiles').classList.add('hidden');
  document.getElementById('pantalla-pin').classList.remove('hidden');
  document.getElementById('input-pin-seguro').value = '';
  document.getElementById('input-pin-seguro').focus();
}

function regresarAInicioPerfiles() {
  document.getElementById('pantalla-pin').classList.add('hidden');
  document.getElementById('pantalla-perfiles').classList.remove('hidden');
}

function cerrarSesion() {
  estado.carrito = [];
  estado.comboSeleccionado = [null, null, null];
  document.getElementById('interfaz-catalogo').classList.add('hidden');
  document.getElementById('pantalla-perfiles').classList.remove('hidden');
}

// ==========================================
// VALIDACIÓN DE CÓDIGOS PIN DE ACCESO
// ==========================================
function procesarPinFormulario() {
  const pin = document.getElementById('input-pin-seguro').value;
  
  if (estado.tipoValidacionPin === 'admin') {
    if (pin === PINES.admin) {
      estado.rolActual = 'admin';
      document.getElementById('etiqueta-rol').innerText = 'Administrador';
      alert("👑 Modo Administrador Global Conectado.");
      document.getElementById('pantalla-pin').classList.add('hidden');
      document.getElementById('interfaz-catalogo').classList.remove('hidden');
      if(typeof abrirPanelAdmin === 'function') abrirPanelAdmin();
    } else {
      alert("❌ Código PIN de Administrador incorrecto.");
      document.getElementById('input-pin-seguro').value = '';
      document.getElementById('input-pin-seguro').focus();
      return;
    }
  } else if (estado.tipoValidacionPin === 'revendedor') {
    if (pin === PINES[estado.paisActual]) {
      estado.rolActual = 'revendedor';
      document.getElementById('etiqueta-rol').innerText = `Revendedor (${estado.paisActual})`;
      alert(`💼 Modo Revendedor Autorizado (${estado.paisActual}) Activo.`);
      document.getElementById('pantalla-pin').classList.add('hidden');
      document.getElementById('interfaz-catalogo').classList.remove('hidden');
    } else {
      alert(`❌ PIN incorrecto para la región seleccionada (${estado.paisActual}).`);
      document.getElementById('input-pin-seguro').value = '';
      document.getElementById('input-pin-seguro').focus();
      return;
    }
  }

  renderizarProductos();
  renderizarCarrito();
}

// ==========================================
// NAVEGACIÓN DE PAÍSES Y MONEDAS INTERNACIONALES
// ==========================================
function cambiarPais(pais) {
  estado.paisActual = pais;
  estado.carrito = [];
  estado.comboSeleccionado = [null, null, null];
  
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.classList.remove('border-amber-500', 'text-amber-600');
    btn.classList.add('border-transparent', 'text-gray-400');
  });
  
  const botonActivo = document.getElementById(`tab-${pais}`);
  if (botonActivo) {
    botonActivo.classList.remove('border-transparent', 'text-gray-400');
    botonActivo.classList.add('border-amber-500', 'text-amber-600');
  }

  if (estado.rolActual === 'revendedor') {
    document.getElementById('etiqueta-rol').innerText = `Revendedor (${pais})`;
  }

  chequearPestañaInternacional(pais);
  renderizarProductos();
  renderizarCarrito();
}

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
// RENDERIZADO DEL CATÁLOGO DE PRODUCTOS
// ==========================================
function renderizarProductos() {
  const container = document.getElementById('contenedor-productos');
  if (!container) return;
  container.innerHTML = '';

  const productosFiltrados = PRODUCTOS.filter(p => p.pais === estado.paisActual);

  if (productosFiltrados.length === 0) {
    container.innerHTML = `<p class="text-center text-gray-400 py-8 text-sm col-span-2">No hay productos disponibles para esta región todavía.</p>`;
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
          <button onclick="agregarAlCarrito('${prod.id}')" class="flex-1 bg-gray-900 text-white text-xs font-bold py-2.5 rounded-xl hover:bg-gray-800 transition-all cursor-pointer">🛒 Agregar</button>
          ${estado.rolActual !== 'revendedor' ? `<button onclick="seleccionarParaCombo('${prod.id}')" class="bg-amber-500 text-white text-xs font-bold px-3 py-2.5 rounded-xl hover:bg-amber-600 transition-all cursor-pointer">➕ Combo</button>` : ''}
        </div>
      </div>
    `;
  });
}

// ==========================================
// MANEJO DE COMPRAS Y AGREGAR ELEMENTOS
// ==========================================
function agregarAlCarrito(id) {
  const prod = PRODUCTOS.find(p => p.id === id);
  if (!prod) return;

  const itemExistente = estado.carrito.find(item => item.producto.id === id);
  if (itemExistente) {
    itemExistente.cantidad++;
  } else {
    estado.carrito.push({ producto: prod, bandwidth: 1, cantidad: 1 });
  }
  renderizarCarrito();
}

function seleccionarParaCombo(id) {
  const prod = PRODUCTOS.find(p => p.id === id);
  if (!prod) return;

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

function renderizarCarrito() {
  const container = document.getElementById('items-carrito');
  if (!container) return;
  container.innerHTML = '';

  let total = 0;

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
          <button onclick="cambiarCantidad('${item.producto.id}', -1)" class="w-5 h-5 font-bold flex items-center justify-center bg-gray-100 rounded-sm text-gray-600 hover:bg-gray-200 cursor-pointer">-</button>
          <span class="font-bold text-gray-700 min-w-4 text-center">${item.whitespace || item.cantidad}</span>
          <button onclick="cambiarCantidad('${item.producto.id}', 1)" class="w-5 h-5 font-bold flex items-center justify-center bg-gray-100 rounded-sm text-gray-600 hover:bg-gray-200 cursor-pointer">+</button>
        </div>
      </div>
    `;
  });

  const pCombo = estado.comboSeleccionado.filter(p => p !== null).length;
  
  if (estado.rolActual !== 'revendedor') {
    let comboHTML = `<div class="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-200"><p class="text-xs font-black text-amber-900 mb-2 flex justify-between">🔥 Súper Combo (Elige 3 Productos): <span>${pCombo}/3</span></p><div class="grid grid-cols-3 gap-2">`;
    
    estado.comboSeleccionado.forEach((prod, idx) => {
      if (prod) {
        comboHTML += `
          <div class="relative bg-white border border-amber-300 p-2 rounded-lg text-[10px] font-bold text-center text-amber-800 flex flex-col justify-between min-h-[50px]">
            <span>${prod.nombre}</span>
            <button onclick="quitarDelCombo(${idx})" class="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[8px] font-black shadow-xs cursor-pointer">×</button>
          </div>
        `;
      } else {
        comboHTML += `
          <div class="bg-dashed border-2 border-dashed border-gray-200 rounded-lg text-[10px] text-gray-400 flex items-center justify-center text-center p-2 min-h-[50px]">Vacío</div>
        `;
      }
    });
    
    comboHTML += `</div>`;

    if (pCombo === 3) {
      total += COMBOS[estado.paisActual];
      comboHTML += `
        <div class="mt-2 flex justify-between items-center text-xs bg-amber-500 text-white p-2 rounded-lg font-black">
          <span>¡Combo Activado con Éxito!</span>
          <span>${Monedas[estado.paisActual]}${COMBOS[estado.paisActual].toLocaleString()}</span>
        </div>
      `;
    }
    comboHTML += `</div>`;
    container.innerHTML += comboHTML;
  }

  const elementoTotal = document.getElementById('total-carrito');
  if (elementoTotal) {
    elementoTotal.innerText = `${Monedas[estado.paisActual]}${total.toLocaleString()}`;
  }
}

// ==========================================
// ESTRUCTURA Y ENVÍO DE PEDIDO A WHATSAPP
// ==========================================
function obtenerProductoWhatsApp() {
  const pCombo = estado.comboSeleccionado.filter(p => p !== null);
  if (estado.carrito.length === 0 && pCombo.length === 0) { 
    alert("🛒 Tu carrito de compras está vacío."); 
    return; 
  }
  
  let mensaje = `👋 ¡Hola *Edwauge.Vip*! Me interesa adquirir los siguientes productos de Streaming:\n\n🌍 *Catálogo:* ${estado.paisActual}\n👤 *Perfil:* ${estado.rolActual || 'cliente'}\n-------------------------------------------\n`;
  let total = 0;
  
  estado.carrito.forEach(item => {
    const pU = estado.rolActual === 'revendedor' ? item.producto.precioRevendedor : item.producto.precioCliente;
    total += pU * item.cantidad; 
    mensaje += `📦 *${item.whitespace || item.cantidad}x* ${item.producto.nombre} (${Monedas[estado.paisActual]}${(pU * item.cantidad).toLocaleString()})\n`;
  });
  
  if (estado.rolActual !== 'revendedor' && pCombo.length === 3) { 
    total += COMBOS[estado.paisActual]; 
    mensaje += `\n🔥 *Súper Combo Especial (3 Productos):*\n`;
    pCombo.forEach((prod, idx) => {
      mensaje += `  ✨ *Ítem ${idx + 1}:* ${prod.nombre}\n`;
    });
    mensaje += `💰 *Precio Combo:* ${Monedas[estado.paisActual]}${COMBOS[estado.paisActual].toLocaleString()}\n`; 
  }
  
  mensaje += `-------------------------------------------\n💰 *TOTAL NETO A PAGAR:* ${Monedas[estado.paisActual]}${total.toLocaleString()}`;
  window.open(`https://api.whatsapp.com/send?phone=3022237839&text=${encodeURIComponent(mensaje)}`, '_blank');
}
