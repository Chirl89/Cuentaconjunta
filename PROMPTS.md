# Master Guide de Prompts Token-Optimized por Paso

Esta guía contiene la especificación técnica exacta, exhaustiva y compacta para cada paso. Cada prompt está diseñado para que el agente ejecute el trabajo de forma **100% autónoma**, sin dudas ni ambigüedades, ahorrando tokens de exploración.

En cada paso es obligatorio el ciclo:
**[Desarrollo Modular] ➔ [Refactorización Ahorro de Tokens] ➔ [Tests Unitarios + Regresión] ➔ [Cero Incidencias] ➔ [Commit Git]**.

---

### Paso 2 (v0.2): Setup Next.js PWA, Diseño Fintech Estilo Fintonic & Versión Visual
**Prompt:**
```text
inicia el siguiente paso:
1. Inicializa el proyecto base con Next.js 14+ (App Router, TypeScript, Tailwind CSS con paleta estilo Fintonic: fondos slate/navy, acentos menta #00D09C y coral, Lucide Icons y Recharts para visualizaciones).
2. Configura soporte PWA y compatibilidad cruzada estricta (iOS Safari con viewport dvh y safe-areas; PC Chrome/Edge con soporte de desarrollo ágil en vivo).
3. Implementa el componente global Header/VersionBadge que lee la versión directamente de version.json y la muestra visiblemente arriba.
4. Configura el entorno de testing (Vitest + Testing Library).
5. Refactor: Elimina archivos de ejemplo y boilerplate innecesario de Next.js para dejar el proyecto limpio y compacto.
6. Tests: Ejecuta tests unitarios del componente de versión y verificación de build. Resuelve cualquier error al vuelo.
7. Actualiza version.json a v0.2.0 y haz commit y push a Git.
```

---

### Paso 3 (v0.3): Esquema Supabase (PostgreSQL) y Tipos TypeScript
**Prompt:**
```text
inicia el siguiente paso:
1. Crea las migraciones SQL en Supabase para:
   - users (id, email, display_name, avatar_url, household_id).
   - bank_connections (id, user_id, institution_id, requisition_id, status, expires_at).
   - accounts (id, connection_id, user_id, gocardless_account_id, name, iban_mask, ownership: 'USER_A'|'USER_B'|'JOINT', balance).
   - transactions (id, account_id, user_id, tx_hash, amount, currency, description, booking_date, category_id, is_joint, split_ratio, status: 'pending_assignment'|'auto_assigned'|'verified', origin: 'bank'|'manual'|'cash'|'initial_balance', assigned_by).
   - categories (id, name, icon, color, monthly_budget).
   - category_learnings (id, household_id, merchant_pattern, category_id, updated_at).
   - rules (id, household_id, pattern, account_id, assign_to: 'USER_A'|'USER_B'|'JOINT', split_ratio, category_id, is_active).
   - settlements (id, household_id, payer_id, receiver_id, amount, date, notes).
2. Define los tipos TypeScript fuertemente tipados e inmutables (Database types) y el cliente Supabase singleton (server/client).
3. Tests: Tests unitarios de validación de tipos, esquemas e inserciones mockeadas (tanto transacciones bancarias como manuales). Cero regresiones.
4. Actualiza version.json a v0.3.0 y haz commit y push a Git.
```

---

### Paso 4 (v0.4): Autenticación Multi-Usuario y Perfiles de Pareja
**Prompt:**
```text
inicia el siguiente paso:
1. Implementa autenticación con Supabase Auth (Magic Link / Email).
2. Crea el sistema de vinculación de pareja (creación de Household y código de invitación para unir al segundo usuario).
3. Añade middleware de Next.js para protección de rutas privadas y gestión de sesiones ligeras.
4. Desarrolla la pantalla de login/registro minimalista con estética Fintech y selector de perfil (Persona A / Persona B).
5. Refactor: Centraliza hooks de sesión (useAuth, useHousehold) evitando re-renders y llamadas duplicadas.
6. Tests: Tests unitarios de middleware de auth, validación de códigos de pareja y redirecciones.
7. Actualiza version.json a v0.4.0 y haz commit y push a Git.
```

