/* ==========================================================================
   EDWAUGE.VIP - CONEXIÓN COMPLETA Y MAPEADO AUTOMÁTICO DE FIREBASE
   ========================================================================== */

const firebaseConfig = {
  databaseURL: "https://edwstreaming-55d3f-default-rtdb.firebaseio.com/"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();

let PRODUCTOS = [];
let paisActivo = 'CO';
let perfilActivo = 'CLIENTE';
let comboSeleccionado = [];
let carritoNormal = [];

let pinesSeguridad = {
  admin: '9999',
  CO: '2222',
  MX: '2222',
  AR: '2222',
  USDEUR: '2222'
};

let tarifasCombo = {
  CO: 30000,
  MX: 199,
  AR: 2500,
  USDEUR: 10
};

let modoPinDestino = '';

// LISTENERS EN TIEMPO REAL CON FIREBASE
database.ref('productos').on('value', (snapshot) => {
  const data = snapshot.val();

  if (data) {
    if (Array.isArray(data)) {
      PRODUCTOS = data.filter(item => item !== null && item !== undefined);
    } else if (typeof data === 'object') {
      PRODUCTOS = Object.keys(data).map(key => {
        return typeof data[key] === 'object' ? { _fbKey: key, ...data[key] } : data[key];
      });
    } else {
      PRODUCTOS = [];
    }
  } else {
    PRODUCTOS = [];
  }

  renderizarCatalogo();
  renderizarTablaAdminProductos();
});

database.ref('pinesSeguridad').on('value', (snapshot) => {
  const data = snapshot.val();
  if (data) pinesSeguridad = Object.assign({}, pinesSeguridad, data);
});

database.ref('tarifasCombo').on('value', (snapshot) => {
  const data = snapshot.val();
  if (data) tarifasCombo = Object.assign({}, tarifasCombo, data);
  renderizarSlotsCombo();
});

document.addEventListener('DOMContentLoaded', () => {
  renderizarSlotsCombo();
  actualizarCarritoVista();
});

// NAVEGACIÓN Y REGIONES
function cambiarPais(nuevoPais) {
  paisActivo = nuevoPais;
  
  const paises = ['CO', 'MX', 'AR', 'USDEUR'];
  paises.forEach(p => {
    const tab = document.getElementById(`tab-${p}`);
    if (tab) {
      if (p === nuevoPais) {
        tab.className = "tab-active flex items-center gap-1 cursor-pointer";
      } else {
        tab.className = "hover:text-amber-500 flex items-center gap-1 cursor-pointer";
      }
    }
  });

  const lblPais = document.getElementById('lbl-pais-activo');
  if (lblPais) lblPais.innerText = nuevoPais;

  comboSeleccionado = [];
  renderizarSlotsCombo();
  renderizarCatalogo();
}

// PERFILES
function mostrarModalPerfil() {
  document.getElementById('modal-perfil').classList.remove('hidden');
}

function cerrarModalPerfil() {
  document.getElementById('modal-perfil').classList.add('hidden');
}

function seleccionarPerfil(perfil) {
  perfilActivo = perfil;
  document.getElementById('lbl-perfil-activo').innerText = perfil;
  
  document.getElementById('barra-estado-perfil').classList.remove('hidden');
  document.getElementById('banner-combo').classList.remove('hidden');
  document.getElementById('titulo-servicios').classList.remove('hidden');

  cerrarModalPerfil();
  renderizarCatalogo();
  actualizarCarritoVista();
}

function pedirPinRevendedor() {
  cerrarModalPerfil();
  modoPinDestino = 'REVENDEDOR';
  
  document.getElementById('modal-pin-titulo').innerText = `Acceso Revendedor (${paisActivo})`;
  document.getElementById('modal-pin-subtitulo').innerText = `Ingresa el PIN asignado al catálogo regional de ${paisActivo}.`;
  document.getElementById('input-pin').value = '';
  document.getElementById('modal-pin').classList.remove('hidden');
}

// SEGURIDAD ADMIN
function solicitarAccesoAdmin() {
  modoPinDestino = 'ADMIN';
  
  document.getElementById('modal-pin-titulo').innerText = "Acceso Administrativo";
  document.getElementById('modal-pin-subtitulo').innerText = "Introduce la Clave Maestra de Backoffice.";
  document.getElementById('input-pin').value = '';
  document.getElementById('modal-pin').classList.remove('hidden');
}

function cerrarModalPin() {
  document.getElementById('modal-pin').classList.add('hidden');
}

function validarPinIngresado() {
  const pinIngresado = document.getElementById('input-pin').value.trim();

  if (modoPinDestino === 'ADMIN') {
    if (pinIngresado === String(pinesSeguridad.admin || '9999')) {
      cerrarModalPin();
      mostrarPanelAdmin();
    } else {
      alert("❌ PIN Administrativo Incorrecto.");
    }
  } else if (modoPinDestino === 'REVENDEDOR') {
    if (pinIngresado === String(pinesSeguridad[paisActivo] || '2222')) {
      cerrarModalPin();
      seleccionarPerfil('REVENDEDOR');
    } else {
      alert(`❌ PIN Incorrecto para ${paisActivo}.`);
    }
  }
}

function mostrarPanelAdmin() {
  document.getElementById('vista-catalogo').classList.add('hidden');
  document.getElementById('vista-admin').classList.remove('hidden');
  cargarDatosFormularioAdmin();
}

function salirDelAdmin() {
  document.getElementById('vista-admin').classList.add('hidden');
  document.getElementById('vista-catalogo').classList.remove('hidden');
}

// RENDERIZADO CON COMPATIBILIDAD DE PAÍS
function renderizarCatalogo() {
  const contenedor = document.getElementById('grid-productos-catalogo');
  if (!contenedor) return;

  contenedor.innerHTML = '';

  // FILTRO INTELIGENTE: Soporta "CO", "CO (COP)", "MX (MXN)", "AR (ARS)", etc.
  let productosFiltrados = PRODUCTOS.filter(p => {
    if (!p) return false;
    const strPais = (p.pais || '').toString().toUpperCase();
    if (paisActivo === 'CO') return strPais.includes('CO');
    if (paisActivo === 'MX') return strPais.includes('MX');
    if (paisActivo === 'AR') return strPais.includes('AR');
    if (paisActivo === 'USDEUR') return strPais.includes('USD') || strPais.includes('EUR') || strPais.includes('USDEUR');
    return false;
  });

  if (productosFiltrados.length === 0) {
    contenedor.innerHTML = `
      <div class="col-span-2 bg-white p-8 rounded-xl border border-gray-200 text-center">
        <p class="text-gray-400 text-xs font-bold">No hay servicios disponibles para este catálogo.</p>
      </div>
    `;
    return;
  }

  const moneda = obtenerMonedaPorPais(paisActivo);

  productosFiltrados.forEach((prod) => {
    const precio = perfilActivo === 'REVENDEDOR' 
      ? (prod.precioRevendedor ?? prod.precio_revendedor ?? prod.precioDistribuidor ?? 0)
      : (prod.precioCliente ?? prod.precio_cliente ?? prod.precio ?? 0);

    const estaAgotado = prod.agotado || false;

    contenedor.innerHTML += `
      <div class="bg-white p-5 rounded-2xl border border-gray-200 flex justify-between items-center shadow-sm hover:shadow transition">
        <div>
          <span class="text-[10px] font-black text-amber-500 uppercase tracking-wider block mb-1">
            ${prod.categoria || prod.categoriaNombre || 'STREAMING'}
          </span>
          <h4 class="text-sm font-bold text-gray-900">${prod.nombre || prod.title || 'Servicio'}</h4>
          <p class="text-sm font-black text-gray-900 mt-2">
            ${moneda} $${parseFloat(precio).toLocaleString()}
          </p>
        </div>
        <div class="flex items-center gap-2">
          ${estaAgotado 
            ? `
              <div class="text-center">
                <span class="bg-amber-100 text-amber-800 text-[10px] font-black px-2.5 py-1 rounded-md uppercase block">Agotado</span>
                <span class="text-[9px] text-gray-400 block mt-1">Temporalmente Sin Stock</span>
              </div>
            `
            : `
              <button onclick='agregarAlCarrito(${JSON.stringify(prod)})' class="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold px-3 py-2.5 rounded-xl transition flex items-center gap-1">
                🛒 Al Carrito
              </button>
              <button onclick='agregarACombo(${JSON.stringify(prod)})' class="bg-amber-500 hover:bg-amber-600 text-gray-950 text-xs font-black px-3.5 py-2.5 rounded-xl shadow transition flex items-center gap-1">
                ⚡ Combo 3
              </button>
            `
          }
        </div>
      </div>
    `;
  });
}

// SÚPER COMBO
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
        <div class="relative bg-white text-gray-900 p-3 rounded-xl flex flex-col justify-center items-center shadow text-center border border-amber-200">
          <button onclick="quitarDelCombo(${i})" class="absolute -top-1.5 -right-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shadow">
            ✕
          </button>
          <span class="text-[9px] font-black text-amber-600 uppercase tracking-widest">Slot ${i + 1}</span>
          <p class="text-xs font-bold mt-1 text-gray-800 line-clamp-1">${prod.nombre || prod.title}</p>
        </div>
      `;
    } else {
      contenedor.innerHTML += `
        <div class="bg-white/20 border border-white/40 border-dashed p-3 rounded-xl flex items-center justify-center text-white text-xs font-bold text-center min-h-[55px]">
          Slot ${i + 1} libre
        </div>
      `;
    }
  }

  const lblPrecioCombo = document.getElementById('lbl-precio-combo-activo');
  if (lblPrecioCombo) {
    lblPrecioCombo.innerText = `${moneda} $${parseFloat(precioTarifaCombo).toLocaleString()}`;
  }
}

// CARRITO
function agregarAlCarrito(producto) {
  carritoNormal.push(producto);
  actualizarCarritoVista();
}

function quitarDelCarrito(index) {
  carritoNormal.splice(index, 1);
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

  if (comboSeleccionado.length > 0) {
    const precioCombo = tarifasCombo[paisActivo] || 0;
    totalGeneral += parseFloat(precioCombo);
    let nombresCombo = comboSeleccionado.map(c => c.nombre || c.title).join(' + ');

    contenedor.innerHTML += `
      <div class="bg-amber-50 border border-amber-200 p-3 rounded-xl text-xs mb-2">
        <div class="flex justify-between items-center font-bold text-amber-900">
          <span>⚡ Súper Combo (${comboSeleccionado.length}/3)</span>
          <span>$${parseFloat(precioCombo).toLocaleString()}</span>
        </div>
        <p class="text-[11px] text-amber-700 mt-1 leading-tight">${nombresCombo}</p>
        <button onclick="vaciarCombo()" class="text-[10px] text-red-600 font-bold underline mt-1 block">Quitar Combo</button>
      </div>
    `;
  }

  carritoNormal.forEach((item, idx) => {
    const precio = perfilActivo === 'REVENDEDOR' 
      ? (item.precioRevendedor ?? item.precio_revendedor ?? item.precioDistribuidor ?? 0)
      : (item.precioCliente ?? item.precio_cliente ?? item.precio ?? 0);

    totalGeneral += parseFloat(precio);

    contenedor.innerHTML += `
      <div class="flex justify-between items-center text-xs bg-gray-50 p-3 rounded-xl border border-gray-100 mb-2">
        <div>
          <p class="font-bold text-gray-800">${item.nombre || item.title}</p>
          <span class="text-[10px] text-gray-400 uppercase">${item.categoria || 'STREAMING'}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="font-black text-gray-900">$${parseFloat(precio).toLocaleString()}</span>
          <button onclick="quitarDelCarrito(${idx})" class="text-red-500 font-bold px-1">✕</button>
        </div>
      </div>
    `;
  });

  if (lblTotal) {
    lblTotal.innerText = `${moneda} $${totalGeneral.toLocaleString()}`;
  }
}

// WHATSAPP
function enviarPedidoWhatsApp() {
  if (comboSeleccionado.length === 0 && carritoNormal.length === 0) {
    alert("⚠️ Tu pedido está vacío.");
    return;
  }

  const moneda = obtenerMonedaPorPais(paisActivo);
  let totalGeneral = 0;

  let mensaje = `👋 *NUEVO PEDIDO - EDWAUGE.VIP*\n`;
  mensaje += `----------------------------------------\n`;
  mensaje += `📍 *Catálogo:* ${paisActivo}\n`;
  mensaje += `👤 *Perfil:* ${perfilActivo}\n`;
  mensaje += `----------------------------------------\n\n`;

  if (comboSeleccionado.length > 0) {
    const precioCombo = tarifasCombo[paisActivo] || 0;
    totalGeneral += parseFloat(precioCombo);
    mensaje += `⚡ *SÚPER COMBO DE 3 CUENTAS:*\n`;
    comboSeleccionado.forEach((c, idx) => {
      mensaje += `   ${idx + 1}. ${c.nombre || c.title}\n`;
    });
    mensaje += `   *Precio Combo:* ${moneda} $${parseFloat(precioCombo).toLocaleString()}\n\n`;
  }

  if (carritoNormal.length > 0) {
    mensaje += `🛒 *CUENTAS INDIVIDUALES:*\n`;
    carritoNormal.forEach((item) => {
      const precio = perfilActivo === 'REVENDEDOR' 
        ? (item.precioRevendedor ?? item.precio_revendedor ?? 0)
        : (item.precioCliente ?? item.precio_cliente ?? item.precio ?? 0);
      totalGeneral += parseFloat(precio);
      mensaje += `   • ${item.nombre || item.title} - $${parseFloat(precio).toLocaleString()}\n`;
    });
    mensaje += `\n`;
  }

  mensaje += `----------------------------------------\n`;
  mensaje += `💰 *TOTAL A PAGAR:* ${moneda} $${totalGeneral.toLocaleString()}\n`;
  mensaje += `----------------------------------------\n`;

  window.open(`https://api.whatsapp.com/send?phone=573022237839&text=${encodeURIComponent(mensaje)}`, '_blank');
}

