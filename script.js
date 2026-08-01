/* ==========================================================================
   EDWAUGE.VIP - Catálogo Multirregional & Panel Administrativo
   ========================================================================== */

// --------------------------------------------------------------------------
// 1. CONFIGURACIÓN E INICIALIZACIÓN DE FIREBASE
// --------------------------------------------------------------------------
const firebaseConfig = {
  databaseURL: "https://edwstreaming-55d3f-default-rtdb.firebaseio.com/"
};

// Inicializar Firebase solo si no existe una instancia activa
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();

// --------------------------------------------------------------------------
// 2. ESTADO GLOBAL DE LA APLICACIÓN
// --------------------------------------------------------------------------
let PRODUCTOS = [];
let paisActivo = 'CO';            // CO, MX, AR, USDEUR
let perfilActivo = 'CLIENTE';      // CLIENTE | REVENDEDOR
let comboSeleccionado = [];       // Máximo 3 productos
let carritoNormal = [];           // Productos individuales
let filtroCategoria = 'TODAS';
let busquedaTexto = '';

// Pines de seguridad por catálogo
let pinesSeguridad = {
  admin: '9999',
  CO: '2222',
  MX: '2222',
  AR: '2222',
  USDEUR: '2222'
};

// Tarifas dinámicas del Súper Combo por región
let tarifasCombo = {
  CO: 30000,
  MX: 199,
  AR: 2500,
  USDEUR: 10
};

// Variable auxiliar para control de flujo en modales
let modoPinDestino = ''; // 'ADMIN' | 'REVENDEDOR'

// --------------------------------------------------------------------------
// 3. LISTENERS EN TIEMPO REAL (FIREBASE REALTIME DATABASE)
// --------------------------------------------------------------------------

// Escuchar cambios en la lista de productos
database.ref('productos').on('value', (snapshot) => {
  const data = snapshot.val();
  if (data) {
    PRODUCTOS = Array.isArray(data) ? data : Object.values(data);
  } else {
    PRODUCTOS = [];
  }
  renderizarCatalogo();
  renderizarTablaAdminProductos();
  actualizarContadoresAdmin();
});

// Escuchar cambios en los pines de seguridad
database.ref('pinesSeguridad').on('value', (snapshot) => {
  const data = snapshot.val();
  if (data) {
    pinesSeguridad = Object.assign({}, pinesSeguridad, data);
  }
});

// Escuchar cambios en las tarifas del combo
database.ref('tarifasCombo').on('value', (snapshot) => {
  const data = snapshot.val();
  if (data) {
    tarifasCombo = Object.assign({}, tarifasCombo, data);
  }
  renderizarSlotsCombo();
});

// --------------------------------------------------------------------------
// 4. INICIALIZACIÓN Y EVENTOS DOM
// --------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  console.log("Sistema EDWAUGE.VIP inicializado correctamente.");
  inicializarUI();
});

function inicializarUI() {
  cambiarPais('CO');
  renderizarSlotsCombo();
  actualizarCarritoVista();
}

// --------------------------------------------------------------------------
// 5. NAVEGACIÓN DE PAÍSES Y PESTAÑAS REGIONALES
// --------------------------------------------------------------------------
function cambiarPais(nuevoPais) {
  paisActivo = nuevoPais;
  
  const paises = ['CO', 'MX', 'AR', 'USDEUR'];
  paises.forEach(p => {
    const tab = document.getElementById(`tab-${p}`);
    if (tab) {
      if (p === nuevoPais) {
        tab.className = "tab-active py-2 px-1 whitespace-nowrap cursor-pointer";
      } else {
        tab.className = "text-gray-500 hover:text-gray-700 py-2 px-1 whitespace-nowrap cursor-pointer";
      }
    }
  });

  const lblPais = document.getElementById('lbl-pais-activo');
  if (lblPais) lblPais.innerText = nuevoPais;

  // Al cambiar de país, vaciar el combo actual por diferencias de tarifa/inventario
  comboSeleccionado = [];
  renderizarSlotsCombo();
  renderizarCatalogo();
}

