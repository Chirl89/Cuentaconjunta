# Reglas de Comportamiento del Agente & Estándares del Proyecto

## 1. Modo de Trabajo, Autonomía y Calidad
- **Auto-aprobación**: Avanzar y ejecutar los cambios de forma autónoma. No detenerse a pedir confirmación para tareas ya planificadas o pasos evidentes.
- **Refactorización Continua & Ahorro de Tokens**: Al finalizar cada funcionalidad, auditar el código para eliminar redundancias, simplificar modularidad y mantener el codebase compacto y token-efficient.
- **Testing Obligatorio (Unitario y Regresión)**:
  - Al final de cada paso o modificación relevante, ejecutar tests unitarios del nuevo código y tests de regresión para garantizar que los pasos previos siguen funcionando al 100%.
  - Si se detecta cualquier fallo o regresión, **solucionarlo de inmediato** de forma proactiva.

## 2. Sistema de Versionado Estricto (FitDuo Standard)
- **Nueva conversación / Paso principal**: Incrementa la versión menor (ej. `v0.1` -> `v0.2` -> ... -> `v0.11`). Coincide exactamente con el número de Paso completado.
- **Iteración dentro de la misma conversación**: Incrementa la versión parche (ej. `v0.1.1` -> `v0.1.2` -> ... -> `v0.1.14`).
- **Visibilidad obligatoria**: En cualquier interfaz visible (WebApp, dashboard, headers, pantallas), se DEBE mostrar arriba de forma clara el **número de versión actual**.
- El archivo `version.json` en la raíz del proyecto es la fuente de verdad del número de versión.

## 3. Protocolo de Conversaciones y Tablas de Progreso
- **Al iniciar nueva conversación (o al decir `inicia el siguiente paso`):**
  1. Mostrar una **Tabla de Progreso** detallando:
     - Pasos completados (con número y titular).
     - Paso actual que se va a implantar de forma inmediata.
     - Pasos restantes pendientes.
  2. Iniciar la ejecución autónoma de dicho paso.
- **Al finalizar conversación (al decir `paso finalizado`):**
  1. Mostrar la **Tabla de Progreso** actualizada (lo implantado y lo restante).
  2. Respuesta de cierre: `El paso X ([Nombre/Titular]) está finalizado. El siguiente paso es el paso Y: [Nombre/Titular].`

## 4. Reporte de Impactos y Guía de Pruebas en CADA Iteración
- **Al final de CADA respuesta/iteración:**
  - Si se ha corregido un error o modificado código, listar los **posibles impactos derivados**.
  - Incluir de forma obligatoria una sección clara: **"🧪 Qué deberías probar ahora:"** con los pasos y acciones concretas para que el usuario pueda verificar los cambios en PC (Chrome/Edge) o en iOS (Safari).

## 5. Control de Versiones (Git)
- Cada paso o iteración relevante se reflejará en commits ordenados y sincronizados con el repositorio remoto.
