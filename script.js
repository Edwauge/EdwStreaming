// CONFIGURACIÓN DE TU BASE DE DATOS EN LA NUBE
const firebaseConfig = {
  databaseURL: "https://edwstreaming-eba93-default-rtdb.firebaseio.com/" 
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let PINES = { admin: "3859", CO: "2233", MX: "3344", AR: "4455" };
let COMBOS = { CO: 35000, MX: 199, AR: 2500 };
let PRODUCTOS = [];

let estado = { paisActual: 'CO', rolActual: null, carrito: [], comboSeleccionado: [null, null, null] };
const Monedas = { CO: 'COP $', MX: 'MXN $', AR: 'ARS $' };

// ESCUCHAR CAMBIOS EN TIEMPO REAL DESDE LA NUBE
db.ref().on('value', (snapshot) => {
  const data = snapshot.val();
  if (data) {
    if (data.pines) PINES = data.pines;
    if (data.combos) COMBOS = data.combos;
    // Firebase guarda listas como objetos indexados a veces, lo convertimos a array limpio
    if (data.productos) {
      PRODUCTOS = Object.values(data.productos).filter(p => p !== null);
    } else {
      PRODUCTOS = [];
    }
  }
  
  // Ocultar pantalla de carga inicial y mostrar la app real
  document.getElementById('loader-conexion').classList.add('hidden');
  if(!estado.rolActual) {
    document.getElementById('vista-seleccion-rol').classList.remove('hidden');
  }
  
  sincronizarCamposAdmin();
  actualizarVistaVenta();
  if (!document.getElementById('vista-admin').classList.contains('hidden')) {
    renderizarTablaAdminProductos();
  }
});

function enviarDatosANube() {
  db.ref().set({
    pines: PINES,
    combos: COMBOS,
    productos: PRODUCTOS
  });
}

function cambiarPais(codigoPais) {
  estado.paisActual = codigoPais;
  estado.carrito = []; 
  estado.comboSeleccionado = [null, null, null];
  ['CO', 'MX', 'AR'].forEach(p => {
    const btn = document.getElementById(`tab-${p}`);
    btn.className = p === codigoPais ? "flex-1 py-4 text-center font-bold text-sm sm:text-base border-b-2 border-yellow-500 text-yellow-600 transition-all" : "flex-1 py-4 text-center font-bold text-sm sm:text-base border-b-2 border-transparent text-gray-400 hover:text-gray-700 transition-all";
  });
  estado.rolActual = null;
  actualizarVistaVenta();
}

function seleccionarRol(rol) { estado.rolActual = rol; actualizarVistaVenta(); }
function abrirModalPinRol() { document.getElementById('modal-pin-rol-pais').innerText = estado.paisActual === 'CO' ? 'Colombia' : estado.paisActual === 'MX' ? 'México' : 'Argentina'; document.getElementById('input-modal-pin-rol').value = ''; document.getElementById('modal-pin-rol').classList.remove('hidden'); }
function cerrarModalPinRol() { document.getElementById('modal-pin-rol').classList.add('hidden'); }

function validarPinRol() {
  if(document.getElementById('input-modal-pin-rol').value === PINES[estado.paisActual]) { cerrarModalPinRol(); seleccionarRol('revendedor'); }
  else { alert("❌ Código PIN incorrecto para este catálogo."); }
}

function volverASeleccionRol() { estado.rolActual = null; estado.carrito = []; estado.comboSeleccionado = [null, null, null]; actualizarVistaVenta(); }

function actualizarVistaVenta() {
  const divSeleccion = document.getElementById('vista-seleccion-rol');
  const divTienda = document.getElementById('vista-tienda');
  if (!estado.rolActual) { 
    if(PRODUCTOS.length > 0 || document.getElementById('loader-conexion').classList.contains('hidden')) {
      divSeleccion.classList.remove('hidden'); 
    }
    divTienda.classList.add('hidden'); 
    return; 
  }
  divSeleccion.classList.add('hidden'); divTienda.classList.remove('hidden');
  document.getElementById('badge-pais').innerText = `País: ${estado.paisActual}`;
  document.getElementById('badge-rol').innerText = `Perfil: ${estado.rolActual.toUpperCase()}`;
  const seccionCombo = document.getElementById('seccion-oferta-combo');
  if (estado.rolActual === 'cliente') { seccionCombo.classList.remove('hidden'); document.getElementById('precio-combo-texto').innerText = `${Monedas[estado.paisActual]}${COMBOS[estado.paisActual].toLocaleString()}`; renderizarSlotsCombo(); }
  else { seccionCombo.classList.add('hidden'); }
  renderizarCatalogoProductos(); renderizarCarrito();
}

function renderizarSlotsCombo() {
  const container = document.getElementById('slots-combo'); container.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const item = estado.comboSeleccionado[i];
    container.innerHTML += item ? `<div class="bg-yellow-50 border border-yellow-300 rounded-xl p-3 flex flex-col justify-between text-left transition-all"><span class="text-xs text-yellow-800 font-bold block mb-1 truncate">${item.nombre}</span><button onclick="removerItemCombo(${i})" class="text-left text-red-500 hover:text-red-700 text-xs font-bold flex items-center gap-1 mt-1"><i class="fa-solid fa-trash-can text-[10px]"></i> Quitar</button></div>` : `<div class="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center justify-center text-center text-gray-400 text-xs"><i class="fa-solid fa-layer-group text-base mb-1 text-gray-300"></i><span>Slot ${i + 1} libre</span></div>`;
  }
}