// --------------------------------------------------------------------------
// 6. GESTIÓN DE PERFILES (CLIENTE / REVENDEDOR)
// --------------------------------------------------------------------------
function mostrarModalPerfil() {
  const modal = document.getElementById('modal-perfil');
  if (modal) modal.classList.remove('hidden');
}

function cerrarModalPerfil() {
  const modal = document.getElementById('modal-perfil');
  if (modal) modal.classList.add('hidden');
}

function seleccionarPerfil(perfil) {
  perfilActivo = perfil;
  const lblPerfil = document.getElementById('lbl-perfil-activo');
  if (lblPerfil) lblPerfil.innerText = perfil;
  
  cerrarModalPerfil();
  renderizarCatalogo();
  actualizarCarritoVista();
}

function pedirPinRevendedor() {
  cerrarModalPerfil();
  modoPinDestino = 'REVENDEDOR';
  
  const titulo = document.getElementById('modal-pin-titulo');
  const subtitulo = document.getElementById('modal-pin-subtitulo');
  const inputPin = document.getElementById('input-pin');
  
  if (titulo) titulo.innerText = `Acceso Revendedor (${paisActivo})`;
  if (subtitulo) subtitulo.innerText = `Ingresa el PIN de 4 dígitos asignado al catálogo de ${paisActivo}.`;
  if (inputPin) inputPin.value = '';
  
  const modalPin = document.getElementById('modal-pin');
  if (modalPin) modalPin.classList.remove('hidden');
}

// --------------------------------------------------------------------------
// 7. SEGURIDAD Y ACCESO ADMINISTRATIVO
// --------------------------------------------------------------------------
function solicitarAccesoAdmin() {
  modoPinDestino = 'ADMIN';
  
  const titulo = document.getElementById('modal-pin-titulo');
  const subtitulo = document.getElementById('modal-pin-subtitulo');
  const inputPin = document.getElementById('input-pin');
  
  if (titulo) titulo.innerText = "Acceso Administrativo";
  if (subtitulo) subtitulo.innerText = "Introduce la Clave Master de Backoffice para ingresar.";
  if (inputPin) inputPin.value = '';
  
  const modalPin = document.getElementById('modal-pin');
  if (modalPin) modalPin.classList.remove('hidden');
}

function cerrarModalPin() {
  const modalPin = document.getElementById('modal-pin');
  if (modalPin) modalPin.classList.add('hidden');
}

function validarPinIngresado() {
  const inputPin = document.getElementById('input-pin');
  if (!inputPin) return;
  
  const pinIngresado = inputPin.value.trim();

  if (modoPinDestino === 'ADMIN') {
    const pinMaster = pinesSeguridad.admin || '9999';
    if (pinIngresado === pinMaster) {
      cerrarModalPin();
      mostrarPanelAdmin();
    } else {
      alert("❌ PIN Administrativo Incorrecto.");
    }
  } else if (modoPinDestino === 'REVENDEDOR') {
    const pinCorrecto = pinesSeguridad[paisActivo] || '2222';
    if (pinIngresado === pinCorrecto) {
      cerrarModalPin();
      seleccionarPerfil('REVENDEDOR');
    } else {
      alert(`❌ PIN Incorrecto para el catálogo de ${paisActivo}.`);
    }
  }
}

function mostrarPanelAdmin() {
  const vistaCatalogo = document.getElementById('vista-catalogo');
  const vistaAdmin = document.getElementById('vista-admin');
  
  if (vistaCatalogo) vistaCatalogo.classList.add('hidden');
  if (vistaAdmin) vistaAdmin.classList.remove('hidden');

  cargarDatosFormularioAdmin();
}

