# Requisitos Funcionales, UX, Estilo Visual Fintonic y Compatibilidad Multiplataforma

## 1. Identidad Visual & Estilo de Gráficos (Estilo Fintonic)
- **Paleta de Color Fintech Moderna:**
  - Fondos limpios y modernos (Dark Navy / Gris Pizarra pulido y Blanco/Off-White luminoso).
  - Acentos vibrantes: Verde menta / esmeralda (`#00D09C` / `#10B981`) para balances positivos/ahorro, coral/rosa suave para gastos, y tonos pastel para cada categoría.
  - Tarjetas redondeadas (`rounded-2xl`), sombras suaves, micro-interacciones fluidas y tipografía moderna y legible.
- **Gráficos y Visualización Estilo Fintonic:**
  - **Gráfico Donut Interactivo Central:** Gráfico circular con anillo multicolor de distribución de gastos por categoría, mostrando en el centro el importe total mensual o el saldo neto conjunto.
  - **Gráfico de Evolución / Tendencia (Smooth Spline / Area Chart):** Curva suave con gradiente para comparar el gasto acumulado del mes vs mes anterior / presupuesto.
  - **Medidor Visual de Balance / Reparto:** Barra o indicador radial que muestra de un vistazo la proporción aportada por Persona A vs Persona B.
  - **Librería de Gráficos:** **Recharts** / **Tremor** / **Chart.js** integrada con Tailwind CSS para renderizado ultra-rápido en móvil y escritorio.

## 2. Compatibilidad Estricta Multiplataforma (iOS Safari & PC Chrome/Edge)
- **Paridad Total de Funcionalidades:** La aplicación debe funcionar con exactamente el mismo comportamiento, lógica y datos en:
  - **iOS Mobile:** WebApp / PWA en Safari (añadida a pantalla de inicio, soporte de `safe-area-inset` para el notch/isla dinámica, gráficos táctiles interactivos).
  - **PC Desktop:** Chrome, Edge y navegadores Chromium (optimizado para pruebas locales con servidor de desarrollo en tiempo real, responsive adaptable, tooltips en gráficos al pasar el ratón).

## 3. Titularidad y Asignación de Cuentas / Tarjetas
- Al vincular o registrar cualquier cuenta bancaria o tarjeta, se define su **propiedad**:
  - **Persona A** (Cuenta/tarjeta personal de A).
  - **Persona B** (Cuenta/tarjeta personal de B).
  - **Ambos (Común / Conjunta)** (Cuenta/tarjeta compartida por ambos).

## 4. Backlog Personalizado de Movimientos Sin Asignar (Inbox de Gastos Inteligente)
- **Filtrado de Backlog por Usuario Conectado:**
  - Cuando **Persona A** entra a la app, su backlog de movimientos a categorizar/asignar contiene:
    1. Los movimientos de **sus cuentas/tarjetas personales (Persona A)** pendientes.
    2. Los movimientos de las **cuentas/tarjetas comunes (Ambos)** que **ninguno de los dos haya catalogado todavía**.
  - Cuando **Persona B** entra a la app, ve sus tarjetas personales + las comunes que aún no hayan sido catalogadas por A.
  - En cuanto cualquiera de los dos cataloga un movimiento de la tarjeta común, este sale inmediatamente del backlog de ambos (sin duplicar trabajo).
- **Triage Rápido (1 toque / clic):**
  - Botones directos para asignar a **Persona A**, **Persona B** o **Ambos (Conjunto con split 50/50 o configurable)**.

## 5. Añadir Gasto Manual / Pagos en Efectivo / Traspaso de Saldo Inicial
- **Modal "Añadir Gasto Manual":**
  - Permite registrar gastos que no provienen de un banco conectado:
    - Pagos en efectivo (Cash).
    - Gastos omitidos o de cuentas no conectadas.
    - **Punto de situación / Ajuste inicial:** Permite registrar un gasto o saldo inicial para traspasar deudas/histórico de su sistema anterior directamente a la nueva app.
  - Campos: Importe, Concepto, Fecha, Pagado por (Persona A / Persona B), Tipo (Personal A / Personal B / Conjunto con split), Categoría, Método (Efectivo / Transferencia / Tarjeta no vinculada).

## 6. Motor de Categorización Inteligente con IA y Aprendizaje Continuo (Feedback Loop)
- **Clasificación Inicial por IA:**
  - Modelo ligero/rápido de categorización que sugiere la categoría correspondiente a partir del concepto del extracto bancario (ej. "Iberdrola" -> Facturas/Luz).
- **Aprendizaje Activo por Corrección del Usuario:**
  - Cuando el usuario cambia manualmente una categoría (ej. mueve una factura de "Luz" a "Gastos Vivienda"), el sistema guarda inmediatamente esa preferencia y patrón.
  - Para los futuros movimientos con ese mismo concepto o comercio, el sistema aplica automáticamente la categoría corregida por el usuario con máxima prioridad.
- **Categorización 100% editable:** Cualquier categoría asignada puede cambiarse en cualquier momento con un clic.

## 7. Motor de Reglas Configurables
- Los usuarios pueden crear y editar reglas automáticas basadas en texto del comercio, cuenta bancaria origen o importe.
- **Reversibilidad total:** Cualquier gasto (incluso asignado automáticamente por regla o IA) se puede **reasignar manualmente** en cualquier momento.

## 8. Bandeja de Validación de Auto-Asignaciones
- Apartado específico en la app para auditar los gastos que entraron y se asignaron automáticamente por regla o IA.