// ADMIN CRUD
function guardarProducto() {
  const indexStr = document.getElementById('form-product-index').value;
  const nombre = document.getElementById('form-product-nombre').value.trim();
  const categoria = document.getElementById('form-product-categoria').value.trim();
  const pais = document.getElementById('form-product-pais').value;
  const precioCliente = parseFloat(document.getElementById('form-product-precio-cliente').value) || 0;
  const precioRevendedor = parseFloat(document.getElementById('form-product-precio-revendedor').value) || 0;
  const agotado = document.getElementById('form-product-agotado').checked;

  if (!nombre) {
    alert("⚠️ Ingresa el nombre del producto.");
    return;
  }

  const productoObjeto = { nombre, categoria: categoria || 'STREAMING', pais, precioCliente, precioRevendedor, agotado };

  if (indexStr === "") {
    PRODUCTOS.push(productoObjeto);
  } else {
    PRODUCTOS[parseInt(indexStr)] = productoObjeto;
  }

  database.ref('productos').set(PRODUCTOS).then(() => {
    alert("✅ Guardado en base de datos.");
    limpiarFormularioProducto();
  });
}

function editarProducto(index) {
  const prod = PRODUCTOS[index];
  if (!prod) return;

  document.getElementById('form-product-index').value = index;
  document.getElementById('form-product-nombre').value = prod.nombre || prod.title || '';
  document.getElementById('form-product-categoria').value = prod.categoria || '';
  document.getElementById('form-product-pais').value = prod.pais || 'CO (COP)';
  document.getElementById('form-product-precio-cliente').value = prod.precioCliente ?? prod.precio_cliente ?? 0;
  document.getElementById('form-product-precio-revendedor').value = prod.precioRevendedor ?? prod.precio_revendedor ?? 0;
  document.getElementById('form-product-agotado').checked = prod.agotado || false;
}