function salirDelAdmin() {
  const vistaCatalogo = document.getElementById('vista-catalogo');
  const vistaAdmin = document.getElementById('vista-admin');
  
  if (vistaAdmin) vistaAdmin.classList.add('hidden');
  if (vistaCatalogo) vistaCatalogo.classList.remove('hidden');
}

// --------------------------------------------------------------------------
// 8. RENDERIZADO DE CATÁLOGO Y FILTROS
// --------------------------------------------------------------------------
function renderizarCatalogo() {
  const contenedor = document.getElementById('grid-productos-catalogo');
  if (!contenedor) return;

  contenedor.innerHTML = '';

  // Filtrar productos por el país activo
  let productosFiltrados = PRODUCTOS.filter(p => p.pais === paisActivo);

  // Filtrar por categoría si no es "TODAS"
  if (filtroCategoria !== 'TODAS') {
    productosFiltrados = productosFiltrados.filter(p => p.categoria === filtroCategoria);
  }

  // Filtrar por texto de búsqueda
  if (busquedaTexto.trim() !== '') {
    const query = busquedaTexto.toLowerCase();
    productosFiltrados = productosFiltrados.filter(p => 
      p.nombre.toLowerCase().includes(query) || 
      (p.categoria && p.categoria.toLowerCase().includes(query))
    );
  }

  if (productosFiltrados.length === 0) {
    contenedor.innerHTML = `
      <div class="col-span-2 bg-white p-8 rounded-xl border border-gray-200 text-center">
        <p class="text-gray-400 text-sm font-medium">No se encontraron servicios disponibles en este catálogo.</p>
      </div>
    `;
    return;
  }

  const moneda = obtenerMonedaPorPais(paisActivo);

  productosFiltrados.forEach((prod) => {
    const precio = perfilActivo === 'REVENDEDOR' ? prod.precioRevendedor : prod.precioCliente;
    const precioFormateado = parseFloat(precio || 0).toLocaleString();

    contenedor.innerHTML += `
      <div class="bg-white p-4 rounded-xl border border-gray-200 flex justify-between items-center shadow-sm hover:shadow-md transition">
        <div>
          <span class="text-[10px] font-extrabold text-amber-500 uppercase tracking-wider block mb-0.5">
            ${prod.categoria || 'STREAMING'}
          </span>
          <h4 class="text-sm font-bold text-gray-800">${prod.nombre}</h4>
          <p class="text-xs text-gray-500 font-semibold mt-1">
            ${moneda} $${precioFormateado}
          </p>
        </div>
        <div class="flex items-center gap-1.5">
          ${prod.agotado 
            ? `<span class="text-xs text-red-500 font-bold bg-red-50 px-2.5 py-1.5 rounded-lg border border-red-100">Agotado</span>`
            : `
              <button onclick='agregarAlCarrito(${JSON.stringify(prod)})' class="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold px-3 py-2 rounded-lg transition flex items-center gap-1">
                🛒
              </button>
              <button onclick='agregarACombo(${JSON.stringify(prod)})' class="bg-amber-500 hover:bg-amber-600 text-gray-900 text-xs font-extrabold px-3 py-2 rounded-lg transition flex items-center gap-1">
                ⚡ Combo 3
              </button>
            `
          }
        </div>
      </div>
    `;
  });
}

function filtrarPorCategoria(cat) {
  filtroCategoria = cat;
  renderizarCatalogo();
}

function buscarProducto(texto) {
  busquedaTexto = texto;
  renderizarCatalogo();
}

// --------------------------------------------------------------------------
// 9. LÓGICA Y RENDERIZADO DEL SÚPER COMBO (3 SLOTS)
// --------------------------------------------------------------------------
function agregarACombo(producto) {
  if (comboSeleccionado.length >= 3) {
    alert("⚠️ Tu Súper Combo ya tiene los 3 productos completos.");
    return;
  }

  comboSeleccionado.push(producto);
  renderizarSlotsCombo();
}

function quitarDelCombo(index) {
  comboSeleccionado.splice(index, 1);
  renderizarSlotsCombo();
}

