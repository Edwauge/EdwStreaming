const defaultPines = { admin: "3859", CO: "2233", MX: "3344", AR: "4455", USDEUR: "5566" };
const defaultCombos = { CO: 35000, MX: 199, AR: 2500, USDEUR: 10 };
const defaultProductos = [
  { nombre: "SPOTIFY PREMIUM - 1 Año Cuenta Nueva", categoria: "Spotify", pais: "CO", precioCliente: 45000, precioRevendedor: 38000, agotado: false },
  { nombre: "Netflix - 1 Perfil UHD Premium (Mes)", categoria: "Netflix", pais: "CO", precioCliente: 15000, precioRevendedor: 11000, agotado: false },
  { nombre: "Disney+ - 1 Perfil Estándar (Mes)", categoria: "Disney+", pais: "CO", precioCliente: 10000, precioRevendedor: 7500, agotado: false },
  { nombre: "Netflix - 1 Perfil UHD Premium (Mes)", categoria: "Netflix", pais: "MX", precioCliente: 89, precioRevendedor: 65, agotado: false }
];

let PINES = JSON.parse(localStorage.getItem('ev_pines')) || defaultPines;
let COMBOS = JSON.parse(localStorage.getItem('ev_combos')) || defaultCombos;
let PRODUCTOS = JSON.parse(localStorage.getItem('ev_productos')) || defaultProductos;

// Guardamos la moneda secundaria por si necesitas renderizar dinámicamente USD o EUR
let estado = { paisActual: 'CO', rolActual: null, carrito: [], comboSeleccionado: [null, null, null], monedaInternacional: 'USD' };
const Monedas = { 
  CO: 'COP $', 
  MX: 'MXN $', 
  AR: 'ARS $',
  USDEUR: 'USD $' // Moneda base para la sección internacional
};

window.onload = function() {
  guardarEnLocalStorage();
  sincronizarCamposAdmin();
  actualizarVistaVenta();
};

function guardarEnLocalStorage() {
  localStorage.setItem('ev_pines', JSON.stringify(PINES));
  localStorage.setItem('ev_combos', JSON.stringify(COMBOS));
  localStorage.setItem('ev_productos', JSON.stringify(PRODUCTOS));
}

function cambiarPais(codigoPais) {
  estado.paisActual = codigoPais;
  estado.carrito = []; 
  estado.comboSeleccionado = [null, null, null];
  
  // Lista de pestañas incluyendo la nueva pestaña internacional
  ['CO', 'MX', 'AR', 'USDEUR'].forEach(p => {
    const btn = document.getElementById(`tab-${p}`);
    if (btn) {
      btn.className = p === codigoPais ? "flex-1 py-4 text-center font-bold text-sm sm:text-base border-b-2 border-yellow-500 text-yellow-600 transition-all" : "flex-1 py-4 text-center font-bold text-sm sm:text-base border-b-2 border-transparent text-gray-400 hover:text-gray-700 transition-all";
    }
  });
  estado.rolActual = null;
  actualizarVistaVenta();
}

function seleccionarRol(rol) { estado.rolActual = rol; actualizarVistaVenta(); }

function abrirModalPinRol() { 
  document.getElementById('modal-pin-rol-pais').innerText = estado.paisActual === 'CO' ? 'Colombia' : estado.paisActual === 'MX' ? 'México' : estado.paisActual === 'AR' ? 'Argentina' : 'USD-EUR'; 
  document.getElementById('input-modal-pin-rol').value = ''; 
  document.getElementById('modal-pin-rol').classList.remove('hidden'); 
}

function cerrarModalPinRol() { document.getElementById('modal-pin-rol').classList.add('hidden'); }

function validarPinRol() {
  if(document.getElementById('input-modal-pin-rol').value === PINES[estado.paisActual]) { cerrarModalPinRol(); seleccionarRol('revendedor'); }
  else { alert("❌ Código PIN incorrecto para este catálogo."); }
}

function volverASeleccionRol() { estado.rolActual = null; estado.carrito = []; estado.comboSeleccionado = [null, null, null]; actualizarVistaVenta(); }

function actualizarVistaVenta() {
  const divSeleccion = document.getElementById('vista-seleccion-rol');
  const divTienda = document.getElementById('vista-tienda');
  document.getElementById('vista-admin').classList.add('hidden');
  if (!estado.rolActual) { divSeleccion.classList.remove('hidden'); divTienda.classList.add('hidden'); return; }
  divSeleccion.classList.add('hidden'); divTienda.classList.remove('hidden');
  document.getElementById('badge-pais').innerText = `País: ${estado.paisActual === 'USDEUR' ? 'USD-EUR' : estado.paisActual}`;
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
    container.innerHTML