---

### Paso 5 (v0.5): Conector Open Banking (GoCardless PSD2) y Asignación de Titularidad
**Prompt:**
```text
inicia el siguiente paso:
1. Crea el servicio/cliente de GoCardless Bank Account Data API (gestión de access tokens, instituciones y requisitions).
2. Endpoints backend:
   - GET /api/bank/institutions: Lista bancos filtrados por país (España/Europa).
   - POST /api/bank/auth-link: Inicia el flujo OAuth oficial PSD2 y devuelve la URL del banco.
   - GET /api/bank/callback: Recibe el callback del banco, obtiene las cuentas/tarjetas asociadas y las guarda en la BD.
3. Interfaz modal de conexión: Tras autorizar el banco, solicita asignar la titularidad de cada cuenta/tarjeta descubierta ('Persona A', 'Persona B' o 'Ambos/Conjunta').
4. Tests: Tests unitarios con mocks de la API de GoCardless y flujo de callback.
5. Actualiza version.json a v0.5.0 y haz commit y push a Git.
```

---

### Paso 6 (v0.6): Motor de Sincronización Desatendida de Movimientos
**Prompt:**
```text
inicia el siguiente paso:
1. Desarrolla el endpoint backend POST /api/bank/sync:
   - Recorre las cuentas activas de GoCardless de ambos miembros.
   - Descarga transacciones recientes.
   - Calcula tx_hash (SHA-256 de account_id + booking_date + amount + description) para desduplicación estricta.
   - Inserta los nuevos movimientos en transactions con status = 'pending_assignment' y origin = 'bank'.
2. Soporte para ejecución manual con botón "Sincronizar ahora" y ejecución desatendida vía API key/Bearer token para crons.
3. Tests: Tests de desduplicación, tolerancia a fallos en respuestas bancarias y consistencia de datos.
4. Actualiza version.json a v0.6.0 y haz commit y push a Git.
```

---

### Paso 7 (v0.7): Motor de Categorización Inteligente con IA, Feedback Loop y Reglas
**Prompt:**
```text
inicia el siguiente paso:
1. Implementa el clasificador de categorías asistido por IA ligera: analiza el concepto del movimiento y sugiere la categoría inicial.
2. Implementa el Feedback Loop (Aprendizaje continuo):
   - Al editar manualmente la categoría de un gasto, guarda/actualiza el patrón en category_learnings.
   - Para movimientos futuros con el mismo concepto/comercio, prioriza automáticamente la categoría aprendida por el usuario sobre la IA.
3. Desarrolla el motor de reglas automáticas (coincidencia de texto, cuenta o importe) para asignar directamente a Persona A, Persona B o Ambos (split 50/50 o variable) y marcar status = 'auto_assigned'.
4. Reversibilidad: Todo gasto auto-asignado puede ser reasignado manualmente por el usuario en cualquier momento.
5. Tests: Tests unitarios de clasificación IA, auto-aprendizaje de categorías y aplicación de reglas.
6. Actualiza version.json a v0.7.0 y haz commit y push a Git.
```

---

### Paso 8 (v0.8): Motor Matemático de Balances, Liquidaciones y Ajustes Iniciales
**Prompt:**
```text
inicia el siguiente paso:
1. Desarrolla el motor de cálculo de balances compartidos:
   - Suma total de gastos marcados como conjuntos (bancarios y manuales/efectivo) pagados por Persona A vs Persona B.
   - Aplica porcentajes de reparto (50/50 por defecto o splits personalizados por gasto).
   - Deduce pagos de compensación registrados en settlements y ajustes iniciales de traspaso de saldo histórico.
   - Determina el saldo neto en tiempo real: "Persona A debe X € a Persona B" o "Cuentas saldadas".
2. Implementa endpoint y servicio para registrar liquidaciones/pagos ("Saldar deuda") y saldos iniciales de traspaso.
3. Tests: Suite exhaustiva de tests matemáticos con múltiples escenarios de gastos, tarjetas compartidas, pagos en efectivo, splits asimétricos y liquidaciones parciales/totales.
4. Actualiza version.json a v0.8.0 y haz commit y push a Git.
```