function vaciarCombo() {
  comboSeleccionado = [];
  renderizarSlotsCombo();
}

function renderizarSlotsCombo() {
  const contenedor = document.getElementById('contenedor-slots-combo');
  if (!contenedor) return;

  contenedor.innerHTML = '';
  const precioTarifaCombo = tarifasCombo[paisActivo] || 0;
  const moneda = obtenerMonedaPorPais(paisActivo);

  for (let i = 0; i < 3; i++) {
    const prod = comboSeleccionado[i];
    if (prod) {
      contenedor.innerHTML += `
        <div class="relative bg-white text-gray-800 p-2.5 rounded-xl flex flex-col justify-center items-center shadow text-center border border-amber-200">
          <button onclick="quitarDelCombo(${i})" class="absolute -top-1.5 -right-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shadow">
            ✕
          </button>
          <span class="text-[9px] font-black text-amber-600 uppercase tracking-widest">Cuenta ${i + 1}</span>
          <p class="text-xs font-bold leading-tight mt-0.5 text-gray-800 line-clamp-2">${prod.nombre}</p>
        </div>
      `;
    } else {
      contenedor.innerHTML += `
        <div class="bg-white/10 border border-white/30 border-dashed p-3 rounded-xl flex flex-col items-center justify-center text-amber-100 text-xs text-center min-h-[60px]">
          <span class="text-[10px] opacity-75">Slot ${i + 1}</span>
          <span class="text-[11px] font-semibold mt-0.5">+ Seleccionar</span>
        </div>
      `;
    }
  }

  // Actualizar etiqueta del valor del combo si existe en la interfaz
  const lblPrecioCombo = document.getElementById('lbl-precio-combo-activo');
  if (lblPrecioCombo) {
    lblPrecioCombo.innerText = `${moneda} $${parseFloat(precioTarifaCombo).toLocaleString()}`;
  }
}

// --------------------------------------------------------------------------
// 10. GESTIÓN DEL CARRITO DE COMPRAS INDIVIDUAL
// --------------------------------------------------------------------------
function agregarAlCarrito(producto) {
  carritoNormal.push(producto);
  actualizarCarritoVista();
}

function quitarDelCarrito(index) {
  carritoNormal.splice(index, 1);
  actualizarCarritoVista();
}

function vaciarCarrito() {
  carritoNormal = [];
  actualizarCarritoVista();
}

function actualizarCarritoVista() {
  const contenedor = document.getElementById('lista-carrito');
  const lblTotal = document.getElementById('lbl-total-carrito');
  if (!contenedor) return;

  if (carritoNormal.length === 0 && comboSeleccionado.length === 0) {
    contenedor.innerHTML = `<p class="text-center text-xs text-gray-400 italic py-4">Tu pedido está vacío.</p>`;
    if (lblTotal) lblTotal.innerText = `${obtenerMonedaPorPais(paisActivo)} $0`;
    return;
  }

  contenedor.innerHTML = '';
  let totalGeneral = 0;
  const moneda = obtenerMonedaPorPais(paisActivo);

  // 1. Mostrar resumen del combo si contiene elementos
  if (comboSeleccionado.length > 0) {
    const precioCombo = tarifasCombo[paisActivo] || 0;
    totalGeneral += parseFloat(precioCombo);

    let nombresCombo = comboSeleccionado.map(c => c.nombre).join(' + ');

    contenedor.innerHTML += `
      <div class="bg-amber-50 border border-amber-200 p-2.5 rounded-xl text-xs mb-2">
        <div class="flex justify-between items-center font-bold text-amber-800">
          <span>⚡ Súper Combo (${comboSeleccionado.length}/3)</span>
          <span>$${parseFloat(precioCombo).toLocaleString()}</span>
        </div>
        <p class="text-[11px] text-amber-700 mt-1 leading-tight">${nombresCombo}</p>
        <button onclick="vaciarCombo()" class="text-[10px] text-red-600 font-bold underline mt-1.5 block">Quitar Combo</button>
      </div>
    `;
  }

  // 2. Mostrar ítems individuales del carrito
  carritoNormal.forEach((item, idx) => {
    const precio = perfilActivo === 'REVENDEDOR' ? item.precioRevendedor : item.precioCliente;
    totalGeneral += parseFloat(precio) || 0;

    contenedor.innerHTML += `
      <div class="flex justify-between items-center text-xs bg-gray-50 p-2.5 rounded-xl border border-gray-100 mb-2">
        <div>
          <p class="font-semibold text-gray-800">${item.nombre}</p>
          <span class="text-[10px] text-gray-400 uppercase">${item.categoria || 'SERVICIO'}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="font-bold text-amber-600">$${parseFloat(precio).toLocaleString()}</span>
          <button onclick="quitarDelCarrito(${idx})" class="text-red-500 hover:text-red-700 font-bold px-1">✕</button>
        </div>
      </div>
    `;
  });

  if (lblTotal) {
    lblTotal.innerText = `${moneda} $${totalGeneral.toLocaleString()}`;
  }
}

