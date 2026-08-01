const firebaseConfig = {
  apiKey: "AIzaSyDummyKeyForTemplatePurposesOnly",
  authDomain: "edwstreaming-eba93.firebaseapp.com",
  databaseURL: "https://edwstreaming-eba93-default-rtdb.firebaseio.com",
  projectId: "edwstreaming-eba93",
  storageBucket: "edwstreaming-eba93.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
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

database.ref('productos').on('value', (snapshot) => {
  const data = snapshot.val();
  PRODUCTOS = data ? Object.values(data) : [];
  renderizarCatalogo();
  renderizarTablaAdminProductos();
});

database.ref('pinesSeguridad').on('value', (snapshot) => {
  const data = snapshot.val();
  if (data) pinesSeguridad = data;
});

database.ref('tarifasCombo').on('value', (snapshot) => {
  const data = snapshot.val();
  if (data) tarifasCombo = data;
});

function cambiarPais(pais) {
  paisActivo = pais;
  ['CO', 'MX', 'AR', 'USDEUR'].forEach(p => {
    const tab = document.getElementById(`tab-${p}`);
    if (tab) tab.className = (p === pais) ? "tab-active py-2 px-1 whitespace-nowrap" : "text-gray-500 hover:text-gray-700 py-2 px-1 whitespace-nowrap";
  });
  document.getElementById('lbl-pais-activo').innerText = pais;
  renderizarCatalogo();
}

function mostrarModalPerfil() {
  document.getElementById('modal-perfil').classList.remove('hidden');
}

function seleccionarPerfil(perfil) {
  perfilActivo = perfil;
  document.getElementById('lbl-perfil-activo').innerText = perfil;
  document.getElementById('modal-perfil').classList.add('hidden');
  renderizarCatalogo();
}

function pedirPinRevendedor() {
  modoPinDestino = 'REVENDEDOR';
  document.getElementById('modal-perfil').classList.add('hidden');
  document.getElementById('modal-pin-titulo').innerText = `Acceso Revendedor (${paisActivo})`;
  document.getElementById('modal-pin-subtitulo').innerText = `Ingresa el PIN asignado al catálogo de ${paisActivo}.`;
  document.getElementById('input-pin').value = '';
  document.getElementById('modal-pin').classList.remove('hidden');
}

function solicitarAccesoAdmin() {
  modoPinDestino = 'ADMIN';
  document.getElementById('modal-pin-titulo').innerText = "Acceso Administrativo";
  document.getElementById('modal-pin-subtitulo').innerText = "Introduce la Clave Master de Backoffice.";
  document.getElementById('input-pin').value = '';
  document.getElementById('modal-pin').classList.remove('hidden');
}

function cerrarModalPin() {
  document.getElementById('modal-pin').classList.add('hidden');
}

function validarPinIngresado() {
  const pinIngresado = document.getElementById('input-pin').value.trim();
  if (modoPinDestino === 'ADMIN') {
    if (pinIngresado === (pinesSeguridad.admin || '9999')) {
      document.getElementById('modal-pin').classList.add('hidden');
      document.getElementById('vista-catalogo').classList.add('hidden');
      document.getElementById('vista-admin').classList.remove('hidden');
    } else {
      alert("❌ PIN Administrativo Incorrecto");
    }
  } else if (modoPinDestino === 'REVENDEDOR') {
    const pinCorrecto = pinesSeguridad[paisActivo] || '2222';
    if (pinIngresado === pinCorrecto) {
      document.getElementById('modal-pin').classList.add('hidden');
      seleccionarPerfil('REVENDEDOR');
    } else {
      alert("❌ PIN Incorrecto para este catálogo");
    }
  }
}

function salirDelAdmin() {
  document.getElementById('vista-admin').classList.add('hidden');
  document.getElementById('vista-catalogo').classList.remove('hidden');
}

function agregarACombo(prod) {
  if (comboSeleccionado.length >= 3) {
    alert("Ya tienes 3 productos en tu combo.");
    return;
  }
  comboSeleccionado.push(prod);
  renderizarSlotsCombo();
}

function quitarDelCombo(idx) {
  comboSeleccionado.splice(idx, 1);
  renderizarSlotsCombo();
}

function renderizarSlotsCombo() {
  const contenedor = document.getElementById('contenedor-slots-combo');
  if (!contenedor) return;

  contenedor.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const prod = comboSeleccionado[i];
    if (prod) {
      contenedor.innerHTML += `
        <div class="relative bg-white text-gray-800 p-2.5 rounded-xl flex flex-col justify-center items-center shadow text-center">
          <button onclick="quitarDelCombo(${i})" class="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold">✕</button>
          <span class="text-[10px] font-extrabold text-amber-600">Prod ${i + 1}</span>
          <p class="text-xs font-bold leading-tight mt-0.5">${prod.nombre}</p>
        </div>
      `;
    } else {
      contenedor.innerHTML += `
        <div class="bg-white/10 border border-white/30 border-dashed p-3 rounded-xl flex items-center justify-center text-amber-100 text-xs">
          <span>Slot ${i + 1} libre</span>
        </div>
      `;
    }
  }
}

