# Requisitos Funcionales, UX, Detección de Traspasos, Nombres Reactivos y Estilo Fintonic

## 1. Nombres de Usuario Configurables y Reactividad en Tiempo Real
- **Personalización Inmediata:** Desde el primer momento (onboarding y ajustes), los nombres de ambos miembros (ej. "Carlos" y "Laura" en lugar de "Persona A" y "Persona B") son editables.
- **Sincronización Reactiva Multi-Ventana/Pestaña:** Al cambiar el nombre de un miembro en cualquier pantalla o pestaña, se propaga instantáneamente a todas las ventanas, botones de triage, tarjetas de balance, gráficos y cabeceras mediante estado reactivo global (React Context / Supabase Realtime / BroadcastChannel).

## 2. Detección Inteligente de Movimientos entre Cuentas (Traspasos y Bizums)
- **Traspaso Interno (Misma Persona):**
  - Transferencia entre dos cuentas/tarjetas pertenecientes a la misma persona (ej. de su cuenta BBVA a su Revolut).
  - **Comportamiento:** Se detecta automáticamente y se marca como movimiento neutro interno (no entra al presupuesto ni afecta a los balances ni al inbox de gastos conjuntos).
- **Traspaso / Pago entre Miembros de la Pareja:**
  - Transferencia o Bizum de Persona A a Persona B (o viceversa).
  - **Comportamiento:** Se categoriza automáticamente como **"Traspaso / Liquidación"**, se vincula al motor de balances y cuenta directamente como un abono para saldar deuda entre ambos.

## 3. Identidad Visual & Estilo de Gráficos (Estilo Fintonic)
- **Paleta de Color Fintech Moderna:**
  - Fondos limpios y modernos (Dark Navy / Gris Pizarra pulido y Blanco luminoso).
  - Acentos vibrantes: Verde menta / esmeralda (`#00D09C` / `#10B981`), coral para gastos y paleta pastel por categoría.
  - Tarjetas redondeadas (`rounded-2xl`), sombras suaves y micro-interacciones fluidas.
- **Gráficos Estilo Fintonic:**
  - **Gráfico Donut Interactivo Central (Recharts):** Distribución por categoría con total o balance en el centro del anillo.
  - **Gráfico de Evolución / Tendencia (Area Chart):** Curva suave con gradiente para comparar gasto vs presupuesto.
  - **Medidor Visual de Balance / Reparto:** Proporción aportada por cada miembro.

## 4. Compatibilidad Estricta Multiplataforma (iOS Safari & PC Chrome/Edge)
- **iOS Mobile:** WebApp / PWA en Safari (safe-areas, gestos táctiles, altura dinámica `dvh`).
- **PC Desktop:** Chrome/Edge (optimizado para desarrollo y pruebas en vivo, layout adaptativo).

## 5. Titularidad de Cuentas y Backlog Inteligente
- Configuración de titularidad de cada cuenta/tarjeta: Persona A, Persona B o Ambos.
- **Backlog por Usuario:** Persona A ve sus tarjetas personales + las comunes que B aún no haya catalogado (y viceversa para B).

## 6. Gastos Manuales, Pagos en Efectivo y Saldo Inicial
- Modal para registrar compras en efectivo, gastos fuera de banco o registrar el saldo inicial de traspaso de su sistema anterior.

## 7. Categorización con IA Ligera, Aprendizaje Activo (Feedback Loop) y Reglas
- Clasificación IA inicial + memorización automática cuando el usuario reasigna categorías para aplicarla a futuros gastos del mismo comercio.
- Reglas personalizadas configurables y reversibilidad total.

## 8. Bandeja de Validación de Auto-Asignaciones
- Apartado dedicado para validar con 1 clic los gastos asignados por regla/IA.

## 9. Reconciliación y Recuperación de Movimientos Perdidos (Catch-Up & Gap Sync)
- **Detección Automática de Brechas Temporales:** Al abrir la aplicación en primer plano, al recuperar la conexión a internet tras modo offline o tras renovar credenciales bancarias caducadas (PSD2), el sistema compara la fecha del último movimiento registrado con la fecha actual.
- **Sincronización Retrospectiva ("Catch-Up"):** Si existe un periodo sin sincronizar, el conector consulta a la API bancaria retrospectivamente (abarcando hasta 90 días atrás, límite estándar PSD2) para descargar cualquier movimiento producido durante la desconexión o desactualización.
- **Consolidación Idempotente y Anti-Duplicados:**
  - Cada movimiento bancario se identifica unívocamente mediante un hash criptográfico SHA-256 (`tx_hash`) basado en cuenta, fecha, importe y concepto.
  - Inserciones idempotentes en base de datos (`ON CONFLICT DO NOTHING`) que garantizan cero duplicados sin importar cuántas veces se ejecute la reconciliación.
- **Conciliación Inteligente con Gastos Manuales Creados Offline:**
  - Si durante el corte de red o credenciales el usuario registró un gasto manual con datos coincidentes (mismo importe, fecha aproximada ±48h y cuenta), el sistema ofrece o asocia automáticamente dicho gasto al movimiento bancario oficial, evitando computar dos veces el mismo gasto.

## 10. Respaldo Seguro y Recuperación de Información Multi-Capa (Cloud & Local)
- **Capa 1: Respaldo Automatizado Continuo en la Nube (Cloud Snapshot & PITR)**
  - Base de datos PostgreSQL en Supabase protegida con Point-in-Time Recovery (PITR) y backups diarios automáticos gestionados.
  - Job programado desatendido (cron diario/nocturno) que genera un volcado cifrado y versionado de la base de datos a almacenamiento redundante seguro en la nube (Supabase Storage / Cloud Object Storage con cifrado en reposo).
- **Capa 2: Respaldo y Restauración Controlada por el Usuario (Export/Import Local)**
  - Desde la sección de Ajustes, el usuario puede descargar con 1 clic una **Copia de Seguridad Completa** en formato JSON estructurado / CSV cifrado que incluye: gastos manuales, clasificaciones, reglas aprendidas por IA, liquidaciones de deuda y saldos históricos.
  - Funcionalidad de **Restaurar Copia de Seguridad**: Permite restablecer los datos en caso de contingencia o migración mediante carga de archivo con validación previa de integridad de esquema.
- **Monitor de Expiración de Credenciales Bancarias (PSD2 Alert):**
  - Monitor proactivo en Ajustes con indicador visual de días de validez restante de las credenciales bancarias.
  - Alerta preventiva (a falta de 15 días) y botón de re-autorización en 1 toque que dispara inmediatamente el proceso de reconciliación retrospectiva (Catch-Up Sync).