// --------------------------------------------------------------------------
// 11. GENERADOR Y ENVIADOR DE PEDIDOS VÍA WHATSAPP
// --------------------------------------------------------------------------
function enviarPedidoWhatsApp() {
  if (comboSeleccionado.length === 0 && carritoNormal.length === 0) {
    alert("⚠️ Tu pedido está vacío. Agrega al menos un servicio o arma un combo.");
    return;
  }

  const moneda = obtenerMonedaPorPais(paisActivo);
  let totalGeneral = 0;

  let mensaje = `👋 *NUEVO PEDIDO - EDWAUGE.VIP*\n`;
  mensaje += `----------------------------------------\n`;
  mensaje += `📍 *Catálogo:* ${paisActivo}\n`;
  mensaje += `👤 *Perfil Cliente:* ${perfilActivo}\n`;
  mensaje += `----------------------------------------\n\n`;

  // Detalle del combo
  if (comboSeleccionado.length > 0) {
    const precioCombo = tarifasCombo[paisActivo] || 0;
    totalGeneral += parseFloat(precioCombo);

    mensaje += `⚡ *SÚPER COMBO DE 3 CUENTAS:*\n`;
    comboSeleccionado.forEach((c, idx) => {
      mensaje += `   ${idx + 1}. ${c.nombre}\n`;
    });
    mensaje += `   *Precio Combo:* ${moneda} $${parseFloat(precioCombo).toLocaleString()}\n\n`;
  }

  // Detalle del carrito
  if (carritoNormal.length > 0) {
    mensaje += `🛒 *CUENTAS INDIVIDUALES:*\n`;
    carritoNormal.forEach((item) => {
      const precio = perfilActivo === 'REVENDEDOR' ? item.precioRevendedor : item.precioCliente;
      totalGeneral += parseFloat(precio) || 0;
      mensaje += `   • ${item.nombre} - $${parseFloat(precio).toLocaleString()}\n`;
    });
    mensaje += `\n`;
  }

  mensaje += `----------------------------------------\n`;
  mensaje += `💰 *TOTAL A PAGAR:* ${moneda} $${totalGeneral.toLocaleString()}\n`;
  mensaje += `----------------------------------------\n`;
  mensaje += `Quedo a la espera de los datos de pago para confirmar.`;

  const numeroWhatsApp = "573022237839";
  const urlWhatsApp = `https://api.whatsapp.com/send?phone=${numeroWhatsApp}&text=${encodeURIComponent(mensaje)}`;

  window.open(urlWhatsApp, '_blank');
}

