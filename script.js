// ==========================================
// 1. CONFIGURACIÓN E INICIALIZACIÓN FIREBASE
// ==========================================
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

// ==========================================
// 2. ESTADO GLOBAL DE LA APLICACIÓN
// ==========================================
let PRODUCTOS = [];
let comboActualModo = 3; // Puede ser 2 o 3 productos
let comboSeleccionado = [];

let reglasCombo = {
  umbralAlto: 30000,       // Suma de Prod1 + Prod2
  maxTerceroBarato: 10000, // Límite máximo para el 3er producto
  precioCombo2: 25000      // Precio total promocional para combo de 2
};

// ==========================================
// 3. LISTENERS DE FIREBASE (TIEMPO REAL)
// ==========================================

// Escuchador de Productos
database.ref('productos').on('value', (snapshot) => {
  const data = snapshot.val();
  PRODUCTOS = data ? Object.values(data) : [];
  renderizarProductosCliente();
  renderizarTablaAdminProductos();
});

// Escuchador de Reglas de Combos
database.ref('reglasCombo').on('value', (snapshot) => {
  const data = snapshot.val();
  if (data) {
    reglasCombo = data;
    
    const inputUmbral = document.getElementById('cfg-umbral-alto');
    const inputMax3 = document.getElementById('cfg-max-tercero');
    const inputPCombo2 = document.getElementById('cfg-precio-combo-2');

    if (inputUmbral) inputUmbral.value = reglasCombo.umbralAlto || '';
    if (inputMax3) inputMax3.value = reglasCombo.maxTerceroBarato || '';
    if (inputPCombo2) inputPCombo2.value = reglasCombo.precioCombo2 || '';
  }
});

// ==========================================
// 4. LÓGICA DE CONTROL Y VISTA DE COMBOS
// ==========================================

function cambiarModoCombo(cantidad) {
  comboActualModo = cantidad;
  
  const btn2 = document.getElementById('btn-modo-combo-2');
  const btn3 = document.getElementById('btn-modo-combo-3');
  
  if (btn2 && btn3) {
    if (cantidad === 2) {
      btn2.className = "px-4 py-2 bg-amber-600 text-white rounded-lg font-bold shadow-lg transition";
      btn3.className = "px-4 py-2 bg-gray-700 text-white rounded-lg font-bold hover:bg-gray-600 transition";
    } else {
      btn3.className = "px-4 py-2 bg-amber-600 text-white rounded-lg font-bold shadow-lg transition";
      btn2.className = "px-4 py-2 bg-gray-700 text-white rounded-lg font-bold hover:bg-gray-600 transition";
    }
  }
  
  comboSeleccionado = []; 
  renderizarSlotsCombo();
}

function esTercerProductoPermitido(productoCandidato) {
  if (comboActualModo !== 3 || comboSeleccionado.length < 2) return true;

  const precioProd1 = parseFloat(comboSeleccionado[0].precioCliente) || 0;
  const precioProd2 = parseFloat(comboSeleccionado[1].precioCliente) || 0;
  const sumaPrimerosDos = precioProd1 + precioProd2;

  if (sumaPrimerosDos >= reglasCombo.umbralAlto) {
    const precio3er = parseFloat(productoCandidato.precioCliente) || 0;
    return precio3er <= reglasCombo.maxTerceroBarato;
  }

  return true;
}

function agregarACombo(producto) {
  if (comboSeleccionado.length >= comboActualModo) {
    alert(`⚠️ Ya alcanzaste el límite de ${comboActualModo} productos para este combo.`);
    return;
  }

  if (comboSeleccionado.length === 2 && !esTercerProductoPermitido(producto)) {
    alert(`⚠️ Elegiste 2 productos principales de valor alto. El 3er producto debe ser de categoría económica (máximo $${reglasCombo.maxTerceroBarato.toLocaleString()}).`);
    return;
  }

  comboSeleccionado.push(producto);
  renderizarSlotsCombo();
}