function renderizarCatalogoProductos() {
  const container = document.getElementById('contenedor-productos'); container.innerHTML = '';
  const filtrados = PRODUCTOS.filter(p => p.pais === estado.paisActual);
  if(filtrados.length === 0) { container.innerHTML = `<p class="text-xs text-gray-400 col-span-2 py-6 text-center bg-white border border-gray-200 rounded-2xl shadow-xs">No hay productos registrados en este catálogo aún.</p>`; return; }
  filtrados.forEach((prod) => {
    const precio = estado.rolActual === 'cliente' ? prod.precioCliente : prod.precioRevendedor;
    const indexGlobal = PRODUCTOS.findIndex(p => p.nombre === prod.nombre && p.pais === prod.pais);
    let botonesHTML = prod.agotado ? `<button disabled class="w-full bg-gray-100 text-gray-400 font-bold py-2.5 px-3 rounded-xl text-xs cursor-not-allowed border border-gray-200 text-center">Temporalmente Sin Stock</button>` : `<button onclick="agregarAlCarrito(${indexGlobal})" class="flex-1 bg-gray-100 hover:bg-yellow-100/60 text-gray-700 hover:text-yellow-800 font-bold py-2.5 px-3 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 border border-gray-200/60 hover:border-yellow-200"><i class="fa-solid fa-cart-plus opacity-70"></i> Al Carrito</button>` + (estado.rolActual === 'cliente' ? `<button onclick="agregarAlComboEspecial(${indexGlobal})" class="bg-yellow-400/90 hover:bg-yellow-400 text-gray-900 font-extrabold py-2.5 px-3 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-xs"><i class="fa-solid fa-wand-magic-sparkles text-xs"></i> Combo 3</button>` : '');
    container.innerHTML += `<div class="${prod.agotado ? 'bg-white/80 border border-gray-200 rounded-2xl p-5 flex flex-col justify-between shadow-none opacity-60 select-none pointer-events-none' : 'bg-white border border-gray-200 rounded-2xl p-5 flex flex-col justify-between shadow-xs hover:shadow-md hover:border-gray-300 transition-all'}"><div><div class="flex justify-between items-center gap-2 mb-2">${prod.agotado ? '<span class="text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full bg-red-100 text-red-600 tracking-wider">Agotado</span>' : `<span class="text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-500 tracking-wider">${prod.categoria}</span>`}<span class="text-base font-black text-gray-900 tracking-tight">${Monedas[estado.paisActual]}${precio.toLocaleString()}</span></div><h4 class="text-sm font-bold text-gray-800 leading-snug mb-4">${prod.nombre}</h4></div><div class="flex gap-2 pt-3 border-t border-gray-100">${botonesHTML}</div></div>`;
  });
}

