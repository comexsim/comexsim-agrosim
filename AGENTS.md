# AGENTS.md — comexsim-agrosim

Reglas para todo agente que trabaje en este repo. Complementa el `AGENTS.md` del paraguas (`comexsim-docs`) con la misma **excepción explícita** que `comexsim-demo-3d`, decidida por el autor el 2026-11-03: este repo es **solo frontend**, se despliega **solo en Vercel** y existe para mostrar AgroSim a la UPSA.

## Qué cambia respecto del paraguas

- **No aplica** lo de multi-tenant, RLS, `withTenant()`, borrado lógico, API, contratos, login ni motor en paquete aparte. Aquí no hay backend ni base de datos, y **no se integra** con `comexsim-api` ni con `comexsim-web` hasta que el autor lo decida.
- **Sí aplica:**
  - lo visual es el producto: una misión impecable vale más que muchas a medias;
  - es un **simulador académico, no un juego** (vocabulario de SIMA);
  - nada del dominio en los componentes: costos, dosis, rendimientos, tiempos y eventos viven en `src/data/` y se muestran como **ilustrativos**;
  - dinero con decimal.js, nunca `number` para montos;
  - motor puro (sin `Date.now()` ni `Math.random()`; la semilla entra como parámetro) y con tests unitarios;
  - TypeScript estricto, textos por i18n (es/en), comentarios y commits en español;
  - rendimiento: la escena 3D se carga de forma diferida, apunta a 60 FPS en un portátil común y tiene respaldo 2D;
  - nunca escribir el nombre del consultor de dominio en el repo.

## Flujo

- Commits convencionales en español; un cambio lógico por commit.
- Una rama por tarea (`feat/<tema>`, `fix/<tema>`, `docs/<tema>`) y PR hacia `main`.
- No hacer commit ni push sin que el autor lo pida.
- Antes de instalar una dependencia nueva, avisar y anotar el porqué en `docs/decisiones/`.

## Mapa

| Necesitas | Vas a |
|---|---|
| Qué es la demo y cómo se despliega | `README.md` |
| Por qué el kit de escena está copiado | `docs/decisiones/ADR-001-kit-de-escena-copiado.md` |
| Las 18 decisiones y sus números | `src/data/agro-001.ts` |
| El plan de la demo y las fuentes | `comexsim-docs/docs/agrosim/` |