function quitarDelCombo(index) {
  comboSeleccionado.splice(index, 1);
  renderizarSlotsCombo();
}

function renderizarSlotsCombo() {
  const contenedorSlots = document.getElementById('contenedor-slots-combo');
  if (!contenedorSlots) return;

  contenedorSlots.innerHTML = '';

  for (let i = 0; i < comboActualModo; i++) {
    const prod = comboSeleccionado[i];
    
    if (prod) {
      contenedorSlots.innerHTML += `
        <div class="relative bg-gray-800 p-3 rounded-lg border border-amber-500/50 flex flex-col items-center">
          <button onclick="quitarDelCombo(${i})" class="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow">✕</button>
          <span class="text-xs text-amber-400 font-semibold mb-1">Producto ${i + 1}</span>
          <p class="text-sm text-white font-bold text-center">${prod.nombre}</p>
        </div>
      `;
    } else {
      contenedorSlots.innerHTML += `
        <div class="bg-gray-900/50 border-2 border-dashed border-gray-700 p-3 rounded-lg flex flex-col items-center justify-center text-gray-500 text-xs">
          <span>+ Elegir Producto ${i + 1}</span>
        </div>
      `;
    }
  }
}

// ==========================================
// 5. RENDERIZADO GENERAL Y WHATSAPP
// ==========================================

function renderizarProductosCliente() {
  const contenedor = document.getElementById('grid-productos');
  if (!contenedor) return;

  contenedor.innerHTML = '';

  PRODUCTOS.forEach((prod) => {
    const estaAgotado = prod.agotado ? true : false;
    
    contenedor.innerHTML += `
      <div class="bg-gray-800 p-4 rounded-xl border border-gray-700 flex flex-col justify-between shadow-md">
        <div>
          <span class="text-xs font-bold text-amber-500 uppercase tracking-wider">${prod.categoria || 'Streaming'}</span>
          <h3 class="text-lg font-bold text-white mt-1">${prod.nombre}</h3>
          <p class="text-sm text-gray-400 mt-1">Precio: <strong class="text-amber-400">$${parseFloat(prod.precioCliente).toLocaleString()} ${prod.moneda || 'COP'}</strong></p>
        </div>
        
        <div class="mt-4 flex flex-col gap-2">
          ${estaAgotado 
            ? `<button disabled class="w-full bg-gray-700 text-gray-400 font-bold py-2 px-4 rounded-lg cursor-not-allowed text-sm">Agotado</button>`
            : `
              <button onclick='enviarProductoWhatsApp(${JSON.stringify(prod)})' class="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition text-sm flex items-center justify-center gap-2">
                Obtener Producto
              </button>
              <button onclick='agregarACombo(${JSON.stringify(prod)})' class="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-1.5 px-3 rounded-lg transition text-xs">
                + Agregar a Combo
              </button>
            `
          }
        </div>
      </div>
    `;
  });
}

function enviarProductoWhatsApp(prod) {
  const mensaje = `Hola, quiero comprar la cuenta de ${prod.nombre} por valor de $${parseFloat(prod.precioCliente).toLocaleString()} ${prod.moneda || 'COP'}.`;
  
  // NÚMERO FIJO CON INDICATIVO DE COLOMBIA (57) SIN SIGNOS NI ESPACIOS
  window.open(`https://api.whatsapp.com/send?phone=573022237839&text=${encodeURIComponent(mensaje)}`, '_blank');
}

function solicitarComboWhatsApp() {
  if (comboSeleccionado.length < comboActualModo) {
    alert(`Por favor elige ${comboActualModo} productos para tu combo.`);
    return;
  }

  let listaNombres = comboSeleccionado.map(p => p.nombre).join(', ');
  let mensaje = `Hola! Quisiera solicitar el Combo de ${comboActualModo} Cuentas con los siguientes productos: ${listaNombres}.`;

  window.open(`https://api.whatsapp.com/send?phone=573022237839&text=${encodeURIComponent(mensaje)}`, '_blank');
}

