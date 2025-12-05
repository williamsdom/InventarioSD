// ***************************************************************
// ⚠️ 1. REEMPLAZA ESTE VALOR con el ID real de tu Google Sheet
// ***************************************************************
const SPREADSHEET_ID = "1j4vfZHoaq2YqG63tAuz97gb79IWoOmJFPWlls1eZ64k"; 

// Nombres de las pestañas
const HOJA_CATEGORIAS = "Categorias";
const HOJA_PRODUCTOS = "Productos";
const HOJA_COMPRAS = "Compras";
const HOJA_VENTAS = "Ventas";
const HOJA_RESUMEN = "resumen_diario";

// Encabezados
const CATEGORIAS_HEADERS = ["id", "nombre"];
const PRODUCTOS_HEADERS = ["id", "nombre", "código", "categoría", "precio_compra", "precio_venta", "stock", "fecha_creado"];
const COMPRAS_HEADERS = ["id", "producto_id", "cantidad", "precio_compra", "fecha", "proveedor"];
const VENTAS_HEADERS = ["id", "producto_id", "cantidad", "precio_venta", "fecha", "cliente"];
const RESUMEN_HEADERS = ["fecha", "total_ventas", "total_compras", "ganancia", "productos_vendidos"];

// --- FUNCIÓN CENTRAL PARA ACCEDER A LA HOJA ---
function getSpreadsheet() {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
}

// 🔑 FUNCIÓN CORREGIDA: Generación de ID Único
function generateUniqueAppId() {
    return 'id-' + (new Date().getTime().toString(36) + Math.random().toString(36).substring(2, 9)).toUpperCase();
}

// ----------------------------------------------------------------------
// ENTRADA PRINCIPAL PARA SOLICITUDES GET
// ----------------------------------------------------------------------
function doGet(e) {
    const action = e.parameter.action;
    const query = e.parameter.query;
    const sheetName = e.parameter.sheetName;
    let result;

    try {
        if (action === "iniciar" || action === "resetear") {
            result = action === "iniciar" ? iniciarBaseDeDatos() : resetearBaseDeDatos();
        } else if (action === "getCategorias") {
            result = getCategorias();
        } else if (action === "buscarProducto") {
            result = buscarProducto(query); 
        } else if (action === "getInventario") {
            result = getInventario();
        } else if (action === "getResumenDiario") {
            result = getResumenDiario();
        } else if (action === "getData" && sheetName) {
            result = getData(sheetName);
        } else {
            result = { status: "error", message: `Acción GET '${action}' no válida o faltan parámetros.` };
        }
    } catch (error) {
        result = { status: "error", message: `Error en doGet: ${error.message}` };
    }

    return ContentService.createTextOutput(JSON.stringify(result))
           .setMimeType(ContentService.MimeType.JSON);
}

// ----------------------------------------------------------------------
// ENTRADA PRINCIPAL PARA SOLICITUDES POST
// ----------------------------------------------------------------------
function doPost(e) {
    try {
        if (!e.postData || !e.postData.contents) {
            return ContentService.createTextOutput(JSON.stringify({ 
                status: "error", 
                message: "No se recibieron datos en la solicitud POST." 
            })).setMimeType(ContentService.MimeType.JSON);
        }
        
        const requestData = JSON.parse(e.postData.contents);
        const action = requestData.action;

        let result;
        if (action === "agregarCategoria") {
            result = agregarCategoria(requestData);
        } else if (action === "agregarProducto") {
            result = agregarProducto(requestData);
        } else if (action === "registrarTransaccion") {
            result = registrarTransaccion(requestData);
        } else {
            result = { status: "error", message: "Acción POST no reconocida." };
        }
        
        return ContentService.createTextOutput(JSON.stringify(result))
               .setMimeType(ContentService.MimeType.JSON);

    } catch (error) {
        return ContentService.createTextOutput(JSON.stringify({ 
            status: "error", 
            message: `Error al procesar la solicitud POST: ${error.message}` 
        })).setMimeType(ContentService.MimeType.JSON);
    }
}

// ----------------------------------------------------------------------
// FUNCIONES DE GESTIÓN DE CATEGORÍAS
// ----------------------------------------------------------------------
function getCategorias() {
    return getData(HOJA_CATEGORIAS);
}

function agregarCategoria(data) {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(HOJA_CATEGORIAS);

    if (!sheet) {
        return { status: "error", message: `La pestaña '${HOJA_CATEGORIAS}' no existe. Inicie la Base de Datos.` };
    }

    const newId = generateUniqueAppId();
    
    const newRow = [
        newId,
        data.nombre
    ];

    try {
        sheet.appendRow(newRow);
        return { status: "success", message: `Categoría '${data.nombre}' agregada (ID: ${newId}).` };
    } catch (e) {
        return { status: "error", message: `Error al escribir categoría: ${e.message}` };
    }
}

// ----------------------------------------------------------------------
// FUNCIONES DE GESTIÓN DE PRODUCTOS Y BÚSQUEDA
// ----------------------------------------------------------------------
function getInventario() {
    return getData(HOJA_PRODUCTOS);
}

