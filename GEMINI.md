# Reglas de Comportamiento del Agente & Estándares del Proyecto

## 1. Modo de Trabajo y Autonomía
- **Auto-aprobación**: Avanzar y ejecutar los cambios de forma autónoma. No detenerse a pedir confirmación para tareas ya planificadas o pasos evidentes.
- Proactividad total en resolución de errores, refactorizaciones y creación de componentes.

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