function agregarAlComboEspecial(idx) {
  const prod = PRODUCTOS[idx]; if(prod.agotado) return;
  const slot = estado.comboSeleccionado.findIndex(item => item === null);
  if (slot !== -1) { estado.comboSeleccionado[slot] = prod; renderizarSlotsCombo(); renderizarCarrito(); }
  else { alert("💡 Ya tienes 3 productos en el combo."); }
}
function removerItemCombo(idx) { estado.comboSeleccionado[idx] = null; renderizarSlotsCombo(); renderizarCarrito(); }

function agregarAlCarrito(idx) {
  const prod = PRODUCTOS[idx]; if(prod.agotado) return;
  const ex = estado.carrito.find(item => item.producto.nombre === prod.nombre && item.producto.pais === prod.pais);
  if (ex) { ex.cantidad++; } else { estado.carrito.push({ producto: prod, trackingIndex: idx, cantidad: 1 }); }
  renderizarCarrito();
}
function cambiarCantidadCarrito(idx, delta) { estado.carrito[idx].cantidad += delta; if(estado.carrito[idx].cantidad <= 0) estado.carrito.splice(idx, 1); renderizarCarrito(); }

function renderizarCarrito() {
  const container = document.getElementById('items-carrito'); container.innerHTML = '';
  let total = 0;
  estado.carrito.forEach((item, index) => {
    const pU = estado.rolActual === 'cliente' ? item.producto.precioCliente : item.producto.precioRevendedor;
    total += (pU * item.cantidad);
    container.innerHTML += `<div class="bg-gray-50 border border-gray-200 p-3 rounded-xl flex items-center justify-between text-xs shadow-xs"><div class="max-w-[60%]"><p class="font-bold text-gray-800 truncate">${item.producto.nombre}</p><p class="text-gray-400 font-mono">${Monedas[estado.paisActual]}${pU.toLocaleString()} c/u</p></div><div class="flex items-center space-x-2"><div class="flex items-center bg-white rounded-lg border border-gray-300"><button onclick="cambiarCantidadCarrito(${index}, -1)" class="px-2 py-0.5 text-gray-500">-</button><span class="px-1 text-gray-800 font-bold">${item.cantidad}</span><button onclick="cambiarCantidadCarrito(${index}, +1)" class="px-2 py-0.5 text-gray-500">+</button></div><span class="font-black text-gray-800 min-w-[55px] text-right">${Monedas[estado.paisActual]}${(pU * item.cantidad).toLocaleString()}</span></div></div>`;
  });
  const pCombo = estado.comboSeleccionado.filter(p => p !== null).length;
  if (estado.rolActual === 'cliente' && pCombo > 0) {
    let pNormal = 0; let names = []; estado.comboSeleccionado.forEach(p => { if(p){ pNormal += p.precioCliente; names.push(p.nombre); }});
    if (pCombo === 3) { total += COMBOS[estado.paisActual]; document.getElementById('desglose-oferta').classList.remove('hidden'); document.getElementById('desglose-ahorro').innerText = `-${Monedas[estado.paisActual]}${(pNormal - COMBOS[estado.paisActual]).toLocaleString()}`; container.innerHTML += `<div class="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-300 p-3 rounded-xl text-xs shadow-xs"><div class="flex justify-between items-center mb-1"><span class="font-black text-yellow-800">Combo Especial Activado</span><span class="font-black text-yellow-700">${Monedas[estado.paisActual]}${COMBOS[estado.paisActual].toLocaleString()}</span></div></div>`; }
    else { total += pNormal; document.getElementById('desglose-oferta').classList.add('hidden'); container.innerHTML += `<div class="bg-gray-50 border border-dashed border-gray-300 p-3 rounded-xl text-xs text-gray-400">Combo Especial (${pCombo}/3)</div>`; }
  }
  document.getElementById('total-carrito-texto').innerText = `${Monedas[estado.paisActual]}${total.toLocaleString()}`;
}

