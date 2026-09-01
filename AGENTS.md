# Reglas de Comportamiento del Agente & Estándares del Proyecto

## 1. Modo de Trabajo, Autonomía y Calidad
- **Auto-aprobación**: Avanzar y ejecutar los cambios de forma autónoma. No detenerse a pedir confirmación para tareas ya planificadas o pasos evidentes.
- **Refactorización Continua & Ahorro de Tokens**: Al finalizar cada funcionalidad, auditar el código para eliminar redundancias, simplificar modularidad y mantener el codebase compacto y token-efficient.
- **Testing Obligatorio (Unitario y Regresión)**:
  - Al final de cada paso o modificación relevante, ejecutar tests unitarios del nuevo código y tests de regresión para garantizar que los pasos previos siguen funcionando al 100%.
  - Si se detecta cualquier fallo o regresión, **solucionarlo de inmediato** de forma proactiva.

## 2. Sistema de Versionado Estricto (FitDuo Standard)
- **Nueva conversación**: Incrementa la versión menor (ej. 0.1 -> 0.2 -> ... -> 0.11). Coincide exactamente con el número de Paso completado.
- **Iteración dentro de la misma conversación**: Incrementa la versión parche (ej. 0.1.1 -> 0.1.2 -> ... -> 0.1.11).
- **Visibilidad obligatoria**: En cualquier interfaz visible (WebApp, dashboard, headers, pantallas), se DEBE mostrar arriba de forma clara el **número de versión actual**.
- El archivo ersion.json en la raíz del proyecto es la fuente de verdad del número de versión.

## 3. Protocolo de Conversaciones
- **Al finalizar conversación**, el usuario dirá: paso finalizado.
  - Respuesta obligatoria: el paso X está finalizado, siguiente paso, Y.
- **Al iniciar nueva conversación**, el usuario dirá: inicia el siguiente paso.
  - Respuesta obligatoria inicial: los pasos finalizados son estos: [lista], el próximo paso es: [nombre del paso]. A continuación, comenzar la ejecución autónoma de dicho paso.

## 4. Control de Versiones (Git)
- Cada paso o iteración relevante se reflejará en commits ordenados y sincronizados con el repositorio remoto.