function eliminarProducto(index) {
  if (confirm(`¿Eliminar "${PRODUCTOS[index].nombre}"?`)) {
    PRODUCTOS.splice(index, 1);
    database.ref('productos').set(PRODUCTOS);
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

  PRODUCTOS.forEach((prod, idx) => {
    const pPais = prod.pais || 'CO (COP)';
    const pCliente = prod.precioCliente ?? prod.precio_cliente ?? 0;
    const pRevendedor = prod.precioRevendedor ?? prod.precio_revendedor ?? 0;
    const estaAgotado = prod.agotado || false;

    tbody.innerHTML += `
      <tr class="border-b border-gray-100 text-xs hover:bg-gray-50">
        <td class="p-3 font-bold text-amber-600">${pPais}</td>
        <td class="p-3 text-gray-400 font-bold uppercase">${prod.categoria || 'STREAMING'}</td>
        <td class="p-3 font-bold text-gray-900">${prod.nombre || prod.title}</td>
        <td class="p-3">
          <span class="${estaAgotado ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'} text-[10px] font-black px-2.5 py-1 rounded-md uppercase">
            ${estaAgotado ? 'AGOTADO' : 'DISPONIBLE'}
          </span>
        </td>
        <td class="p-3 font-bold text-gray-700">$${parseFloat(pCliente).toLocaleString()}</td>
        <td class="p-3 font-bold text-gray-700">$${parseFloat(pRevendedor).toLocaleString()}</td>
        <td class="p-3 text-right">
          <button onclick="editarProducto(${idx})" class="text-gray-500 hover:text-amber-500 font-bold px-2 py-1 mr-1">Editar</button>
          <button onclick="eliminarProducto(${idx})" class="text-red-500 hover:text-red-700 font-bold px-2 py-1">Borrar</button>
        </td>
      </tr>
    `;
  });
}

function cargarDatosFormularioAdmin() {
  document.getElementById('pin-admin').value = pinesSeguridad.admin || '9999';
  document.getElementById('pin-CO').value = pinesSeguridad.CO || '2222';
  document.getElementById('pin-MX').value = pinesSeguridad.MX || '2222';
  document.getElementById('pin-AR').value = pinesSeguridad.AR || '2222';
  document.getElementById('pin-USDEUR').value = pinesSeguridad.USDEUR || '2222';

  document.getElementById('precio-combo-CO').value = tarifasCombo.CO || 30000;
  document.getElementById('precio-combo-MX').value = tarifasCombo.MX || 199;
  document.getElementById('precio-combo-AR').value = tarifasCombo.AR || 2500;
  document.getElementById('precio-combo-USDEUR').value = tarifasCombo.USDEUR || 10;
}

function guardarPinesAdmin() {
  const nuevosPines = {
    admin: document.getElementById('pin-admin').value.trim() || '9999',
    CO: document.getElementById('pin-CO').value.trim() || '2222',
    MX: document.getElementById('pin-MX').value.trim() || '2222',
    AR: document.getElementById('pin-AR').value.trim() || '2222',
    USDEUR: document.getElementById('pin-USDEUR').value.trim() || '2222'
  };

  database.ref('pinesSeguridad').set(nuevosPines).then(() => alert("🔒 Seguridad Actualizada."));
}

function guardarTarifasAdmin() {
  const nuevasTarifas = {
    CO: parseFloat(document.getElementById('precio-combo-CO').value) || 30000,
    MX: parseFloat(document.getElementById('precio-combo-MX').value) || 199,
    AR: parseFloat(document.getElementById('precio-combo-AR').value) || 2500,
    USDEUR: parseFloat(document.getElementById('precio-combo-USDEUR').value) || 10
  };

  database.ref('tarifasCombo').set(nuevasTarifas).then(() => alert("⚡ Tarifas Combo Actualizadas."));
}

function obtenerMonedaPorPais(pais) {
  if (pais === 'MX') return 'MXN';
  if (pais === 'AR') return 'ARS';
  if (pais === 'USDEUR') return 'USD';
  return 'COP';
}
