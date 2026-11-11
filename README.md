# Almacén

App web para controlar el stock del almacén de la tienda: qué hay, cuánto queda y qué hay que reponer. Funciona sin conexión, guarda los datos en el propio móvil y se instala en la pantalla de inicio como PWA.

**App:** https://ilyasbra.github.io/almacen/

## Funcionalidades

- **Inventario** con buscador (sin distinguir mayúsculas ni acentos), filtros por categoría y por estado: bien, queda poco o agotado.
- **Lector de códigos de barras en vivo**: apuntas con la cámara, lee el código y se cierra solo. Si el producto existe, abre su ficha; si no, lleva a crearlo con el código ya puesto o permite asignarlo a un producto que ya existe.
- **Modo escaneo continuo**: tras cada producto, «Escanear siguiente» vuelve a abrir la cámara.
- **Ficha de producto** con foto, botones grandes − / + (los toques seguidos se guardan como un solo movimiento), entradas y salidas de otras cantidades, e historial.
- **Fotos** hechas con la cámara o elegidas de la galería, reducidas antes de guardarlas.
- **Categorías** propias: crear, renombrar y borrar (sus productos se quedan sin categoría).
- **Reponer**: agotados y por debajo del aviso, con cantidad sugerida y la lista lista para copiar o enviar por WhatsApp.
- **Movimientos**: historial de entradas, salidas, ajustes y altas, por días.
- **Copia de seguridad** en JSON con fotos incluidas, validada al importar.
- **6 idiomas**: español, inglés, francés, árabe (de derecha a izquierda), italiano y alemán. Usa por defecto el idioma del móvil y se puede cambiar en Ajustes.
- **Modo oscuro** (sistema, claro u oscuro, sin parpadeo al cargar).
- **PWA**: instalable, funciona sin conexión y se actualiza sola.

## Tecnología

Misma base que [Diario](https://github.com/IlyasBra/diario):

| Pieza   | Elección                     | Motivo                                                                                   |
| ------- | ---------------------------- | ---------------------------------------------------------------------------------------- |
| UI      | React 19 + TypeScript        | Tipado estricto, sin `any`.                                                              |
| Build   | Vite                         | Arranque rápido y buen soporte de PWA.                                                   |
| Estilos | Tailwind CSS v4              | Mobile-first y modo oscuro con clases.                                                   |
| Datos   | Dexie (IndexedDB)            | Sin backend; las fotos se guardan como Blob en su propia tabla.                          |
| Lector  | BarcodeDetector + ZXing      | El detector nativo donde existe (Android); ZXing en el resto (iPhone).                   |
| PWA     | vite-plugin-pwa (Workbox)    | Caché offline y actualización automática.                                                |
| Fechas  | date-fns + `Intl`            | Fechas, horas y números en el formato de cada idioma.                                    |
| Idiomas | Capa propia (`src/i18n`)     | La misma que Diario: sin dependencias, claves tipadas y plurales con `Intl.PluralRules`. |
| Tests   | Vitest + Testing Library     | Pruebas de comportamiento, no de implementación.                                         |
| Calidad | ESLint (+jsx-a11y), Prettier | Reglas de accesibilidad en el lint.                                                      |
| CI/CD   | GitHub Actions + Pages       | Formato, lint, tipos, tests y build en cada push; despliegue desde `main`.               |

## Ejecutar en local

Requisitos: Node.js 22 o superior.

```bash
npm install
npm run dev
```

Abre http://localhost:5173. La cámara solo funciona en `localhost` o con HTTPS.

## Scripts

| Comando                | Qué hace                              |
| ---------------------- | ------------------------------------- |
| `npm run dev`          | Servidor de desarrollo                |
| `npm run build`        | Typecheck y build de producción       |
| `npm run preview`      | Sirve el build (usa `VITE_BASE_PATH`) |
| `npm run typecheck`    | Comprueba los tipos                   |
| `npm run lint`         | ESLint sin avisos permitidos          |
| `npm run format:check` | Comprueba el formato con Prettier     |
| `npm test`             | Ejecuta los tests                     |

## Estructura

```
src/
  app/          pantalla principal y rutas
  components/   UI reutilizable (botones, diálogos, iconos)
  db/           esquema Dexie y elección de repositorios
  features/     products, movements, categories, photos, scanner,
                inventory (estado), restock, backup, settings
  i18n/         idiomas, traducciones y detección del idioma
  lib/          utilidades y capa de repositorios
```

## Decisiones técnicas

- **Patrón repositorio**, como en Diario: la interfaz `Repository` separa la app del almacenamiento, con implementaciones en IndexedDB y en memoria que pasan los mismos tests de contrato.
- **Cada cambio de stock deja un movimiento.** `InventoryProvider` es el único sitio que cambia cantidades, y siempre apunta el movimiento con la cantidad resultante.
- **Toques agrupados.** Pulsar + cinco veces seguidas guarda un único «+5» tras una pausa corta, en lugar de cinco movimientos.
- **Fotos aparte.** Se reducen a 1200 px en JPEG y se guardan en su propia tabla; los productos solo guardan el id, así la lista nunca carga imágenes enteras.
- **Lector en vivo.** La cámara se abre con `getUserMedia`; ZXing se carga solo cuando hace falta para no engordar el arranque. Si no hay cámara o permiso, se puede leer el código de una foto o escribirlo.
- **Copia de seguridad versionada** (`BACKUP_VERSION`), con las fotos en base64. Todo se valida antes de tocar la base de datos, y se restaura en una sola operación por tabla. La app pide `storage.persist()` para que el navegador no borre los datos.
- **Unidades guardadas en un solo idioma.** Las unidades se guardan con su clave en español y se muestran traducidas, así cambiar de idioma no altera los datos ni las copias.
- **Árabe de derecha a izquierda** con clases lógicas de Tailwind (`ps-`, `ms-`, `start-`), y los números siempre de izquierda a derecha.
- **Accesibilidad.** Diálogos nativos `<dialog>`, etiquetas en todos los controles, objetivos táctiles de 44 px y estado de stock con texto, no solo con color.
