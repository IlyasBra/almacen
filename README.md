# Almacén de la tienda

App para el móvil que controla el stock del almacén de la tienda: qué hay, cuánto queda y qué hay que reponer.

## Qué hace

- **Inventario** con buscador, filtros por categoría y un color por producto: bien, queda poco o agotado.
- **Ficha de producto** con foto, código de barras, ubicación y stock mínimo. Botones − / + para restar o sumar, y un campo para cantidades mayores.
- **Escáner de códigos de barras por foto** con modo continuo. Si el producto existe, se abre su ficha. Si no, lleva a crearlo con el código ya puesto.
- **Categorías** que puedes crear, renombrar y eliminar.
- **Por reponer**: lista de lo agotado o por debajo del mínimo, con un botón para copiarla y pegarla en WhatsApp.
- **Movimientos**: historial de entradas, salidas y ajustes con fecha y hora.

## Cómo funciona

Es un único archivo, `index.html`, publicado como artifact en Claude (claude.ai). Los datos y las fotos se guardan con los servicios de Claude, a los que la página accede con `window.claude.use(...)`:

| Servicio | Uso |
| --- | --- |
| `db` | Colecciones `productos` y `movimientos`, y el documento `config/categorias` |
| `assets` | Fotos de los productos (se reducen a 1200 px antes de subirlas) |
| `user` | Identificar a quien abre la app |

Solo la propietaria o el propietario de la app puede leer y escribir los datos.

**Importante:** si abres este `index.html` fuera de Claude (por ejemplo, con GitHub Pages), la página carga pero no puede leer ni guardar datos. Este repositorio es una copia del código; la app se usa desde su enlace de Claude.

## Lectura de códigos de barras

Usa la API nativa `BarcodeDetector` cuando el navegador la tiene (Chrome en Android). Si no, carga [ZXing](https://github.com/zxing-js/library) 0.21.3 desde unpkg. Lee EAN-13, EAN-8, UPC, Code 128, Code 39, Code 93, ITF, Codabar, QR y Data Matrix.
