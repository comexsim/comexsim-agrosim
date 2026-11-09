# SIMA · AgroSim

Demo **solo frontend** del simulador académico de agronegocios, una propuesta para la carrera de Agronegocios de la UPSA.

El estudiante administra una campaña de soya de **100 ha en Santa Cruz** (Misión AGRO #001): toma **18 decisiones en seis etapas** (suelo, siembra, manejo, cosecha, acopio y venta) sobre una finca 3D que se transforma con cada decisión. Al final recibe un informe con su resultado económico y un puntaje de 0 a 100.

> Todos los costos, rendimientos y condiciones son **supuestos académicos ilustrativos**. Son aproximados y verosímiles, no recomendaciones técnicas ni cotizaciones. Se validarán con docentes de la carrera después de la demo.

## Qué incluye

- **Portada** con la finca 3D de fondo y las cuatro misiones del laboratorio (AGRO #001 jugable, las otras «Próximamente»).
- **Briefing** de la misión con el capital, la superficie y el rendimiento de referencia.
- **Simulador:**
  - indicadores vivos arriba (presupuesto, día, hectáreas sembradas, rendimiento, condición del cultivo, producción);
  - etapas a la izquierda;
  - decisión a la derecha;
  - bitácora abajo.
- **«Aprende de tu decisión»:** eliges y confirmas, ves la consecuencia en la finca, se mueven los indicadores y aparece la explicación técnica.
- **Animaciones de la finca:**
  - muestreo de suelo;
  - fertilizadora;
  - rastra o barbecho;
  - camiones de insumos;
  - sembradora con surcos;
  - cultivo que crece, florece, amarillea y se seca;
  - malezas;
  - plaga en un sector;
  - pulverizadora (total o focalizada);
  - dron con mapa de riesgo de roya;
  - lluvia;
  - cosechadora con rastrojo y granos perdidos;
  - convoy de camiones;
  - silos que se llenan;
  - planta aceitera.
- **Tres eventos:** plaga, lluvia excesiva y variación del precio. El precio cambia en cada intento, para que no se memorice la respuesta.
- **Informe final:** costos por concepto, ingresos, utilidad, margen, puntaje en siete dimensiones, dónde se perdió y comparación con el intento anterior. Los intentos se guardan en el navegador.
- **Modo Presentación:** un recorrido guiado de unos 7 minutos, con narración en pantalla y botones para pausar y salir. Se abre desde la portada o en `/mision/agro-001?presentacion=1`. Toma las decisiones recomendadas y comete un error a propósito (ignorar las malezas), para mostrar su costo. No cuenta como intento.
- **Velocidad y cámara:** con la velocidad **Normal**, cada máquina trabaja a un paso creíble con la cámara a su lado y, cuando ya se entendió el trabajo, el resto del lote avanza en **tiempo acelerado** (con aviso en pantalla y la cámara sobre todo el lote). La velocidad **Rápida** hace el recorrido corrido y corto. El selector está en el panel mientras se ejecuta la decisión, se recuerda en el navegador y cambia sin saltos aunque la animación esté a mitad de camino. El botón «Saltar animación» permite avanzar.
- **Lupa sobre el lote:** en las decisiones de malezas, orugas y madurez, la cámara se acerca a un parche del mismo lote (en el sector de las orugas) y sus plantas se dibujan detalladas: hojas trifoliadas, flores, vainas, malezas entre las hileras y larvas.
- **Opciones mezcladas:** el orden de A, B y C cambia en cada intento, y la recomendada no es la de texto más largo.
- **Español e inglés.** Abre en modo claro, con opción de oscuro. Si el equipo no tiene GPU, se muestra un respaldo 2D.

## Desplegar en Vercel

No necesita variables de entorno ni tokens: todas las dependencias son públicas.

Publicada en <https://comexsim-agrosim.vercel.app>. Vercel despliega `main` en producción y cada PR en una vista previa. Para crear otro proyecto:

1. En Vercel: **Add New → Project → Import** `comexsim/comexsim-agrosim`. Si no aparece, dale acceso a la aplicación de Vercel en la organización de GitHub.
2. Vercel detecta **Next.js** y **pnpm** por el `pnpm-lock.yaml` y el campo `packageManager`. No hay que cambiar nada:
   - **Framework Preset:** Next.js;
   - **Install Command:** por defecto (`pnpm install`);
   - **Build Command:** por defecto (`next build`);
   - **Node.js:** 22.x o superior (Project Settings → General).
3. **Deploy.** La rama de producción es `main`; cada PR genera su propia vista previa.

## Desarrollo

```bash
corepack pnpm install
corepack pnpm dev        # http://localhost:3300
corepack pnpm test       # motor, escena y textos
corepack pnpm lint && corepack pnpm typecheck && corepack pnpm build
```

## Estructura

| Carpeta | Qué hay |
|---|---|
| `src/data/agro-001.ts` | La misión como datos: las 18 decisiones, costos, efectos, eventos y puntaje. Ningún número del dominio va en el código. |
| `src/engine/` | El motor de campaña, puro y con tests: costos con decimal.js, rendimiento, eventos, informe y comparación de intentos. |
| `src/features/farm/` | La finca 3D: el lote instanciado, la maquinaria, los edificios, el clima y las animaciones de cada decisión. |
| `src/features/mission/` | La pantalla del simulador: estado (zustand), HUD, briefing e informe. |
| `src/world/` | El kit de escena copiado de `@comexsim/ui` (cámara isométrica, posprocesado, calidad adaptativa). Ver `docs/decisiones/ADR-001`. |
| `messages/` | Los textos de la interfaz en español e inglés. |

## Rendimiento medido

Recorrido guiado completo a 1366×768 en un portátil con Intel HD Graphics 620 (2026-11-08): mediana de 57 FPS y bajadas breves hasta 39 FPS, con la calidad adaptativa activa. No llega a 60 FPS sostenidos en esa GPU, pero el recorrido se ve fluido.

## Cómo se calibró la misión

- **Rendimiento:** 3,0 t/ha es el potencial con buen manejo. El promedio de la campaña de verano 2025-26 en Santa Cruz fue de 2,36 t/ha (Anapo), y el briefing lo muestra como referencia.
- **Precio de referencia:** USD 350/t. El evento de mercado lo mueve ±10 o ±20.
- **Costos:** el escenario recomendado suma USD 53.130 (unos USD 531/ha) y deja una utilidad cercana a USD 56.000, con el precio que sube en el evento de mercado.

El detalle de cada decisión está en `src/data/agro-001.ts`. Qué valores se contrastaron con fuentes públicas, cuáles vienen del documento de la carrera y cuáles son supuestos está en [`docs/fuentes-de-los-valores.md`](docs/fuentes-de-los-valores.md). El costo por hectárea queda por debajo de las referencias de 2026.
