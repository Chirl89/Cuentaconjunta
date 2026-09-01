# Requisitos Funcionales y UX: Flujo de Asignación, Reglas e IA

## 1. Backlog de Movimientos Sin Asignar (Inbox de Gastos)
- **Pantalla Inicial / Dashboard Prioritario:**
  - Al abrir la aplicación, se muestra prominentemente el listado de movimientos bancarios descargados que están **pendientes de asignar**.
  - **Triage Rápido (1 toque / swipe):**
    - Asignar a **Persona A** (Gasto 100% individual de A).
    - Asignar a **Persona B** (Gasto 100% individual de B).
    - Asignar a **Ambos (Conjunto)** (Split 50/50 por defecto o porcentaje configurable).
  - El contador de movimientos pendientes decrece a medida que se procesa el backlog.

## 2. Motor de Categorización Inteligente con IA y Aprendizaje Continuo (Feedback Loop)
- **Clasificación Inicial por IA:**
  - Modelo ligero/rápido de categorización (vía modelo semántico / Gemini Flash API ultraligera o clasificador NLP) que sugiere la categoría correspondiente a partir del concepto del extracto bancario (ej. "Iberdrola" -> Facturas/Luz).
- **Aprendizaje Activo por Corrección del Usuario:**
  - Cuando el usuario cambia manualmente una categoría (ej. mueve una factura de "Luz" a "Gastos Vivienda"), el sistema guarda inmediatamente esa preferencia y patrón.
  - Para los futuros movimientos con ese mismo concepto o comercio, el sistema aplica automáticamente la categoría corregida por el usuario con máxima prioridad.
- **Categorización 100% editable:** Cualquier categoría asignada puede cambiarse en cualquier momento con un clic.

## 3. Motor de Reglas Configurables
- Los usuarios pueden crear y editar reglas automáticas basadas en:
  - Texto del comercio / descripción (ej. `MERCADONA`, `IBERDROLA`, `NETFLIX`).
  - Tarjeta o cuenta bancaria origen.
  - Rango de importes.
- **Acciones de la regla:** Asignar automáticamente a Persona A, Persona B o Ambos (con split definido) y asignar categoría.
- **Reversibilidad total:** Cualquier gasto (incluso asignado automáticamente por regla o IA) se puede **reasignar manualmente** en cualquier momento.

## 4. Bandeja de Validación de Auto-Asignaciones
- Apartado específico en la app para auditar los gastos que entraron y se asignaron automáticamente por regla o IA.
- Permite a la pareja hacer un repaso rápido ("Validar todo" o modificar alguno con 1 clic si en esa ocasión fue un gasto especial).