// ==========================================
// 6. FUNCIONES DEL PANEL ADMINISTRADOR
// ==========================================

function guardarProducto() {
  const indexStr = document.getElementById('form-product-index').value;
  const nombre = document.getElementById('form-product-nombre').value.trim();
  const categoria = document.getElementById('form-product-categoria').value.trim();
  const pais = document.getElementById('form-product-pais').value;
  const moneda = document.getElementById('form-product-moneda').value;
  const precioCliente = parseFloat(document.getElementById('form-product-precio-cliente').value) || 0;
  const precioRevendedor = parseFloat(document.getElementById('form-product-precio-revendedor').value) || 0;
  const agotado = document.getElementById('form-product-agotado').checked;

  if (!nombre) { 
    alert("⚠️ Escribe el nombre del producto."); 
    return; 
  }

  const estructura = { nombre, categoria, pais, moneda, precioCliente, precioRevendedor, agotado };

  if (indexStr === "") {
    PRODUCTOS.push(estructura);
  } else {
    const idx = parseInt(indexStr);
    PRODUCTOS[idx] = estructura;
  }

  // Sincronizar en Firebase Realtime Database
  enviarDatosAFirebase();
  limpiarFormularioProducto();
  renderizarTablaAdminProductos();
  alert("✨ Cuenta de streaming actualizada en inventario.");
}

function enviarDatosAFirebase() {
  database.ref('productos').set(PRODUCTOS);
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
  document.getElementById('form-product-moneda').value = prod.moneda;
  document.getElementById('form-product-precio-cliente').value = prod.precioCliente;
  document.getElementById('form-product-precio-revendedor').value = prod.precioRevendedor;
  document.getElementById('form-product-agotado').checked = prod.agotado || false;
}

function eliminarProducto(idx) {
  if (confirm("¿Estás seguro de eliminar este producto?")) {
    PRODUCTOS.splice(idx, 1);
    enviarDatosAFirebase();
  }
}

function renderizarTablaAdminProductos() {
  const tbody = document.getElementById('tabla-admin-productos');
  if (!tbody) return;

  tbody.innerHTML = '';

  PRODUCTOS.forEach((prod, idx) => {
    tbody.innerHTML += `
      <tr class="border-b border-gray-700 text-sm">
        <td class="p-2 text-white font-semibold">${prod.nombre}</td>
        <td class="p-2 text-gray-300">${prod.categoria}</td>
        <td class="p-2 text-amber-400 font-bold">$${parseFloat(prod.precioCliente).toLocaleString()}</td>
        <td class="p-2 text-center">
          <span class="${prod.agotado ? 'text-red-400' : 'text-green-400'} font-bold">
            ${prod.agotado ? 'Agotado' : 'Disponible'}
          </span>
        </td>
        <td class="p-2 text-right">
          <button onclick="editarProducto(${idx})" class="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded mr-1">Editar</button>
          <button onclick="eliminarProducto(${idx})" class="bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-1 rounded">Eliminar</button>
        </td>
      </tr>
    `;
  });
}

function guardarReglasComboAdmin() {
  const umbral = parseFloat(document.getElementById('cfg-umbral-alto').value) || 0;
  const max3er = parseFloat(document.getElementById('cfg-max-tercero').value) || 0;
  const pCombo2 = parseFloat(document.getElementById('cfg-precio-combo-2').value) || 0;

  reglasCombo = {
    umbralAlto: umbral,
    maxTerceroBarato: max3er,
    precioCombo2: pCombo2
  };

  database.ref('reglasCombo').set(reglasCombo)
    .then(() => {
      alert("✨ Reglas de control de combos guardadas y sincronizadas globalmente.");
    })
    .catch((error) => {
      alert("❌ Error al guardar las reglas: " + error.message);
    });
}