function renderizarCatalogo() {
  const contenedor = document.getElementById('grid-productos-catalogo');
  if (!contenedor) return;
  contenedor.innerHTML = '';

  const productosFiltrados = PRODUCTOS.filter(p => p.pais === paisActivo);

  productosFiltrados.forEach((prod) => {
    const precio = perfilActivo === 'REVENDEDOR' ? prod.precioRevendedor : prod.precioCliente;
    const moneda = paisActivo === 'MX' ? 'MXN' : (paisActivo === 'USDEUR' ? 'USD' : 'COP');

    contenedor.innerHTML += `
      <div class="bg-white p-4 rounded-xl border border-gray-200 flex justify-between items-center shadow-sm">
        <div>
          <span class="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">${prod.categoria || 'STREAMING'}</span>
          <h4 class="text-sm font-bold text-gray-800">${prod.nombre}</h4>
          <p class="text-xs text-gray-500 font-semibold mt-0.5">${moneda} $${parseFloat(precio).toLocaleString()}</p>
        </div>
        <div class="flex gap-1.5">
          ${prod.agotado 
            ? `<span class="text-xs text-red-500 font-bold bg-red-50 px-2 py-1 rounded">Agotado</span>`
            : `
              <button onclick='agregarAlCarrito(${JSON.stringify(prod)})' class="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold px-2.5 py-1.5 rounded-lg transition">🛒 Al Carrito</button>
              <button onclick='agregarACombo(${JSON.stringify(prod)})' class="bg-amber-500 hover:bg-amber-600 text-gray-900 text-xs font-extrabold px-2.5 py-1.5 rounded-lg transition">⚡ Combo 3</button>
            `
          }
        </div>
      </div>
    `;
  });

  renderizarSlotsCombo();
}

function agregarAlCarrito(prod) {
  carritoNormal.push(prod);
  actualizarCarritoVista();
}

function quitarDelCarrito(idx) {
  carritoNormal.splice(idx, 1);
  actualizarCarritoVista();
}

function actualizarCarritoVista() {
  const contenedor = document.getElementById('lista-carrito');
  const lblTotal = document.getElementById('lbl-total-carrito');
  if (!contenedor) return;

  if (carritoNormal.length === 0) {
    contenedor.innerHTML = `<p class="text-center text-xs text-gray-400 italic">Tu carrito está vacío.</p>`;
    lblTotal.innerText = `COP $0`;
    return;
  }

  contenedor.innerHTML = '';
  let total = 0;
  const moneda = paisActivo === 'MX' ? 'MXN' : (paisActivo === 'USDEUR' ? 'USD' : 'COP');

  carritoNormal.forEach((item, idx) => {
    const precio = perfilActivo === 'REVENDEDOR' ? item.precioRevendedor : item.precioCliente;
    total += parseFloat(precio) || 0;
    contenedor.innerHTML += `
      <div class="flex justify-between items-center text-xs bg-gray-50 p-2 rounded-lg">
        <span class="font-semibold text-gray-700">${item.nombre}</span>
        <div class="flex items-center gap-2">
          <span class="font-bold text-amber-600">$${parseFloat(precio).toLocaleString()}</span>
          <button onclick="quitarDelCarrito(${idx})" class="text-red-500 font-bold">✕</button>
        </div>
      </div>
    `;
  });

  lblTotal.innerText = `${moneda} $${total.toLocaleString()}`;
}

