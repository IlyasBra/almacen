/**
 * Spanish: the source language. Every other language must provide exactly
 * these keys (the compiler checks it). `{name}` marks a value filled in at
 * runtime. Counted nouns have one key per plural form ("_one", "_other").
 */
export const es = {
  // Common
  'common.cancel': 'Cancelar',
  'common.delete': 'Borrar',
  'common.save': 'Guardar',
  'common.add': 'Añadir',
  'common.close': 'Cerrar',
  'common.loading': 'Cargando…',
  'confirm.before': '¿Seguro que quieres borrar ',
  'confirm.after': '? No se puede deshacer.',
  'notice.dismiss': 'Cerrar aviso',
  'day.today': 'Hoy',
  'day.yesterday': 'Ayer',

  // Counted nouns
  'count.products_one': '{count} producto',
  'count.products_other': '{count} productos',
  'count.photos_one': '{count} foto',
  'count.photos_other': '{count} fotos',
  'count.movements_one': '{count} movimiento',
  'count.movements_other': '{count} movimientos',
  'count.scanned_one': '{count} escaneado',
  'count.scanned_other': '{count} escaneados',

  // Units (the stored value is the Spanish word; this is how it is shown)
  'unit.unidades': 'unidades',
  'unit.cajas': 'cajas',
  'unit.paquetes': 'paquetes',
  'unit.botellas': 'botellas',
  'unit.latas': 'latas',
  'unit.kg': 'kg',
  'unit.litros': 'litros',
  'unit.metros': 'metros',

  // Layout and navigation
  'app.name': 'Almacén',
  'layout.skip': 'Saltar al contenido',
  'nav.label': 'Secciones',
  'nav.inventory': 'Inventario',
  'nav.restock': 'Reponer',
  'nav.restockCount': 'Reponer ({count})',
  'nav.movements': 'Movimientos',
  'heading.restock': 'Por reponer',
  'header.settings': 'Ajustes',
  'main.new': 'Nuevo',
  'main.scan': 'Escanear',
  'main.noStorage':
    'Este navegador no permite guardar datos: lo que apuntes se perderá al cerrar la app.',
  'main.retry': 'Inténtalo de nuevo.',
  'main.loadErrorTitle': 'No se han podido cargar tus datos',
  'main.loadErrorDescription':
    'Recarga la página. Si el problema sigue, revisa el espacio libre del móvil.',

  // Stock status
  'status.ok': 'Bien',
  'status.low': 'Queda poco',
  'status.out': 'Agotado',

  // Inventory
  'inventory.emptyTitle': 'El almacén está vacío',
  'inventory.emptyDescription':
    'Añade tu primer producto. Puedes hacerle una foto y escanear su código de barras.',
  'inventory.addProduct': 'Añadir producto',
  'inventory.summaryProducts': 'Productos',
  'inventory.summaryLow': 'Queda poco',
  'inventory.summaryOut': 'Agotados',
  'inventory.search': 'Buscar producto',
  'inventory.searchPlaceholder': 'Buscar por nombre, código o ubicación',
  'inventory.categoryGroup': 'Categoría',
  'inventory.allCategories': 'Todas',
  'inventory.noCategory': 'Sin categoría',
  'inventory.editCategories': 'Editar categorías',
  'inventory.createCategories': '+ Crear categorías',
  'inventory.noMatch': 'Ningún producto coincide con la búsqueda',
  'inventory.listLabel': 'Productos',
  'inventory.noDetail': 'Sin categoría ni ubicación',

  // Product card
  'product.fallbackTitle': 'Producto',
  'product.scanMode': 'Modo escaneo · {scanned}',
  'product.stock': 'Stock',
  'product.removeOne': 'Quitar uno',
  'product.addOne': 'Añadir uno',
  'product.otherAmount': 'Otra cantidad',
  'product.amountPlaceholder': 'Ej.: 12',
  'product.in': 'Entra',
  'product.out': 'Sale',
  'product.amountError': 'Escribe una cantidad mayor que 0.',
  'product.notEnough': 'Solo quedan {amount} {unit}.',
  'product.category': 'Categoría',
  'product.location': 'Ubicación',
  'product.minimum': 'Avisar cuando queden',
  'product.noWarning': 'Sin aviso',
  'product.barcode': 'Código de barras',
  'product.notes': 'Notas',
  'product.edit': 'Editar producto',
  'product.history': 'Historial',
  'product.noHistory': 'Todavía no hay movimientos de este producto.',
  'product.scanNext': 'Escanear siguiente',
  'product.finish': 'Terminar',

  // Product form
  'form.newTitle': 'Nuevo producto',
  'form.editTitle': 'Editar producto',
  'form.unknownCodeBefore': 'No hay ningún producto con el código ',
  'form.unknownCodeMiddle': '. Créalo aquí o ',
  'form.assignLink': 'asígnalo a uno que ya tengas',
  'form.unknownCodeAfter': '.',
  'form.photoAlt': 'Foto del producto',
  'form.takePhoto': 'Hacer foto',
  'form.pickPhoto': 'Elegir de la galería',
  'form.removePhoto': 'Quitar foto',
  'form.photoError': 'No se ha podido abrir la foto. Prueba con otra.',
  'form.name': 'Nombre',
  'form.namePlaceholder': 'Ej.: Agua mineral 1,5 L',
  'form.barcode': 'Código de barras',
  'form.barcodePlaceholder': 'Escanéalo o escríbelo',
  'form.scan': 'Escanear',
  'form.quantityNew': 'Cantidad inicial',
  'form.quantityEdit': 'Cantidad actual',
  'form.unit': 'Unidad',
  'form.minimum': 'Avisar cuando queden',
  'form.minimumPlaceholder': 'Ej.: 5 (vacío para no avisar)',
  'form.minimumHint': 'Con esa cantidad o menos aparece en «Reponer».',
  'form.category': 'Categoría',
  'form.noCategory': 'Sin categoría',
  'form.newCategoryOption': '+ Nueva categoría…',
  'form.location': 'Ubicación',
  'form.locationPlaceholder': 'Ej.: Estantería 2',
  'form.newCategoryName': 'Nombre de la nueva categoría',
  'form.newCategoryPlaceholder': 'Ej.: Bebidas',
  'form.notes': 'Notas',
  'form.notesPlaceholder': 'Proveedor, caducidad, lo que quieras recordar',
  'form.submitNew': 'Añadir producto',
  'form.submitEdit': 'Guardar cambios',
  'form.delete': 'Borrar producto',

  // Validation
  'error.nameRequired': 'Escribe un nombre.',
  'error.nameTooLong': 'El nombre no puede superar {max} caracteres.',
  'error.barcodeTaken': 'Ese código ya es de «{name}».',
  'error.quantity': 'Escribe una cantidad de 0 o más.',
  'error.minimum': 'Escribe un número de 0 o más.',
  'error.categoryExists': 'Ya existe una categoría con ese nombre.',

  // Assign a barcode
  'assign.title': 'Asignar código',
  'assign.intro': 'Elige el producto al que pertenece el código ',
  'assign.current': 'Código actual: {code}',
  'assign.none': 'Sin código',

  // Restock
  'restock.allGoodTitle': 'Todo en orden',
  'restock.allGoodDescription': 'Ningún producto está agotado ni por debajo de su aviso.',
  'restock.share': 'Enviar lista',
  'restock.copy': 'Copiar lista',
  'restock.copied': 'Lista copiada. Pégala en WhatsApp o donde quieras.',
  'restock.copyFailed': 'No se ha podido copiar. Usa «Enviar» o mantén pulsado el texto.',
  'restock.listLabel': 'Productos por reponer',
  'restock.warningAt': 'Aviso en {amount}',
  'restock.orderSome': 'pedir unas {amount}',
  'restock.noWarning': 'Sin aviso configurado',
  'restock.hint': '«Pedir unas» sugiere la cantidad para llegar al doble del aviso.',
  'restock.textTitle': 'Pedido para el almacén:',
  'restock.textLine': '- {name}: quedan {amount} {unit}',
  'restock.textOrder': '(pedir unas {amount})',

  // Movements
  'movement.in': 'Entrada',
  'movement.out': 'Salida',
  'movement.adjust': 'Ajuste',
  'movement.new': 'Alta',
  'movement.left': 'quedan {amount}',
  'movements.emptyTitle': 'Sin movimientos',
  'movements.emptyDescription':
    'Cuando sumes o restes stock, aparecerá aquí con la fecha y la hora.',

  // Categories
  'categories.title': 'Categorías',
  'categories.new': 'Nueva categoría',
  'categories.rename': 'Renombrar {name}',
  'categories.renameLabel': 'Nuevo nombre de {name}',
  'categories.deleteLabel': 'Borrar {name}',
  'categories.empty':
    'Todavía no hay categorías. Crea las que uses: Bebidas, Limpieza, Alimentación…',
  'categories.hint':
    'Al borrar una categoría, sus productos se quedan sin categoría; no se borra ninguno.',

  // Settings
  'settings.title': 'Ajustes',
  'settings.appearance': 'Apariencia',
  'theme.legend': 'Tema',
  'theme.system': 'Sistema',
  'theme.light': 'Claro',
  'theme.dark': 'Oscuro',
  'theme.hint': '«Sistema» sigue el modo claro u oscuro de tu móvil.',
  'language.title': 'Idioma',
  'language.label': 'Idioma de la aplicación',
  'language.auto': 'Automático (idioma del móvil)',
  'language.hint': '«Automático» usa el idioma de tu móvil si la app está disponible en él.',

  // Backup
  'backup.title': 'Copia de seguridad',
  'backup.saveTitle': 'Guardar copia',
  'backup.saveDescription':
    'Descarga un archivo con tus {products}, sus fotos y el historial. Los datos solo están en este móvil: guarda una copia de vez en cuando para no perderlos si cambias de móvil o borras el navegador.',
  'backup.saveButton': 'Guardar copia',
  'backup.saved': 'Copia guardada. Consérvala en un lugar seguro.',
  'backup.createError': 'No se ha podido crear la copia.',
  'backup.restoreTitle': 'Restaurar copia',
  'backup.restoreDescription':
    'Elige un archivo guardado antes. Sustituirá lo que hay ahora en la app.',
  'backup.chooseFile': 'Elegir archivo',
  'backup.pendingSummary':
    'La copia tiene {products}, {photos} y {movements}. Esto reemplazará tus {current} actuales.',
  'backup.replace': 'Reemplazar datos',
  'backup.restored': 'Copia restaurada.',
  'backup.restoreError': 'No se ha podido restaurar la copia.',
  'backup.persistent':
    'Almacenamiento protegido: el navegador no borrará tus datos por falta de espacio.',
  'backup.notPersistent':
    'El navegador podría borrar los datos si falta espacio. Instala la app en la pantalla de inicio y guarda copias.',
  'backup.invalidJson': 'El archivo no es un JSON válido.',
  'backup.notBackup': 'Este archivo no es una copia de seguridad de Almacén.',
  'backup.newerVersion':
    'La copia es de una versión más nueva de la app. Actualízala e inténtalo de nuevo.',
  'backup.missingData': 'Faltan datos en la copia.',
  'backup.badCategories': 'La copia contiene categorías con datos no válidos.',
  'backup.badProducts': 'La copia contiene productos con datos no válidos.',
  'backup.badMovements': 'La copia contiene movimientos con datos no válidos.',
  'backup.badPhotos': 'La copia contiene fotos dañadas.',
  'backup.duplicates': 'La copia contiene elementos repetidos.',
  'backup.missingReferences': 'La copia contiene productos con categorías o fotos que faltan.',

  // Scanner
  'scanner.title': 'Escanear código',
  'scanner.starting': 'Abriendo la cámara…',
  'scanner.scanning': 'Apunta al código de barras. Se leerá solo.',
  'scanner.readingPhoto': 'Leyendo el código de la foto…',
  'scanner.photoFailed': 'No se ha podido leer el código en la foto. Acércate más, con buena luz.',
  'scanner.denied':
    'No hay permiso para usar la cámara. Actívalo en los ajustes del navegador para esta web y vuelve a intentarlo.',
  'scanner.noCamera': 'No se ha encontrado ninguna cámara en este dispositivo.',
  'scanner.unsupported': 'Este navegador no puede usar la cámara en directo.',
  'scanner.failed':
    'No se ha podido abrir la cámara. Ciérrala en otras apps y vuelve a intentarlo.',
  'scanner.takePhoto': 'Hacer foto',
  'scanner.typeCode': 'Escribir código',
  'scanner.codeLabel': 'Código de barras',
  'scanner.codePlaceholder': 'Escribe el código',
  'scanner.search': 'Buscar',

  // Errors when saving
  'store.product.create': 'No se ha podido guardar el producto.',
  'store.product.update': 'No se ha podido guardar el cambio.',
  'store.product.remove': 'No se ha podido borrar el producto.',
  'store.product.replace': 'No se han podido restaurar los productos.',
  'store.movement.create': 'No se ha podido apuntar el movimiento.',
  'store.movement.replace': 'No se han podido restaurar los movimientos.',
  'store.category.create': 'No se ha podido crear la categoría.',
  'store.category.update': 'No se ha podido renombrar la categoría.',
  'store.category.remove': 'No se ha podido borrar la categoría.',
  'store.category.replace': 'No se han podido restaurar las categorías.',
  'store.photo.save': 'No se ha podido guardar la foto.',
  'store.photo.replace': 'No se han podido restaurar las fotos.',
}

export type MessageKey = keyof typeof es

/**
 * The shape every language file must have. Languages with more plural forms
 * than Spanish (Arabic) may add "_zero", "_two", "_few" and "_many" variants.
 */
export type Messages = Record<MessageKey, string> &
  Partial<Record<`${string}_${'zero' | 'two' | 'few' | 'many'}`, string>>