// --------------------------------------------------------------------------
// 12. OPERACIONES DEL PANEL ADMINISTRATIVO (CRUD PRODUCTOS)
// --------------------------------------------------------------------------
function guardarProducto() {
  const indexStr = document.getElementById('form-product-index').value;
  const nombre = document.getElementById('form-product-nombre').value.trim();
  const categoria = document.getElementById('form-product-categoria').value.trim();
  const pais = document.getElementById('form-product-pais').value;
  const precioCliente = parseFloat(document.getElementById('form-product-precio-cliente').value) || 0;
  const precioRevendedor = parseFloat(document.getElementById('form-product-precio-revendedor').value) || 0;
  const agotado = document.getElementById('form-product-agotado').checked;

  if (!nombre) {
    alert("⚠️ Debes ingresar el nombre del servicio o cuenta.");
    return;
  }

  const productoObjeto = {
    nombre,
    categoria: categoria || 'STREAMING',
    pais,
    precioCliente,
    precioRevendedor,
    agotado
  };

  if (indexStr === "") {
    // Nuevo producto
    PRODUCTOS.push(productoObjeto);
  } else {
    // Editar existente
    PRODUCTOS[parseInt(indexStr)] = productoObjeto;
  }

  // Sincronizar con Firebase
  database.ref('productos').set(PRODUCTOS)
    .then(() => {
      alert("✅ Producto guardado con éxito en la base de datos.");
      limpiarFormularioProducto();
    })
    .catch((err) => {
      alert("❌ Error al guardar en Firebase: " + err.message);
    });
}

function editarProducto(index) {
  const prod = PRODUCTOS[index];
  if (!prod) return;

  document.getElementById('form-product-index').value = index;
  document.getElementById('form-product-nombre').value = prod.nombre || '';
  document.getElementById('form-product-categoria').value = prod.categoria || '';
  document.getElementById('form-product-pais').value = prod.pais || 'CO';
  document.getElementById('form-product-precio-cliente').value = prod.precioCliente || 0;
  document.getElementById('form-product-precio-revendedor').value = prod.precioRevendedor || 0;
  document.getElementById('form-product-agotado').checked = prod.agotado || false;

  window.scrollTo({ top: document.getElementById('vista-admin').offsetTop, behavior: 'smooth' });
}

function eliminarProducto(index) {
  if (confirm(`¿Estás seguro de que deseas eliminar "${PRODUCTOS[index].nombre}" del catálogo?`)) {
    PRODUCTOS.splice(index, 1);
    database.ref('productos').set(PRODUCTOS)
      .then(() => {
        alert("🗑️ Producto eliminado.");
      });
  }
}

function limpiarFormularioProducto() {
  document.getElementById('form-product-index').value = '';
  document.getElementById('form-product-nombre').value = '';
  document.getElementById('form-product-categoria').value = '';
  document.getElementById('form-product-precio-cliente').value = '';
  document.getElementById('form-product-precio-revendedor').value = '';
  document.getElementById('form-product-agotado').checked = false;
}