function obtenerProductoWhatsApp() {
  const pCombo = estado.comboSeleccionado.filter(p => p !== null);
  if (estado.carrito.length === 0 && pCombo.length === 0) { alert("🛒 Tu carrito está vacío."); return; }
  let mensaje = `👋 ¡Hola *Edwauge.Vip*! Me interesa adquirir los siguientes productos de Streaming:\n\n🌍 *Catálogo:* ${estado.paisActual}\n👤 *Perfil:* ${estado.rolActual}\n-------------------------------------------\n`;
  let total = 0;
  estado.carrito.forEach(item => {
    const pU = estado.rolActual === 'cliente' ? item.producto.precioCliente : item.producto.precioRevendedor;
    total += pU * item.cantidad; mensaje += `📦 *${item.cantidad}x* ${item.producto.nombre} (${Monedas[estado.paisActual]}${(pU * item.cantidad).toLocaleString()})\n`;
  });
  if (estado.rolActual === 'cliente' && pCombo.length === 3) { total += COMBOS[estado.paisActual]; mensaje += `\n🔥 *Súper Combo Especial (3 Productos):* ${Monedas[estado.paisActual]}${COMBOS[estado.paisActual].toLocaleString()}\n`; }
  mensaje += `-------------------------------------------\n💰 *TOTAL NETO:* ${Monedas[estado.paisActual]}${total.toLocaleString()}`;
  window.open(`https://api.whatsapp.com/send?phone=3022237839&text=${encodeURIComponent(mensaje)}`, '_blank');
}

function abrirLoginAdmin() { document.getElementById('input-modal-pin-admin').value = ''; document.getElementById('modal-pin-admin').classList.remove('hidden'); }
function cerrarLoginAdmin() { document.getElementById('modal-pin-admin').classList.add('hidden'); }
function validarPinAdmin() { if(document.getElementById('input-modal-pin-admin').value === PINES.admin) { cerrarLoginAdmin(); document.getElementById('vista-seleccion-rol').classList.add('hidden'); document.getElementById('vista-tienda').classList.add('hidden'); document.getElementById('vista-admin').classList.remove('hidden'); renderizarTablaAdminProductos(); } else { alert("❌ PIN Inválido."); }}
function cerrarAdmin() { document.getElementById('vista-admin').classList.add('hidden'); actualizarVistaVenta(); }

function sincronizarCamposAdmin() {
  document.getElementById('input-pin-admin').value = PINES.admin; document.getElementById('input-pin-co').value = PINES.CO; document.getElementById('input-pin-mx').value = PINES.MX; document.getElementById('input-pin-ar').value = PINES.AR;
  document.getElementById('input-combo-co').value = COMBOS.CO; document.getElementById('input-combo-mx').value = COMBOS.MX; document.getElementById('input-combo-ar').value = COMBOS.AR;
}

function guardarConfiguracionPines() { PINES.admin = document.getElementById('input-pin-admin').value.trim(); PINES.CO = document.getElementById('input-pin-co').value.trim(); PINES.MX = document.getElementById('input-pin-mx').value.trim(); PINES.AR = document.getElementById('input-pin-ar').value.trim(); enviarDatosANube(); alert("🔑 PINs guardados en la nube."); }
function guardarPreciosCombo() { COMBOS.CO = parseFloat(document.getElementById('input-combo-co').value) || 0; COMBOS.MX = parseFloat(document.getElementById('input-combo-mx').value) || 0; COMBOS.AR = parseFloat(document.getElementById('input-combo-ar').value) || 0; enviarDatosANube(); alert("💰 Tarifas Combo guardadas en la nube."); }

