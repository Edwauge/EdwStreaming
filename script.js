// CONFIGURACIÓN DE TU BASE DE DATOS FIREBASE (REEMPLAZA CON TUS DATOS REALES)
const firebaseConfig = {
  apiKey: "AIzaSyALCWvd0moFMEPsF2vmTCaA4gypY8muypw",
  authDomain: "edwstreaming-55d3f.firebaseapp.com",
  databaseURL: "https://edwstreaming-55d3f-default-rtdb.firebaseio.com",
  projectId: "edwstreaming-55d3f",
  storageBucket: "edwstreaming-55d3f.firebasestorage.app",
  messagingSenderId: "931099489737",
  appId: "1:931099489737:web:7f4d25b9f595b73d06a418",
  measurementId: "G-HYFX136YD5"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// Variables globales del sistema
let PINES = { admin: "3859", CO: "2233", MX: "3344", AR: "4455", USDEUR: "5566" };
let COMBOS = { CO: 35000, MX: 199, AR: 2500, USDEUR: 10 };
let PRODUCTOS = [];

// Métodos de pago fijos
const METODOS_PAGO = {
  CO: "*🇨🇴 MÉTODOS DE PAGO COLOMBIA:*\n• *Nequi:* 3022237839 a nombre de Edwin Rincon\n• *Llave:* 3022237839",
  MX: "*🇲🇽 MÉTODOS DE PAGO MÉXICO:*\n• *Clabe:* 728969000103900679\n• *Banco:* Spin Oxxo\n• *Beneficiario:* Mauricio Moreno",
  AR: "*🇦🇷 MÉTODOS DE PAGO ARGENTINA:*\n• *CBU:* 4530000800012376220236\n• *Alias:* rodre.nx",
  USD: "*💵 MÉTODOS DE PAGO DÓLARES (USD):*\n• *Zelle:* oscar (Preguntar correo al interno)\n• *Binance ID:* 7324301025\n• *ID 2:* 167282077",
  EUR: "*💶 MÉTODOS DE PAGO EUROS (EUR):*\n• *Bizum:* Miguel - 682903023"
};

let estado = { paisActual: 'CO', rolActual: null, carrito: [], comboSeleccionado: [null, null, null], tipoModalActivo: null };
const SimbolosMoneda = { COP: 'COP $', MXN: 'MXN $', ARS: 'ARS $', USD: 'USD $', EUR: 'EUR €' };

// Carga Inicial Automática desde la Nube (Solamente un onload)
window.onload = function() {
  escucharBaseDeDatos();
};

// Función mágica que escucha cambios en tiempo real a nivel mundial
function escucharBaseDeDatos() {
  db.ref('streaming_system').on('value', (snapshot) => {
    const data = snapshot.val();
    if (data) {
      if (data.pines) PINES = data.pines;
      if (data.combos) COMBOS = data.combos;
      PRODUCTOS = data.productos ? Object.values(data.productos) : [];
    } else {
      enviarDatosAFirebase();
    }
    sincronizarCamposAdmin();
    actualizarVistaVenta();
    if (document.getElementById('vista-admin') && !document.getElementById('vista-admin').classList.contains('hidden')) {
      renderizarTablaAdminProductos();
    }
  });
}

// Sube los datos locales hacia la nube de Google
function enviarDatosAFirebase() {
  db.ref('streaming_system').set({
    pines: PINES,
    combos: COMBOS,
    productos: PRODUCTOS
  });
}

function cambiarPais(codigoPais) {
  estado.paisActual = codigoPais;
  estado.carrito = []; 
  estado.comboSeleccionado = [null, null, null];
  
  ['CO', 'MX', 'AR', 'USDEUR'].forEach(p => {
    const btn = document.getElementById(`tab-${p}`);
    if (btn) {
      if (p === codigoPais) {
        btn.className = "flex-1 py-4 px-2 text-center font-bold text-xs sm:text-base border-b-2 border-amber-500 text-amber-600 transition-all";
      } else {
        btn.className = "flex-1 py-4 px-2 text-center font-bold text-xs sm:text-base border-b-2 border-transparent text-gray-400 hover:text-gray-700 transition-all";
      }
    }
  });
  estado.rolActual = null;
  actualizarVistaVenta();
}

function seleccionarRol(rol) { 
  estado.rolActual = rol; 
  actualizarVistaVenta(); 
}

function abrirModalSeguridad(tipo) {
  estado.tipoModalActivo = tipo;
  const modal = document.getElementById('modal-seguridad');
  const titulo = document.getElementById('modal-seguridad-titulo');
  const desc = document.getElementById('modal-seguridad-descripcion');
  const icono = document.getElementById('modal-seguridad-icono');
  const input = document.getElementById('modal-seguridad-input');

  if (!modal || !input) return;
  input.value = '';
  
  if (tipo === 'admin') {
    titulo.innerText = "Acceso Administrativo";
    desc.innerText = "Introduce la Clave Maestra de Backoffice.";
    icono.className = "fa-solid fa-user-gear";
  } else {
    let paisTexto = estado.paisActual === 'CO' ? 'Colombia' : estado.paisActual === 'MX' ? 'México' : estado.paisActual === 'AR' ? 'Argentina' : 'USD-EUR';
    titulo.innerText = `Acceso Revendedor (${paisTexto})`;
    desc.innerText = `Ingresa el PIN asignado al catálogo regional de ${paisTexto}.`;
    icono.className = "fa-solid fa-handshake";
  }

  modal.classList.remove('hidden');
  input.focus();

  input.onkeydown = function(e) {
    if (e.key === 'Enter') procesarValidacionSeguridad();
  };
}

function cerrarModalSeguridad() {
  document.getElementById('modal-seguridad')?.classList.add('hidden');
  estado.tipoModalActivo = null;
}

function procesarValidacionSeguridad() {
  const pinIngresado = document.getElementById('modal-seguridad-input')?.value.trim();
  if (!pinIngresado) { alert("⚠️ Por favor digite su código de acceso."); return; }

  if (estado.tipoModalActivo === 'admin') {
    if (pinIngresado === PINES.admin) {
      cerrarModalSeguridad();
      document.getElementById('vista-seleccion-rol')?.classList.add('hidden'); 
      document.getElementById('vista-tienda')?.classList.add('hidden'); 
      document.getElementById('vista-admin')?.classList.remove('hidden'); 
      evaluarMonedaEspecifica();
      renderizarTablaAdminProductos(); 
    } else { alert("❌ PIN de Administrador Inválido."); }
  } else if (estado.tipoModalActivo === 'revendedor') {
    if (pinIngresado === PINES[estado.paisActual]) {
      cerrarModalSeguridad();
      seleccionarRol('revendedor');
    } else { alert("❌ Código PIN incorrecto para este catálogo."); }
  }
}

function evaluarMonedaEspecifica() {
  const selectPais = document.getElementById('form-product-pais')?.value;
  const wrapperMoneda = document.getElementById('wrapper-moneda-especifica');
  if (selectPais === 'USDEUR') {
    wrapperMoneda?.classList.remove('hidden');
  } else {
    wrapperMoneda?.classList.add('hidden');
  }
}

function volverASeleccionRol() { 
  estado.rolActual = null; 
  estado.carrito = []; 
  estado.comboSeleccionado = [null, null, null]; 
  actualizarVistaVenta(); 
}

function cerrarAdmin() { document.getElementById('vista-admin')?.classList.add('hidden'); actualizarVistaVenta(); }

function obtenerPrefijoMonedaBase(pais) {
  if (pais === 'CO') return 'COP $';
  if (pais === 'MX') return 'MXN $';
  if (pais === 'AR') return 'ARS $';
  return 'USD $';
}

function actualizarVistaVenta() {
  const divSeleccion = document.getElementById('vista-seleccion-rol');
  const divTienda = document.getElementById('vista-tienda');
  const divAdmin = document.getElementById('vista-admin');
  
  // CORRECCIÓN: Si el admin ya está trabajando en su panel, NO lo expulses de la vista
  if (divAdmin && !divAdmin.classList.contains('hidden')) {
    renderizarTablaAdminProductos();
    return; 
  }
  
  if (!estado.rolActual) { 
    if(divSeleccion) divSeleccion.classList.remove('hidden'); 
    if(divTienda) divTienda.classList.add('hidden'); 
    return; 
  }
  
  if(divSeleccion) divSeleccion.classList.add('hidden'); 
  if(divTienda) divTienda.classList.remove('hidden');
  
  const bPais = document.getElementById('badge-pais');
  const bRol = document.getElementById('badge-rol');
  if(bPais) bPais.innerText = `País: ${estado.paisActual === 'USDEUR' ? 'USD-EUR' : estado.paisActual}`;
  if(bRol) bRol.innerText = `Perfil: ${estado.rolActual === 'cliente' ? 'Cliente' : 'Revendedor'}`;
  
  const seccionCombo = document.getElementById('seccion-oferta-combo');
  if (estado.rolActual === 'cliente') { 
    if(seccionCombo) seccionCombo.classList.remove('hidden'); 
    const txtCombo = document.getElementById('precio-combo-texto');
    if(txtCombo) txtCombo.innerText = `${obtenerPrefijoMonedaBase(estado.paisActual)}${(COMBOS[estado.paisActual] || 0).toLocaleString()}`; 
    renderizarSlotsCombo(); 
  } else { 
    if(seccionCombo) seccionCombo.classList.add('hidden'); 
  }
  renderizarCatalogoProductos(); 
  renderizarCarrito();
}

function renderizarSlotsCombo() {
  const container = document.getElementById('slots-combo'); 
  if(!container) return;
  container.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const item = estado.comboSeleccionado[i];
    container.innerHTML += item 
      ? `<div class="bg-white border border-amber-300 rounded-xl p-3 flex flex-col justify-between text-left text-gray-800"><span class="text-xs font-bold block mb-1 truncate">${item.nombre}</span><button onclick="removerItemCombo(${i})" class="text-left text-red-500 hover:text-red-700 text-xs font-bold flex items-center gap-1 mt-1"><i class="fa-solid fa-trash-can text-[10px]"></i> Quitar</button></div>` 
      : `<div class="bg-white/10 border border-dashed border-white/40 rounded-xl p-4 flex flex-col items-center justify-center text-center text-white/70 text-xs"><i class="fa-solid fa-layer-group text-base mb-1 opacity-60"></i><span>Slot ${i + 1} libre</span></div>`;
  }
}

