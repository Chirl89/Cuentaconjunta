# Requisitos Funcionales y UX: Flujo de Asignación y Reglas

## 1. Backlog de Movimientos Sin Asignar (Inbox de Gastos)
- **Pantalla Inicial / Dashboard Prioritario:**
  - Al abrir la aplicación, se muestra prominentemente el listado de movimientos bancarios descargados que están **pendientes de asignar**.
  - **Triage Rápido (1 toque / swipe):**
    - Asignar a **Persona A** (Gasto 100% individual de A).
    - Asignar a **Persona B** (Gasto 100% individual de B).
    - Asignar a **Ambos (Conjunto)** (Split 50/50 por defecto o porcentaje configurable).
  - El contador de movimientos pendientes decrece a medida que se procesa el backlog.

## 2. Motor de Reglas Configurables
- Los usuarios pueden crear y editar reglas automáticas basadas en:
  - Texto del comercio / descripción (ej. `MERCADONA`, `IBERDROLA`, `NETFLIX`).
  - Tarjeta o cuenta bancaria origen.
  - Rango de importes.
- **Acciones de la regla:** Asignar automáticamente a Persona A, Persona B o Ambos (con split definido) y asignar categoría.
- **Reversibilidad total:** Cualquier gasto (incluso asignado automáticamente por regla) se puede **reasignar manualmente** en cualquier momento.

## 3. Bandeja de Validación de Auto-Asignaciones
- Apartado específico en la app para auditar los gastos que entraron y se asignaron automáticamente por regla.
- Permite a la pareja hacer un repaso rápido ("Validar todo" o modificar alguno con 1 clic si en esa ocasión fue un gasto especial).
