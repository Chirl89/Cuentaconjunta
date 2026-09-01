# Reglas de Comportamiento del Agente & Estándares del Proyecto

## 1. Modo de Trabajo y Autonomía
- **Auto-aprobación**: Avanzar y ejecutar los cambios de forma autónoma. No detenerse a pedir confirmación para tareas ya planificadas o pasos evidentes.
- Proactividad total en resolución de errores, refactorizaciones y creación de componentes.

## 2. Sistema de Versionado Estricto (FitDuo Standard)
- **Nueva conversación**: Incrementa la versión menor (ej. 0.1 -> 0.2 -> ... -> 0.11).
- **Iteración dentro de la misma conversación**: Incrementa la versión parche (ej. 0.1.1 -> 0.1.2 -> ... -> 0.1.11).
- **Visibilidad obligatoria**: En cualquier interfaz visible (WebApp, dashboard, headers, pantallas), se DEBE mostrar arriba de forma clara el **número de versión actual**.
- El archivo ersion.json en la raíz del proyecto es la fuente de verdad del número de versión.

## 3. Control de Versiones (Git)
- Cada hito o iteración relevante se reflejará en commits ordenados y sincronizados con el repositorio remoto.