function renderizarCatalogoProductos() {
  const container = document.getElementById('contenedor-productos'); 
  if(!container) return;
  container.innerHTML = '';
  const filtrados = PRODUCTOS.filter(p => p.pais === estado.paisActual);
  
  if(filtrados.length === 0) {
    container.innerHTML = `<p class="text-xs text-gray-400 col-span-1 sm:col-span-2 py-8 text-center bg-white border border-gray-200 rounded-2xl shadow-xs">No hay productos disponibles para esta región todavía.</p>`; 
    return; 
  }
  
  filtrados.forEach((prod) => {
    const precio = estado.rolActual === 'cliente' ? prod.precioCliente : prod.precioRevendedor;
    const indexGlobal = PRODUCTOS.findIndex(p => p.nombre === prod.nombre && p.pais === prod.pais && p.moneda === prod.moneda);
    const prefijoMoneda = SimbolosMoneda[prod.moneda] || 'USD $';
    
    let botonesHTML = prod.agotado 
      ? `<button disabled class="w-full bg-gray-100 text-gray-400 font-bold py-2.5 px-3 rounded-xl text-xs cursor-not-allowed border border-gray-200 text-center">Temporalmente Sin Stock</button>` 
      : `<button onclick="agregarAlCarrito(${indexGlobal})" class="flex-1 bg-gray-100 hover:bg-amber-100/60 text-gray-700 hover:text-amber-800 font-bold py-2.5 px-3 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 border border-gray-200/60 hover:border-amber-200"><i class="fa-solid fa-cart-plus opacity-70"></i> Al Carrito</button>` + (estado.rolActual === 'cliente' ? `<button onclick="agregarAlComboEspecial(${indexGlobal})" class="bg-amber-400 hover:bg-amber-500 text-gray-900 font-extrabold py-2.5 px-3 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-xs"><i class="fa-solid fa-wand-magic-sparkles text-xs"></i> Combo 3</button>` : '');
    
    container.innerHTML += `<div class="${prod.agotado ? 'bg-white opacity-60 border border-gray-200 rounded-2xl p-5 flex flex-col justify-between shadow-none' : 'bg-white border border-gray-200 rounded-2xl p-5 flex flex-col justify-between shadow-xs hover:shadow-md transition-all'}"><div><div class="flex justify-between items-center gap-2 mb-2">${prod.agotado ? '<span class="text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full bg-red-100 text-red-600 tracking-wider">Agotado</span>' : `<span class="text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-500 tracking-wider">${prod.categoria} (${prod.moneda})</span>`}<span class="text-base font-black text-gray-900 tracking-tight">${prefijoMoneda}${(precio || 0).toLocaleString()}</span></div><h4 class="text-sm font-bold text-gray-800 leading-snug mb-4">${prod.nombre}</h4></div><div class="flex gap-2 pt-3 border-t border-gray-100">${botonesHTML}</div></div>`;
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
  const ex = estado.carrito.find(item => item.producto.nombre === prod.nombre && item.producto.pais === prod.pais && item.producto.moneda === prod.moneda);
  if (ex) { ex.cantidad++; } else { estado.carrito.push({ producto: prod, trackingIndex: idx, cantidad: 1 }); }
  renderizarCarrito();
}
function cambiarCantidadCarrito(idx, delta) { estado.carrito[idx].cantidad += delta; if(estado.carrito[idx].cantidad <= 0) estado.carrito.splice(idx, 1); renderizarCarrito(); }

function renderizarCarrito() {
  const container = document.getElementById('items-carrito'); if(!container) return;
  container.innerHTML = '';
  let subtotalNormal = 0;
  
  estado.carrito.forEach((item, index) => {
    const pU = estado.rolActual === 'cliente' ? item.producto.precioCliente : item.producto.precioRevendedor;
    subtotalNormal += (pU * item.cantidad);
    const prefMoneda = SimbolosMoneda[item.producto.moneda] || 'USD $';
    container.innerHTML += `<div class="bg-gray-50 border border-gray-200 p-3 rounded-xl flex items-center justify-between text-xs shadow-xs"><div class="max-w-[60%]"><p class="font-bold text-gray-800 truncate">${item.producto.nombre}</p><p class="text-gray-400 font-mono">${prefMoneda}${(pU || 0).toLocaleString()} c/u</p></div><div class="flex items-center space-x-2"><div class="flex items-center bg-white rounded-lg border border-gray-300"><button onclick="cambiarCantidadCarrito(${index}, -1)" class="px-2 py-0.5 text-gray-500">-</button><span class="px-1 text-gray-800 font-bold">${item.cantidad}</span><button onclick="cambiarCantidadCarrito(${index}, +1)" class="px-2 py-0.5 text-gray-500">+</button></div><span class="font-black text-gray-800 min-w-[55px] text-right">${prefMoneda}${((pU || 0) * item.cantidad).toLocaleString()}</span></div></div>`;
  });
  
  const pCombo = estado.comboSeleccionado.filter(p => p !== null).length;
  if (estado.rolActual === 'cliente' && pCombo > 0) {
    let pNormal = 0; estado.comboSeleccionado.forEach(p => { if(p){ pNormal += p.precioCliente; }});
    const dOferta = document.getElementById('desglose-oferta');
    const dAhorro = document.getElementById('desglose-ahorro');
    const prefCombo = obtenerPrefijoMonedaBase(estado.paisActual);
    
    if (pCombo === 3) { 
      if(dOferta) dOferta.classList.remove('hidden'); 
      if(dAhorro) dAhorro.innerText = `-${prefCombo}${(pNormal - (COMBOS[estado.paisActual] || 0)).toLocaleString()}`; 
      container.innerHTML += `<div class="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 p-3 rounded-xl text-xs shadow-xs"><div class="flex justify-between items-center mb-1"><span class="font-black text-amber-800">Combo Especial Activado (3 Cuentas)</span><span class="font-black text-amber-700">${prefCombo}${(COMBOS[estado.paisActual] || 0).toLocaleString()}</span></div></div>`; 
    } else { 
      if(dOferta) dOferta.classList.add('hidden'); 
      container.innerHTML += `<div class="bg-gray-50 border border-dashed border-gray-300 p-3 rounded-xl text-xs text-gray-400">Combo Especial (${pCombo}/3)</div>`; 
    }
  }
  
  const totalImpreso = calcularTotalParaVisualizacion();
  const txtTotal = document.getElementById('total-carrito-texto');
  if(txtTotal) txtTotal.innerText = totalImpreso;
}

function calcularTotalParaVisualizacion() {
  let total = 0;
  let monedaBase = 'COP';
  if (estado.paisActual === 'MX') monedaBase = 'MXN';
  if (estado.paisActual === 'AR') monedaBase = 'ARS';
  if (estado.paisActual === 'USDEUR') monedaBase = 'USD';
  
  estado.carrito.forEach(item => {
    const pU = estado.rolActual === 'cliente' ? item.producto.precioCliente : item.producto.precioRevendedor;
    total += pU * item.cantidad;
    monedaBase = item.producto.moneda;
  });
  
  const pCombo = estado.comboSeleccionado.filter(p => p !== null).length;
  if (estado.rolActual === 'cliente' && pCombo === 3) {
    total += COMBOS[estado.paisActual] || 0;
    if(estado.paisActual === 'CO') monedaBase = 'COP';
    if(estado.paisActual === 'MX') monedaBase = 'MXN';
    if(estado.paisActual === 'AR') monedaBase = 'ARS';
    if(estado.paisActual === 'USDEUR') monedaBase = 'USD';
  } else if (estado.rolActual === 'cliente' && pCombo > 0 && pCombo < 3) {
    estado.comboSeleccionado.forEach(p => { if(p) total += p.precioCliente; });
  }
  
  return `${SimbolosMoneda[monedaBase] || 'USD $'}${total.toLocaleString()}`;
}

function obtenerProductoWhatsApp() {
  const pCombo = estado.comboSeleccionado.filter(p => p !== null);
  if (estado.carrito.length === 0 && pCombo.length === 0) { alert("🛒 Tu carrito está vacío."); return; }
  
  let mensaje = `👋 ¡Hola *Edwauge.Vip*! Me interesa adquirir los siguientes servicios de streaming:\n\n🌍 *Catálogo Regional:* ${estado.paisActual === 'USDEUR' ? 'USD-EUR' : estado.paisActual}\n👤 *Perfil:* ${estado.rolActual}\n-------------------------------------------\n`;
  
  let totalCOP = 0, totalMXN = 0, totalARS = 0, totalUSD = 0, totalEUR = 0;
  
  let usaCO = (estado.paisActual === 'CO');
  let usaMX = (estado.paisActual === 'MX');
  let usaAR = (estado.paisActual === 'AR');
  let usaUSD = (estado.paisActual === 'USDEUR');
  let usaEUR = false;

  estado.carrito.forEach(item => {
    const pU = estado.rolActual === 'cliente' ? item.producto.precioCliente : item.producto.precioRevendedor;
    const sub = pU * item.cantidad;
    const pref = SimbolosMoneda[item.producto.moneda];
    mensaje += `📦 *${item.cantidad}x* ${item.producto.nombre} (${pref}${sub.toLocaleString()})\n`;
    
    if(item.producto.moneda === 'COP') { totalCOP += sub; usaCO = true; }
    if(item.producto.moneda === 'MXN') { totalMXN += sub; usaMX = true; }
    if(item.producto.moneda === 'ARS') { totalARS += sub; usaAR = true; }
    if(item.producto.moneda === 'USD') { totalUSD += sub; usaUSD = true; }
    if(item.producto.moneda === 'EUR') { totalEUR += sub; usaEUR = true; }
  });

  if (estado.rolActual === 'cliente' && pCombo.length > 0) {
    if (pCombo.length === 3) {
      const valorPromocion = COMBOS[estado.paisActual] || 0;
      mensaje += `\n🔥 *SÚPER COMBO ESPECIAL (3 Productos Activos):*\n`;
      pCombo.forEach((p, idx) => {
        mensaje += `  └ *Fila ${idx+1}:* ${p.nombre}\n`;
      });
      mensaje += `💰 *Precio Promocional Combo:* ${obtenerPrefijoMonedaBase(estado.paisActual)}${valorPromocion.toLocaleString()}\n`;
      
      if(estado.paisActual === 'CO') { totalCOP += valorPromocion; usaCO = true; }
      if(estado.paisActual === 'MX') { totalMXN += valorPromocion; usaMX = true; }
      if(estado.paisActual === 'AR') { totalARS += valorPromocion; usaAR = true; }
      if(estado.paisActual === 'USDEUR') { totalUSD += valorPromocion; usaUSD = true; }
    } else {
      mensaje += `\n⚠️ *Combo Incompleto (Cobro individual):*\n`;
      pCombo.forEach(p => {
        mensaje += `📦 *1x* ${p.nombre} (${SimbolosMoneda[p.moneda]}${p.precioCliente.toLocaleString()})\n`;
        if(p.moneda === 'COP') { totalCOP += p.precioCliente; usaCO = true; }
        if(p.moneda === 'MXN') { totalMXN += p.precioCliente; usaMX = true; }
        if(p.moneda === 'ARS') { totalARS += p.precioCliente; usaAR = true; }
        if(p.moneda === 'USD') { totalUSD += p.precioCliente; usaUSD = true; }
        if(p.moneda === 'EUR') { totalEUR += p.precioCliente; usaEUR = true; }
      });
    }
  }

  mensaje += `-------------------------------------------\n💵 *TOTALES NETOS A PAGAR:*`;
  if(usaCO || totalCOP > 0) mensaje += `\n👉 *Total COP:* ${SimbolosMoneda.COP}${totalCOP.toLocaleString()}`;
  if(usaMX || totalMXN > 0) mensaje += `\n👉 *Total MXN:* ${SimbolosMoneda.MXN}${totalMXN.toLocaleString()}`;
  if(usaAR || totalARS > 0) mensaje += `\n👉 *Total ARS:* ${SimbolosMoneda.ARS}${totalARS.toLocaleString()}`;
  if(usaUSD || totalUSD > 0) mensaje += `\n👉 *Total USD:* ${SimbolosMoneda.USD}${totalUSD.toLocaleString()}`;
  if(usaEUR || totalEUR > 0) mensaje += `\n👉 *Total EUR:* ${SimbolosMoneda.EUR}${totalEUR.toLocaleString()}`;
  
  mensaje += `\n\n-------------------------------------------\n📌 *MÉTODOS DE PAGO DISPONIBLES:*\n`;
  if(usaCO) mensaje += `\n${METODOS_PAGO.CO}\n`;
  if(usaMX) mensaje += `\n${METODOS_PAGO.MX}\n`;
  if(usaAR) mensaje += `\n${METODOS_PAGO.AR}\n`;
  if(usaUSD) mensaje += `\n${METODOS_PAGO.USD}\n`;
  if(usaEUR) mensaje += `\n${METODOS_PAGO.EUR}\n`;
  
  mensaje += `\n*Nota:* Por favor envíame el comprobante de pago una vez realices la transferencia para procesar tus pantallas de inmediato. 🚀`;

  window.open(`https://api.whatsapp.com/send?phone=3022237839&text=${encodeURIComponent(mensaje)}`, '_blank');
}

function sincronizarCamposAdmin() {
  const elements = {
    'input-pin-admin': PINES.admin, 'input-pin-co': PINES.CO, 'input-pin-mx': PINES.MX, 'input-pin-ar': PINES.AR, 'input-pin-usdeur': PINES.USDEUR,
    'input-combo-co': COMBOS.CO, 'input-combo-mx': COMBOS.MX, 'input-combo-ar': COMBOS.AR, 'input-combo-usdeur': COMBOS.USDEUR
  };
  for (let id in elements) {
    const el = document.getElementById(id);
    if (el) el.value = elements[id];
  }
}

// CORRECCIÓN: Guardar en la Nube Firebase directamente
function guardarConfiguracionPines() { 
  PINES.admin = document.getElementById('input-pin-admin')?.value.trim() || PINES.admin; 
  PINES.CO = document.getElementById('input-pin-co')?.value.trim() || PINES.CO; 
  PINES.MX = document.getElementById('input-pin-mx')?.value.trim() || PINES.MX; 
  PINES.AR = document.getElementById('input-pin-ar')?.value.trim() || PINES.AR; 
  PINES.USDEUR = document.getElementById('input-pin-usdeur')?.value.trim() || PINES.USDEUR; 
  enviarDatosAFirebase(); alert("🔑 PINs guardados y sincronizados en la nube."); 
}

// CORRECCIÓN: Sincronizar Combos en la Nube
function guardarPreciosCombo() { 
  COMBOS.CO = parseFloat(document.getElementById('input-combo-co')?.value) || COMBOS.CO; 
  COMBOS.MX = parseFloat(document.getElementById('input-combo-mx')?.value) || COMBOS.MX; 
  COMBOS.AR = parseFloat(document.getElementById('input-combo-ar')?.value) || COMBOS.AR; 
  COMBOS.USDEUR = parseFloat(document.getElementById('input-combo-usdeur')?.value) || COMBOS.USDEUR; 
  enviarDatosAFirebase(); alert("💰 Tarifas Combo sincronizadas en la nube."); 
}

// CORRECCIÓN: Añadir o Actualizar Productos en la Nube
function guardarProducto() {
  const indexStr = document.getElementById('form-product-index').value;
  const nombre = document.getElementById('form-product-nombre').value.trim();
  const categoria = document.getElementById('form-product-categoria').value;
  const pais = document.getElementById('form-product-pais').value;
  
  let moneda = "COP";
  if (pais === 'MX') moneda = "MXN";
  if (pais === 'AR') moneda = "ARS";
  if (pais === 'USDEUR') {
    moneda = document.getElementById('form-product-moneda').value;
  }

  const precioCliente = parseFloat(document.getElementById('form-product-precio-cliente').value) || 0;
  const precioRevendedor = parseFloat(document.getElementById('form-product-precio-revendedor').value) || 0;
  const agotado = document.getElementById('form-product-agotado').checked;

  if (!nombre) { alert("⚠️ Escribe el nombre del producto."); return; }
  const estructura = { nombre, categoria, pais, moneda, precioCliente, precioRevendedor, agotado };

  if (indexStr === "") {
    PRODUCTOS.push(estructura);
  } else {
    const idx = parseInt(indexStr);
    PRODUCTOS[idx] = estructura;
  }

  // === AQUÍ HACES EL CAMBIO ===
  enviarDatosAFirebase(); 
  limpiarFormularioProducto(); 
  renderizarTablaAdminProductos(); // <- Añade esta línea aquí para refrescar la tabla
  alert("✨ Cuenta de streaming actualizada en inventario.");
}

function editarProducto(idx) {
  const prod = PRODUCTOS[idx];
  document.getElementById('form-product-index').value = idx;
  document.getElementById('form-product-nombre').value = prod.nombre;
  document.getElementById('form-product-categoria').value = prod.categoria;
  document.getElementById('form-product-pais').value = prod.pais;
  
  evaluarMonedaEspecifica();
  if(prod.pais === 'USDEUR') {
    document.getElementById('form-product-moneda').value = prod.moneda;
  }
  
  document.getElementById('form-product-precio-cliente').value = prod.precioCliente;
  document.getElementById('form-product-precio-revendedor').value = prod.precioRevendedor;
  document.getElementById('form-product-agotado').checked = prod.agotado || false;
  window.scrollTo({ top: 100, behavior: 'smooth' });
}

// CORRECCIÓN: Eliminar en Firebase
function eliminarProducto(idx) {
  if (confirm("🗑️ ¿Deseas eliminar este producto permanentemente de la base de datos?")) {
    PRODUCTOS.splice(idx, 1); 
    enviarDatosAFirebase(); 
  }
}

function limpiarFormularioProducto() {
  document.getElementById('form-product-index').value = ""; document.getElementById('form-product-nombre').value = "";
  document.getElementById('form-product-precio-cliente').value = ""; document.getElementById('form-product-precio-revendedor').value = "";
  document.getElementById('form-product-agotado').checked = false;
  evaluarMonedaEspecifica();
}

function renderizarTablaAdminProductos() {
  const tbody = document.getElementById('tabla-admin-productos'); if(!tbody) return;
  tbody.innerHTML = '';
  if (PRODUCTOS.length === 0) { tbody.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-gray-400">No hay productos.</td></tr>`; return; }
  PRODUCTOS.forEach((prod, index) => {
    const prefMoneda = SimbolosMoneda[prod.moneda] || 'USD $';
    tbody.innerHTML += `<tr class="hover:bg-gray-50 text-gray-700"><td class="p-3.5 text-xs font-bold font-mono text-amber-600">${prod.pais} (${prod.moneda})</td><td class="p-3.5"><span class="bg-gray-100 text-gray-600 text-[10px] uppercase font-black px-2 py-0.5 rounded">${prod.categoria}</span></td><td class="p-3.5 font-bold text-gray-800 text-xs">${prod.nombre}</td><td class="p-3.5">${prod.agotado ? '<span class="bg-red-50 text-red-600 border border-red-200 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase">Agotado</span>' : '<span class="bg-emerald-50 text-emerald-600 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase">Disponible</span>'}</td><td class="p-3.5 text-xs font-black">${prefMoneda}${prod.precioCliente.toLocaleString()}</td><td class="p-3.5 text-xs font-black">${prefMoneda}${prod.precioRevendedor.toLocaleString()}</td><td class="p-3.5 text-center"><button onclick="editarProducto(${index})" class="bg-gray-100 hover:bg-amber-100 text-gray-600 text-xs font-bold py-1 px-3 rounded-lg border border-gray-200">Editar</button> <button onclick="eliminarProducto(${index})" class="bg-red-50 text-red-500 text-xs font-bold py-1 px-3 rounded-lg border border-red-200">Borrar</button></td></tr>`;
  });
}