function enviarPedidoWhatsApp() {
  let mensaje = `Hola EDWAUGE.VIP, quiero hacer un pedido:\n\n`;

  if (comboSeleccionado.length > 0) {
    let comboNombres = comboSeleccionado.map(c => c.nombre).join(', ');
    mensaje += `🔥 *Súper Combo (3 Cuentas):* ${comboNombres}\n`;
  }

  if (carritoNormal.length > 0) {
    mensaje += `🛒 *Cuentas Individuales:*\n`;
    carritoNormal.forEach(i => {
      mensaje += `- ${i.nombre}\n`;
    });
  }

  if (comboSeleccionado.length === 0 && carritoNormal.length === 0) {
    alert("Por favor agrega al menos una cuenta o combo a tu pedido.");
    return;
  }

  window.open(`https://api.whatsapp.com/send?phone=573022237839&text=${encodeURIComponent(mensaje)}`, '_blank');
}

function guardarProducto() {
  const indexStr = document.getElementById('form-product-index').value;
  const nombre = document.getElementById('form-product-nombre').value.trim();
  const categoria = document.getElementById('form-product-categoria').value.trim();
  const pais = document.getElementById('form-product-pais').value;
  const precioCliente = parseFloat(document.getElementById('form-product-precio-cliente').value) || 0;
  const precioRevendedor = parseFloat(document.getElementById('form-product-precio-revendedor').value) || 0;
  const agotado = document.getElementById('form-product-agotado').checked;

  if (!nombre) { alert("Escribe el nombre del producto."); return; }

  const estructura = { nombre, categoria, pais, precioCliente, precioRevendedor, agotado };

  if (indexStr === "") {
    PRODUCTOS.push(estructura);
  } else {
    PRODUCTOS[parseInt(indexStr)] = estructura;
  }

  database.ref('productos').set(PRODUCTOS);
  limpiarFormularioProducto();
  alert("✅ Cuenta guardada en el inventario.");
}

function limpiarFormularioProducto() {
  document.getElementById('form-product-index').value = '';
  document.getElementById('form-product-nombre').value = '';
  document.getElementById('form-product-categoria').value = '';
  document.getElementById('form-product-precio-cliente').value = '';
  document.getElementById('form-product-precio-revendedor').value = '';
  document.getElementById('form-product-agotado').checked = false;
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
}

function eliminarProducto(idx) {
  if (confirm("¿Seguro de eliminar este producto del catálogo?")) {
    PRODUCTOS.splice(idx, 1);
    database.ref('productos').set(PRODUCTOS);
  }
}

function renderizarTablaAdminProductos() {
  const tbody = document.getElementById('tabla-admin-productos');
  if (!tbody) return;
  tbody.innerHTML = '';

  PRODUCTOS.forEach((prod, idx) => {
    tbody.innerHTML += `
      <tr class="border-b border-gray-100 text-xs">
        <td class="p-2 font-bold text-amber-600">${prod.pais}</td>
        <td class="p-2 text-gray-500">${prod.categoria || '-'}</td>
        <td class="p-2 font-bold text-gray-800">${prod.nombre}</td>
        <td class="p-2 font-bold ${prod.agotado ? 'text-red-500' : 'text-emerald-500'}">${prod.agotado ? 'AGOTADO' : 'DISPONIBLE'}</td>
        <td class="p-2">$${parseFloat(prod.precioCliente).toLocaleString()}</td>
        <td class="p-2">$${parseFloat(prod.precioRevendedor).toLocaleString()}</td>
        <td class="p-2 text-right">
          <button onclick="editarProducto(${idx})" class="bg-blue-50 text-blue-600 font-bold px-2 py-1 rounded mr-1">Editar</button>
          <button onclick="eliminarProducto(${idx})" class="bg-red-50 text-red-600 font-bold px-2 py-1 rounded">Borrar</button>
        </td>
      </tr>
    `;
  });
}

function guardarPinesAdmin() {
  pinesSeguridad = {
    admin: document.getElementById('pin-admin').value,
    CO: document.getElementById('pin-CO').value,
    MX: document.getElementById('pin-MX').value,
    AR: document.getElementById('pin-AR').value,
    USDEUR: '2222'
  };
  database.ref('pinesSeguridad').set(pinesSeguridad).then(() => {
    alert("🔒 Pines de seguridad actualizados.");
  });
}

function guardarTarifasAdmin() {
  tarifasCombo = {
    CO: parseFloat(document.getElementById('precio-combo-CO').value) || 30000,
    MX: parseFloat(document.getElementById('precio-combo-MX').value) || 199,
    AR: parseFloat(document.getElementById('precio-combo-AR').value) || 2500,
    USDEUR: parseFloat(document.getElementById('precio-combo-USDEUR').value) || 10
  };
  database.ref('tarifasCombo').set(tarifasCombo).then(() => {
    alert("⚡ Tarifas de combo actualizadas.");
  });
}