function buscarProducto(query) {
    const data = getData(HOJA_PRODUCTOS);

    if (data.status !== 'success') return data;
    
    const products = data.data;
    const lowerQuery = query.toLowerCase().trim();

    if (lowerQuery.length === 0) {
        return { status: "warning", message: "Especifique un ID, Código o Nombre para buscar." };
    }

    // Filtra productos por ID, Código, o Nombre - CONVERSIÓN SEGURA A STRING
    const results = products.filter(p => {
        // Convertir todos los valores a string de forma segura
        const idStr = String(p.id || '');
        const codigoStr = String(p.código || '');
        const nombreStr = String(p.nombre || '');

        return idStr.toLowerCase().includes(lowerQuery) ||
               codigoStr.toLowerCase().includes(lowerQuery) ||
               nombreStr.toLowerCase().includes(lowerQuery);
    });

    if (results.length > 0) {
        return { status: "success", data: results, message: `${results.length} coincidencias encontradas.` };
    } else {
        return { status: "warning", message: "Producto no encontrado." };
    }
}

function agregarProducto(data) {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(HOJA_PRODUCTOS);

    if (!sheet) {
        return { status: "error", message: `La pestaña '${HOJA_PRODUCTOS}' no existe. Inicie la Base de Datos.` };
    }
    
    const newId = generateUniqueAppId();

    const newRow = [
        newId,
        data.nombre,
        data.codigo,
        data.categoria,
        parseFloat(data.precio_compra),
        parseFloat(data.precio_venta),
        parseInt(data.stock),
        new Date()
    ];

    try {
        sheet.appendRow(newRow);
        return { status: "success", message: `Producto '${data.nombre}' registrado con éxito. ID: ${newId}` };
    } catch (e) {
        return { status: "error", message: `Error al escribir producto: ${e.message}` };
    }
}

// ----------------------------------------------------------------------
// FUNCIONES DE GESTIÓN DE TRANSACCIONES (COMPRAS/VENTAS)
// ----------------------------------------------------------------------
function registrarTransaccion(data) {
    const ss = getSpreadsheet();
    const action = data.type; // 'compra' o 'venta'
    const isCompra = action === "compra";
    const sheetName = isCompra ? HOJA_COMPRAS : HOJA_VENTAS;
    const sheet = ss.getSheetByName(sheetName);
    const sheetProductos = ss.getSheetByName(HOJA_PRODUCTOS);

    if (!sheet || !sheetProductos) {
        return { status: "error", message: `Una o más pestañas necesarias no existen. Inicie la Base de Datos.` };
    }

    // 1. Validar producto y obtener fila actual
    const { rowData, rowIndex } = findProductRow(sheetProductos, data.producto_id);
    
    if (rowIndex === -1) {
        return { status: "error", message: `Producto ID ${data.producto_id} no encontrado en inventario.` };
    }
    
    // 2. Obtener datos actuales del producto
    const stockColIndex = 6;
    const precioCompraColIndex = 4;
    const precioVentaColIndex = 5;
    
    const cantidad = parseInt(data.cantidad);
    const precioTransaccion = parseFloat(data.precio);
    
    let stockActual = parseFloat(rowData[stockColIndex]) || 0;
    let nuevoStock;

    // 3. Validar stock para ventas
    if (!isCompra) {
        if (stockActual < cantidad) {
            return { 
                status: "warning", 
                message: `Stock insuficiente. Solo hay ${stockActual} unidades disponibles para la venta de ${cantidad} unidades.` 
            };
        }
        nuevoStock = stockActual - cantidad;
    } else {
        nuevoStock = stockActual + cantidad;
    }

    // 4. Escribir nueva transacción
    const transaccionId = generateUniqueAppId(); 
    const newRow = [
        transaccionId,
        data.producto_id,
        cantidad,
        precioTransaccion,
        new Date(),
        data.extra_data || ''
    ];

    try {
        sheet.appendRow(newRow);
    } catch (e) {
        return { status: "error", message: `Error al registrar transacción: ${e.message}` };
    }

    // 5. Actualizar stock del producto
    try {
        sheetProductos.getRange(rowIndex + 1, stockColIndex + 1).setValue(nuevoStock);
        
        // 6. Actualizar precio si es diferente
        if (isCompra) {
            const precioActualCompra = parseFloat(rowData[precioCompraColIndex]) || 0;
            if (precioTransaccion !== precioActualCompra) {
                sheetProductos.getRange(rowIndex + 1, precioCompraColIndex + 1).setValue(precioTransaccion);
            }
        } else {
            const precioActualVenta = parseFloat(rowData[precioVentaColIndex]) || 0;
            if (precioTransaccion !== precioActualVenta) {
                sheetProductos.getRange(rowIndex + 1, precioVentaColIndex + 1).setValue(precioTransaccion);
            }
        }

        return { 
            status: "success", 
            message: `${isCompra ? 'Compra' : 'Venta'} registrada exitosamente. Stock actualizado: ${nuevoStock} unidades.` 
        };

    } catch (e) {
        // Si falla la actualización, revertir la transacción
        sheet.deleteRow(sheet.getLastRow());
        return { status: "error", message: `Error al actualizar inventario: ${e.message}` };
    }
}