function guardarProducto() {
  const indexStr = document.getElementById('form-product-index').value;
  const nombre = document.getElementById('form-product-nombre').value.trim();
  const categoria = document.getElementById('form-product-categoria').value;
  const pais = document.getElementById('form-product-pais').value;
  const precioCliente = parseFloat(document.getElementById('form-product-precio-cliente').value) || 0;
  const precioRevendedor = parseFloat(document.getElementById('form-product-precio-revendedor').value) || 0;
  const agotado = document.getElementById('form-product-agotado').checked;

  if (!nombre) { alert("⚠️ Escribe el nombre del producto."); return; }
  const estructura = { nombre, categoria, pais, precioCliente, precioRevendedor, agotado };

  if (indexStr === "") { PRODUCTOS.push(estructura); } 
  else {
    const idx = parseInt(indexStr);
    if (agotado) {
      const pAnt = PRODUCTOS[idx];
      for(let i=0; i<3; i++) { if(estado.comboSeleccionado[i] && estado.comboSeleccionado[i].nombre === pAnt.nombre && estado.comboSeleccionado[i].pais === pAnt.pais) estado.comboSeleccionado[i] = null; }
      estado.carrito = estado.carrito.filter(item => !(item.producto.nombre === pAnt.nombre && item.producto.pais === pAnt.pais));
    }
    PRODUCTOS[idx] = estructura;
  }
  enviarDatosANube(); limpiarFormularioProducto(); renderizarTablaAdminProductos(); alert("✨ Guardado en la nube.");
}

function editarProducto(idx) {
  const prod = PRODUCTOS[idx];
  document.getElementById('form-product-index').value = idx;
  document.getElementById('form-product-nombre').value = prod.nombre;
  document.getElementById('form-product-categoria').value = prod.categoria;
  document.getElementById('form-product-pais').value = prod.pais;
  document.getElementById('form-product-precio-cliente').value = prod.precioCliente;
  document.getElementById('form-product-precio-revendedor').value = prod.precioRevendedor;
  document.getElementById('form-product-agotado').checked = prod.agotado || false;
  window.scrollTo({ top: 100, behavior: 'smooth' });
}

function eliminarProducto(idx) {
  if (confirm("🗑️ ¿Eliminar este producto?")) {
    const pB = PRODUCTOS[idx];
    for(let i=0; i<3; i++) { if(estado.comboSeleccionado[i] && estado.comboSeleccionado[i].nombre === pB.nombre && estado.comboSeleccionado[i].pais === pB.pais) estado.comboSeleccionado[i] = null; }
    estado.carrito = estado.carrito.filter(item => !(item.producto.nombre === pB.nombre && item.producto.pais === pB.pais));
    PRODUCTOS.splice(idx, 1); enviarDatosANube(); renderizarTablaAdminProductos();
  }
}

function limpiarFormularioProducto() {
  document.getElementById('form-product-index').value = ""; document.getElementById('form-product-nombre').value = "";
  document.getElementById('form-product-precio-cliente').value = ""; document.getElementById('form-product-precio-revendedor').value = "";
  document.getElementById('form-product-agotado').checked = false;
}

function renderizarTablaAdminProductos() {
  const tbody = document.getElementById('tabla-admin-productos'); tbody.innerHTML = '';
  if (PRODUCTOS.length === 0) { tbody.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-gray-400">No hay productos en la base de datos de la nube.</td></tr>`; return; }
  PRODUCTOS.forEach((prod, index) => {
    tbody.innerHTML += `<tr class="hover:bg-gray-50 text-gray-700"><td class="p-3.5 text-xs font-bold font-mono text-yellow-600">${prod.pais}</td><td class="p-3.5"><span class="bg-gray-100 text-gray-600 text-[10px] uppercase font-black px-2 py-0.5 rounded">${prod.categoria}</span></td><td class="p-3.5 font-bold text-gray-800 text-xs">${prod.nombre}</td><td class="p-3.5">${prod.agotado ? '<span class="bg-red-50 text-red-600 border border-red-200 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase">Agotado</span>' : '<span class="bg-emerald-50 text-emerald-600 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase">Disponible</span>'}</td><td class="p-3.5 text-xs font-black">${Monedas[prod.pais]}${prod.precioCliente.toLocaleString()}</td><td class="p-3.5 text-xs font-black">${Monedas[prod.pais]}${prod.precioRevendedor.toLocaleString()}</td><td class="p-3.5 text-center"><button onclick="editarProducto(${index})" class="bg-gray-100 hover:bg-yellow-100 text-gray-600 text-xs font-bold py-1 px-3 rounded-lg border border-gray-200">Editar</button> <button onclick="eliminarProducto(${index})" class="bg-red-50 text-red-500 text-xs font-bold py-1 px-3 rounded-lg border border-red-200">Borrar</button></td></tr>`;
  });
}