function renderizarTablaAdminProductos() {
  const tbody = document.getElementById('tabla-admin-productos');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (PRODUCTOS.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="p-4 text-center text-gray-400 text-xs">No hay productos registrados en la base de datos.</td>
      </tr>
    `;
    return;
  }

  PRODUCTOS.forEach((prod, idx) => {
    const moneda = obtenerMonedaPorPais(prod.pais);
    tbody.innerHTML += `
      <tr class="border-b border-gray-100 text-xs hover:bg-gray-50">
        <td class="p-2 font-bold text-amber-600">${prod.pais}</td>
        <td class="p-2 text-gray-500 uppercase">${prod.categoria || '-'}</td>
        <td class="p-2 font-bold text-gray-800">${prod.nombre}</td>
        <td class="p-2 font-bold ${prod.agotado ? 'text-red-500' : 'text-emerald-500'}">
          ${prod.agotado ? 'AGOTADO' : 'DISPONIBLE'}
        </td>
        <td class="p-2">${moneda} $${parseFloat(prod.precioCliente || 0).toLocaleString()}</td>
        <td class="p-2">${moneda} $${parseFloat(prod.precioRevendedor || 0).toLocaleString()}</td>
        <td class="p-2 text-right">
          <button onclick="editarProducto(${idx})" class="bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold px-2 py-1 rounded mr-1 transition">
            Editar
          </button>
          <button onclick="eliminarProducto(${idx})" class="bg-red-50 hover:bg-red-100 text-red-600 font-bold px-2 py-1 rounded transition">
            Borrar
          </button>
        </td>
      </tr>
    `;
  });
}

// --------------------------------------------------------------------------
// 13. CONFIGURACIÓN DE PINES Y TARIFAS DESDE EL ADMIN
// --------------------------------------------------------------------------
function cargarDatosFormularioAdmin() {
  // Cargar Pines en inputs
  if (document.getElementById('pin-admin')) document.getElementById('pin-admin').value = pinesSeguridad.admin || '9999';
  if (document.getElementById('pin-CO')) document.getElementById('pin-CO').value = pinesSeguridad.CO || '2222';
  if (document.getElementById('pin-MX')) document.getElementById('pin-MX').value = pinesSeguridad.MX || '2222';
  if (document.getElementById('pin-AR')) document.getElementById('pin-AR').value = pinesSeguridad.AR || '2222';

  // Cargar Tarifas de Combo en inputs
  if (document.getElementById('precio-combo-CO')) document.getElementById('precio-combo-CO').value = tarifasCombo.CO || 30000;
  if (document.getElementById('precio-combo-MX')) document.getElementById('precio-combo-MX').value = tarifasCombo.MX || 199;
  if (document.getElementById('precio-combo-AR')) document.getElementById('precio-combo-AR').value = tarifasCombo.AR || 2500;
  if (document.getElementById('precio-combo-USDEUR')) document.getElementById('precio-combo-USDEUR').value = tarifasCombo.USDEUR || 10;
}

function guardarPinesAdmin() {
  const nuevosPines = {
    admin: document.getElementById('pin-admin').value.trim() || '9999',
    CO: document.getElementById('pin-CO').value.trim() || '2222',
    MX: document.getElementById('pin-MX').value.trim() || '2222',
    AR: document.getElementById('pin-AR').value.trim() || '2222',
    USDEUR: '2222'
  };

  database.ref('pinesSeguridad').set(nuevosPines)
    .then(() => {
      alert("🔒 Pines de seguridad actualizados con éxito.");
    });
}

function guardarTarifasAdmin() {
  const nuevasTarifas = {
    CO: parseFloat(document.getElementById('precio-combo-CO').value) || 30000,
    MX: parseFloat(document.getElementById('precio-combo-MX').value) || 199,
    AR: parseFloat(document.getElementById('precio-combo-AR').value) || 2500,
    USDEUR: parseFloat(document.getElementById('precio-combo-USDEUR').value) || 10
  };

  database.ref('tarifasCombo').set(nuevasTarifas)
    .then(() => {
      alert("⚡ Tarifas del Súper Combo actualizadas con éxito.");
    });
}

function actualizarContadoresAdmin() {
  const total = PRODUCTOS.length;
  const agotados = PRODUCTOS.filter(p => p.agotado).length;
  const disponibles = total - agotados;

  const elemTotal = document.getElementById('cnt-total-productos');
  const elemDisp = document.getElementById('cnt-disponibles-productos');
  const elemAgot = document.getElementById('cnt-agotados-productos');

  if (elemTotal) elemTotal.innerText = total;
  if (elemDisp) elemDisp.innerText = disponibles;
  if (elemAgot) elemAgot.innerText = agotados;
}

// --------------------------------------------------------------------------
// 14. FUNCIONES AUXILIARES Y DE FORMATO
// --------------------------------------------------------------------------
function obtenerMonedaPorPais(pais) {
  switch (pais) {
    case 'MX':
      return 'MXN';
    case 'AR':
      return 'ARS';
    case 'USDEUR':
      return 'USD/EUR';
    case 'CO':
    default:
      return 'COP';
  }
}