---

### Paso 9 (v0.9): Dashboard Principal Estilo Fintonic: Gráficos Donut/Área, Inbox Inteligente y Feed UI
**Prompt:**
```text
inicia el siguiente paso:
1. Desarrolla el Dashboard PWA con estética Fintonic (tarjetas redondeadas, gradientes sutiles, microinteracciones):
   - Gráfico Donut Central Interactivo (Recharts): Distribución de gasto por categoría con total gastado en el centro del anillo y desglose con porcentajes.
   - Gráfico de Área Suave: Evolución del gasto conjunto acumulado del mes.
   - Tarjeta de Balance Neto en vivo + botón rápido "Saldar cuentas".
   - Botón modal "Añadir Gasto Manual / Efectivo / Ajuste Inicial".
2. Inbox / Backlog Prioritario al abrir la app con filtrado inteligente:
   - Para Persona A: Muestra gastos de sus tarjetas personales pendientes + gastos de tarjetas comunes pendientes que ninguno haya catalogado.
   - Para Persona B: Muestra sus tarjetas personales pendientes + comunes pendientes.
   - Triage a 1 toque (botones táctiles en móvil / clics en escritorio): [Persona A] [Persona B] [Ambos (50/50)]. Al catalogar un gasto común, desaparece del backlog de ambos.
   - Selector de categoría con sugerencia IA/Aprendizaje integrado.
3. Bandeja de Validación de Auto-Asignados: Pestaña para revisar gastos asignados por regla/IA ("Validar todo" o editar puntualmente).
4. Feed histórico de movimientos con buscador, filtros por categoría y reasignación rápida.
5. Tests: Tests de renderizado de UI, gráficos interactivos, formulario de gasto manual y triage responsive.
6. Actualiza version.json a v0.9.0 y haz commit y push a Git.
```

---

### Paso 10 (v0.10): Gestión de Cuentas, Editor de Reglas/Categorías y Monitor PSD2
**Prompt:**
```text
inicia el siguiente paso:
1. Desarrolla el panel de administración de Cuentas y Tarjetas:
   - Selector visual para cambiar la titularidad de cualquier tarjeta/cuenta (Persona A / Persona B / Ambos).
   - Visualización de saldos y fecha de última sincronización.
2. Monitor de Consentimiento Bancario (PSD2):
   - Contador de días restantes de validez del consentimiento bancario (alerta visual si quedan < 15 días).
   - Botón de re-autorización biométrica directa con 1 toque.
3. Pantalla de Configuración de Reglas y Aprendizaje:
   - Editor de reglas personalizadas de asignación.
   - Visualizador y gestor de patrones de categorías aprendidos automáticamente por IA.
4. Tests: Tests unitarios de cálculo de expiración PSD2, cambio de titularidad y CRUD de reglas.
5. Actualiza version.json a v0.10.0 y haz commit y push a Git.
```

---

### Paso 11 (v0.11): Despliegue en Producción, Verificación Cross-Platform y Cron Automatizado
**Prompt:**
```text
inicia el siguiente paso:
1. Configura el despliegue en Vercel con variables de entorno de producción.
2. Configura Vercel Cron (o Supabase pg_cron) para ejecutar la sincronización desatendida /api/bank/sync de madrugada y a mediodía.
3. Ejecuta la suite completa de tests de regresión y unitarios de extremo a extremo (E2E / integración).
4. Verificación Cross-Platform y Estética Visual:
   - iOS: Instalación Safari PWA ("Añadir a pantalla de inicio"), safe-areas y gráficos táctiles interactivos.
   - PC: Chrome y Edge en local/producción con responsive fluido y ergonomía de escritorio.
5. Genera la documentación de usuario final y walkthrough de la aplicación.
6. Actualiza version.json a v0.11.0, realiza el commit final y push a la rama main.
```
