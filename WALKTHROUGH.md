# Guía de Usuario Final y Walkthrough
**FitDuo - Cuenta Conjunta (Estilo Fintonic)**

Bienvenido a **Cuenta Conjunta**, la aplicación diseñada específicamente para gestionar las finanzas de pareja de forma transparente, equitativa y sin fricciones.

---

## 1. Instalación y Acceso Cross-Platform

### 📱 En iOS (iPhone / iPad - Safari)
1. Abre Safari y navega a la URL de la aplicación.
2. Toca el botón **Compartir** (icono de cuadrado con flecha hacia arriba) en la barra inferior de Safari.
3. Desplázate hacia abajo y selecciona **"Añadir a pantalla de inicio"**.
4. Pulsa **Añadir**. Ahora tendrás el icono de FitDuo en tu pantalla como una app nativa, con navegación a pantalla completa, soporte de Dynamic Island / Notch y gestos táctiles fluidos.

### 💻 En PC / Mac (Google Chrome, Microsoft Edge, Safari)
1. Accede directamente a la URL desde tu navegador favorito.
2. Si lo deseas, puedes hacer clic en el icono de instalación en la barra de direcciones de Chrome/Edge para instalarla como aplicación de escritorio independiente.
3. Disfruta de la barra lateral ergonómica plegable, atajos y visualizaciones en alta resolución.

---

## 2. Aislamiento de Perfiles y Seguridad por PIN

Para garantizar la privacidad de los gastos personales de cada miembro, el cambio de perfil está protegido por PIN individual de 6 dígitos:

- **Carlos:** PIN `608137`
- **Andrea:** PIN `050994`

### ¿Cómo cambiar de perfil?
1. Toca la píldora con tu nombre en la cabecera superior (móvil) o en la barra lateral (escritorio).
2. Introduce tu código PIN de 6 dígitos en el teclado seguro en pantalla.
3. Al desbloquear, verás tus gastos individuales y tu bandeja de triaje personalizada.

---

## 3. Navegación y Vistas Principales

### 🏠 1. Dashboard Principal (Fintonic)
Es la pantalla de inicio de la aplicación y resume todo lo que necesitas saber:
- **Gráfico Donut Interactivo:** Muestra la distribución de gastos conjuntos por categoría en el mes actual, con el importe total en el centro. Puedes tocar cualquier porción para ver el desglose.
- **Tarjeta de Balance en Vivo:** Indica en tiempo real la situación entre ambos (ej. *"Carlos debe 45,20 € a Andrea"* o *"¡Cuentas saldadas!"*).
- **Curva de Evolución Acumulada (Área):** Grafica el ritmo de gasto diario acumulado a lo largo del mes para comparar cómo avanza el presupuesto.
- **Gráfico de Evolución 12 Meses:** Muestra el histórico del gasto de los últimos 12 meses sin mezclar ingresos.
- **Inbox de Triaje Prioritario:** Presenta los movimientos bancarios recién llegados pendientes de clasificar. Con un solo toque en `[Carlos]`, `[Andrea]` o `[Ambos (50/50)]`, el gasto queda asignado y desaparece de la bandeja.

### 📊 2. Resumen Mensual
- Comparativa visual entre Ingresos y Gastos con barras proporcionales.
- Reparto exacto del 50% de los gastos conjuntos imputado a cada miembro.
- Filtrado interactivo: haz clic en cualquier categoría para filtrar la lista inferior al instante.

### 💳 3. Cuentas Bancarias y Tarjetas
- Lista de cuentas y tarjetas vinculadas (Bankinter, Revolut, etc.) con sus saldos actualizados.
- Asignación de titularidad de cada cuenta o tarjeta (Persona A, Persona B o Conjunta).

### 🏷️ 4. Categorías
- Catálogo personalizable de categorías con iconos, paleta de colores y grupos de frecuencia (Fijo, Variable, Ocio).
- Reasignación segura en cascada en caso de eliminar o fusionar categorías.

---

## 4. Registro de Gastos Manuales y Efectivo

Si realizas una compra en efectivo o un pago no bancario:
1. Pulsa el botón flotante verde **`+ Gasto`** o la opción en el menú.
2. Selecciona quién pagó el gasto (`Carlos` o `Andrea`).
3. Introduce el importe, fecha y descripción.
4. Elige el tipo de reparto:
   - **Común (50/50):** El importe se divide al 50% para el cálculo de deuda.
   - **100% Carlos** o **100% Andrea:** Gasto exclusivamente individual.
5. Pulsa **Guardar gasto**. El balance neto se actualizará en tiempo real.

---

## 5. Sincronización Bancaria Automática y Manual

FitDuo cuenta con sincronización bancaria multi-capa:
1. **Sincronización Desatendida:**
   - **Cada hora:** El worker de GitHub Actions (`bank-sync.yml`) consulta las transacciones bancarias.
   - **2 veces al día:** Vercel Cron ejecuta chequeos programados de madrugada (`03:00 UTC`) y a mediodía (`14:00 UTC`).
2. **Sincronización Manual en 1 Clic:**
   - Toca el botón verde **`Sync`** en la cabecera superior para actualizar inmediatamente las transacciones y saldos en vivo desde la base de datos.
3. **Reconciliación de Brechas (Catch-Up Gap Sync):**
   - Si la aplicación pasa varios días sin abrirse, el motor detecta la brecha temporal y descarga retrospectivamente hasta 90 días sin generar duplicados gracias al algoritmo de desduplicación SHA-256 (`tx_hash`).

---

## 6. Copias de Seguridad y Cero Pérdida de Datos

Tus datos están protegidos permanentemente:
- **Respaldo Continuo (PITR):** Supabase registra en tiempo real cada transacción en los logs WAL de PostgreSQL, permitiendo restaurar la base de datos a cualquier segundo exacto de los últimos 7 días.
- **Snapshots Nocturnos Verificados:** Todas las noches a las `02:00 UTC`, el sistema exporta una copia completa estructurada, calcula su firma digital criptográfica SHA-256 y la almacena de forma segura con retención de 90 días.
