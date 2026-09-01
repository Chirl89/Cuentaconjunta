# Requisitos Funcionales y UX: Flujo de Asignación, Titularidad de Cuentas, Reglas e IA

## 1. Titularidad y Asignación de Cuentas / Tarjetas
- Al vincular o registrar cualquier cuenta bancaria o tarjeta, se define su **propiedad**:
  - **Persona A** (Cuenta/tarjeta personal de A).
  - **Persona B** (Cuenta/tarjeta personal de B).
  - **Ambos (Común / Conjunta)** (Cuenta/tarjeta compartida por ambos).

## 2. Backlog Personalizado de Movimientos Sin Asignar (Inbox de Gastos Inteligente)
- **Filtrado de Backlog por Usuario Conectado:**
  - Cuando **Persona A** entra a la app, su backlog de movimientos a categorizar/asignar contiene:
    1. Los movimientos de **sus cuentas/tarjetas personales (Persona A)** pendientes.
    2. Los movimientos de las **cuentas/tarjetas comunes (Ambos)** que **ninguno de los dos haya catalogado todavía**.
  - Cuando **Persona B** entra a la app, ve sus tarjetas personales + las comunes que aún no hayan sido catalogadas por A.
  - En cuanto cualquiera de los dos cataloga un movimiento de la tarjeta común, este sale inmediatamente del backlog de ambos (sin duplicar trabajo).
- **Triage Rápido (1 toque):**
  - Botones directos para asignar a **Persona A**, **Persona B** o **Ambos (Conjunto con split 50/50 o configurable)**.

## 3. Motor de Categorización Inteligente con IA y Aprendizaje Continuo (Feedback Loop)
- **Clasificación Inicial por IA:**
  - Modelo ligero/rápido de categorización (vía modelo semántico / Gemini Flash API ultraligera o clasificador NLP) que sugiere la categoría correspondiente a partir del concepto del extracto bancario (ej. "Iberdrola" -> Facturas/Luz).
- **Aprendizaje Activo por Corrección del Usuario:**
  - Cuando el usuario cambia manualmente una categoría (ej. mueve una factura de "Luz" a "Gastos Vivienda"), el sistema guarda inmediatamente esa preferencia y patrón.
  - Para los futuros movimientos con ese mismo concepto o comercio, el sistema aplica automáticamente la categoría corregida por el usuario con máxima prioridad.
- **Categorización 100% editable:** Cualquier categoría asignada puede cambiarse en cualquier momento con un clic.

## 4. Motor de Reglas Configurables
- Los usuarios pueden crear y editar reglas automáticas basadas en:
  - Texto del comercio / descripción (ej. `MERCADONA`, `IBERDROLA`, `NETFLIX`).
  - Tarjeta o cuenta bancaria origen.
  - Rango de importes.
- **Acciones de la regla:** Asignar automáticamente a Persona A, Persona B o Ambos (con split definido) y asignar categoría.
- **Reversibilidad total:** Cualquier gasto (incluso asignado automáticamente por regla o IA) se puede **reasignar manualmente** en cualquier momento.

## 5. Bandeja de Validación de Auto-Asignaciones
- Apartado específico en la app para auditar los gastos que entraron y se asignaron automáticamente por regla o IA.
- Permite a la pareja hacer un repaso rápido ("Validar todo" o modificar alguno con 1 clic si en esa ocasión fue un gasto especial).