// ----------------------------------------------------------------------
// FUNCIÓN PARA OBTENER RESUMEN DIARIO
// ----------------------------------------------------------------------
function getResumenDiario() {
    return getData(HOJA_RESUMEN);
}

// ----------------------------------------------------------------------
// FUNCIONES DE UTILIDAD GENERAL
// ----------------------------------------------------------------------
function getData(sheetName) {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);

    if (!sheet || sheet.getLastRow() < 2) {
        return { status: "error", message: `Pestaña '${sheetName}' vacía o no existe.` };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);

    const mappedData = rows.map(row => {
        let entry = {};
        headers.forEach((header, index) => {
            let value = row[index];
            
            // Manejar valores vacíos
            if (value === '' || value === null || value === undefined) {
                value = '';
            }
            // Si es número, mantenerlo como número
            else if (typeof value === 'number') {
                value = value;
            }
            // Si es string que representa número, convertirlo a número
            else if (typeof value === 'string' && !isNaN(value) && value.trim() !== '') {
                // Para códigos, mantener como string si tiene letras
                if (header === 'código' && /[a-zA-Z]/.test(value)) {
                    value = value; // Mantener como string
                } else {
                    value = parseFloat(value);
                }
            }
            // Si es fecha, dejarla como está
            else if (value instanceof Date) {
                // Mantener como Date
            }
            // Para cualquier otro caso, asegurar que sea string
            else {
                value = String(value);
            }
            
            entry[header] = value;
        });
        return entry;
    });

    // Filtrar filas completamente vacías
    const filteredData = mappedData.filter(entry => {
        return Object.values(entry).some(value => value !== '' && value !== null);
    });

    return { status: "success", data: filteredData };
}

function findProductRow(sheetProductos, productoId) {
    try {
        const data = sheetProductos.getDataRange().getValues();
        const idColIndex = 0;

        for (let i = 1; i < data.length; i++) {
            const rowId = String(data[i][idColIndex] || '');
            const searchId = String(productoId || '');
            
            if (rowId.toLowerCase() === searchId.toLowerCase()) {
                return { rowData: data[i], rowIndex: i };
            }
        }
        return { rowData: null, rowIndex: -1 };
    } catch (error) {
        console.error(`Error en findProductRow: ${error}`);
        return { rowData: null, rowIndex: -1 };
    }
}

// ----------------------------------------------------------------------
// FUNCIONES DE CONFIGURACIÓN DE BASE DE DATOS
// ----------------------------------------------------------------------
function createOrResetSheet(ss, name, headers) {
    let sheet = ss.getSheetByName(name);
    let action = "verificada";

    if (!sheet) {
        sheet = ss.insertSheet(name);
        action = "creada";
    }

    // Limpiar contenido y establecer encabezados
    sheet.clearContents();
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);

    return `Pestaña '${name}' ${action}.`;
}

function iniciarBaseDeDatos() {
    const ss = getSpreadsheet();
    let msg = [];

    msg.push(createOrResetSheet(ss, HOJA_CATEGORIAS, CATEGORIAS_HEADERS));
    msg.push(createOrResetSheet(ss, HOJA_PRODUCTOS, PRODUCTOS_HEADERS));
    msg.push(createOrResetSheet(ss, HOJA_COMPRAS, COMPRAS_HEADERS));
    msg.push(createOrResetSheet(ss, HOJA_VENTAS, VENTAS_HEADERS));
    msg.push(createOrResetSheet(ss, HOJA_RESUMEN, RESUMEN_HEADERS));

    return { status: "success", message: `Base de datos inicializada: ${msg.join(" ")}` };
}

function resetearBaseDeDatos() {
    const ss = getSpreadsheet();
    let msg = [];

    // Se eliminan todas las pestañas excepto la primera ("Hoja 1")
    ss.getSheets().forEach(sheet => {
        const sheetName = sheet.getName();
        if (sheetName !== "Hoja 1") {
            ss.deleteSheet(sheet);
            msg.push(`Pestaña '${sheetName}' eliminada.`);
        }
    });

    // Se recrean las pestañas
    msg.push(createOrResetSheet(ss, HOJA_CATEGORIAS, CATEGORIAS_HEADERS));
    msg.push(createOrResetSheet(ss, HOJA_PRODUCTOS, PRODUCTOS_HEADERS));
    msg.push(createOrResetSheet(ss, HOJA_COMPRAS, COMPRAS_HEADERS));
    msg.push(createOrResetSheet(ss, HOJA_VENTAS, VENTAS_HEADERS));
    msg.push(createOrResetSheet(ss, HOJA_RESUMEN, RESUMEN_HEADERS));

    return { status: "success", message: `Base de datos reseteada completamente: ${msg.join(" ")}` };
}