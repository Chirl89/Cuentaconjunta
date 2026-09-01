# Reglas de Comportamiento del Agente & Estándares del Proyecto

## 1. Modo de Trabajo, Autonomía y Calidad
- **Auto-aprobación**: Avanzar y ejecutar los cambios de forma autónoma. No detenerse a pedir confirmación para tareas ya planificadas o pasos evidentes.
- **Refactorización Continua & Ahorro de Tokens**: Al finalizar cada funcionalidad, auditar el código para eliminar redundancias, simplificar modularidad y mantener el codebase compacto y token-efficient.
- **Testing Obligatorio (Unitario y Regresión)**:
  - Al final de cada paso o modificación relevante, ejecutar tests unitarios del nuevo código y tests de regresión para garantizar que los pasos previos siguen funcionando al 100%.
  - Si se detecta cualquier fallo o regresión, **solucionarlo de inmediato** de forma proactiva.

## 2. Sistema de Versionado Estricto (FitDuo Standard)
- **Nueva conversación**: Incrementa la versión menor (ej. `v0.1` -> `v0.2` -> ... -> `v0.11`). Coincide exactamente con el número de Paso completado.
- **Iteración dentro de la misma conversación**: Incrementa la versión parche (ej. `v0.1.1` -> `v0.1.2` -> ... -> `v0.1.11`).
- **Visibilidad obligatoria**: En cualquier interfaz visible (WebApp, dashboard, headers, pantallas), se DEBE mostrar arriba de forma clara el **número de versión actual**.
- El archivo `version.json` en la raíz del proyecto es la fuente de verdad del número de versión.

## 3. Protocolo de Conversaciones
- **Al finalizar conversación**, el usuario dirá: `paso finalizado`.
  - Respuesta obligatoria: `El paso X ([Nombre/Titular del paso X]) está finalizado. El siguiente paso es el paso Y: [Nombre/Titular del paso Y].`
- **Al iniciar nueva conversación**, el usuario dirá: `inicia el siguiente paso`.
  - Respuesta obligatoria inicial: `Los pasos finalizados son estos: [lista con número y titular], el próximo paso es: [número y titular del paso].` A continuación, comenzar la ejecución autónoma de dicho paso.

## 4. Control de Versiones (Git)
- Cada paso o iteración relevante se reflejará en commits ordenados y sincronizados con el repositorio remoto.
