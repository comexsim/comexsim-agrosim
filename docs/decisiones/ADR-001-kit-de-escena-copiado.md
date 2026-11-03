# ADR-001 — Kit de escena copiado de `@comexsim/ui` y stack del demo

- **Estado:** Propuesta (2026-11-03)
- **Contexto de la decisión:** sesión de planificación y construcción de AgroSim con el autor.

## Contexto

AgroSim es una demo solo frontend que el autor despliega en Vercel por su cuenta y presenta a la UPSA el 6 de noviembre de 2026 (a más tardar el 9). El autor pidió reutilizar el motor gráfico de Comexsim donde se pudiera.

El kit de escena 2.0 (ADR-019 del paraguas) vive en `@comexsim/ui/world`: cámara isométrica por estaciones, N8AO, SMAA, calidad adaptativa y respaldo 2D. El paquete se publica en GitHub Packages, que exige un token de lectura para instalarlo. pnpm 12, además, ignora las credenciales del `.npmrc` del repo.

## Decisión

1. **Se copia** el subconjunto del kit que usa la finca a `src/world/`, con una cabecera que indica el origen (`@comexsim/ui 0.9.0-rc.5`):
   - `camera`, `camera-rig`, `path` y `quality`;
   - `context`, `stage`, `primitives`, `nature` y `labels`.

   La paleta se adapta a colores de campo (`--ag-world-*`).
2. **Mismo stack que `comexsim-demo-3d`:** Next 16, React 19, React Three Fiber 9, drei 10, `@react-three/postprocessing` 3, three 0.186, next-intl 4, zustand 5, decimal.js y vitest 5. No se agrega ninguna dependencia nueva respecto de ese repo.
3. Las **piezas de granja** (lote instanciado, tractor, sembradora, pulverizadora, cosechadora, dron, silos, planta aceitera) viven en la app (`src/features/farm/`). Se promueven al design system si AgroSim pasa a ser producto.

## Consecuencias

- **A favor:**
  - Vercel instala sin tokens ni configuración: el autor solo importa el repo;
  - la demo no depende de una pre-release del design system.
- **En contra:** hay código duplicado con `@comexsim/ui`. Se reconcilia al integrar AgroSim al Laboratorio Virtual: se reemplaza `src/world/` por la importación del paquete y se suben las piezas de granja.
