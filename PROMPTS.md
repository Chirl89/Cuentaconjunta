# Master Guide de Prompts Token-Optimized por Paso

Esta guía contiene la especificación técnica exacta, exhaustiva y compacta para cada paso. Cada prompt está diseñado para que el agente ejecute el trabajo de forma **100% autónoma**, sin dudas ni ambigüedades, ahorrando tokens de exploración.

En cada paso es obligatorio el ciclo:
**[Desarrollo Modular] ➔ [Refactorización Ahorro de Tokens] ➔ [Tests Unitarios + Regresión] ➔ [Cero Incidencias] ➔ [Commit Git]**.

---

### Paso 2 (v0.2): Setup Next.js PWA, Diseño Fintech Fintonic, Contexto de Nombres Reactivos & Versión
**Prompt:**
```text
inicia el siguiente paso:
1. Inicializa el proyecto base con Next.js 14+ (App Router, TypeScript, Tailwind CSS con paleta estilo Fintonic: fondos slate/navy, acentos menta #00D09C y coral, Lucide Icons y Recharts para visualizaciones).
2. Configura contexto global reactivo para nombres de usuario (con soporte de sincronización multi-ventana en tiempo real y fallback a 'Persona A'/'Persona B').
3. Configura soporte PWA y compatibilidad cruzada estricta (iOS Safari con viewport dvh y safe-areas; PC Chrome/Edge con soporte de desarrollo ágil en vivo).
4. Implementa el componente global Header/VersionBadge que lee la versión directamente de version.json y la muestra visiblemente arriba.
5. Configura el entorno de testing (Vitest + Testing Library).
6. Refactor: Elimina archivos de ejemplo y boilerplate innecesario de Next.js para dejar el proyecto limpio y compacto.
7. Tests: Tests unitarios del contexto reactivo de nombres, componente de versión y verificación de build.
8. Actualiza version.json a v0.2.0 y haz commit y push a Git.
```

---

### Paso 3 (v0.3): Esquema Supabase (PostgreSQL) con Tipos y Traspasos
**Prompt:**
```text
inicia el siguiente paso:
1. Crea las migraciones SQL en Supabase para:
   - users (id, email, display_name, avatar_url, household_id).
   - households (id, name, member_a_name, member_b_name).
   - bank_connections (id, user_id, institution_id, requisition_id, status, expires_at).
   - accounts (id, connection_id, user_id, gocardless_account_id, name, iban_mask, ownership: 'USER_A'|'USER_B'|'JOINT', balance).
   - transactions (id, account_id, user_id, tx_hash, amount, currency, description, booking_date, category_id, is_joint, split_ratio, status: 'pending_assignment'|'auto_assigned'|'verified'|'neutral_transfer', origin: 'bank'|'manual'|'cash'|'transfer_internal'|'transfer_settlement'|'initial_balance', assigned_by).
   - categories (id, name, icon, color, is_system: boolean, monthly_budget).
   - category_learnings (id, household_id, merchant_pattern, category_id, updated_at).
   - rules (id, household_id, pattern, account_id, assign_to: 'USER_A'|'USER_B'|'JOINT', split_ratio, category_id, is_active).
   - settlements (id, household_id, payer_id, receiver_id, amount, date, notes).
2. Define los tipos TypeScript fuertemente tipados e inmutables (Database types) y el cliente Supabase singleton (server/client).
3. Tests: Tests unitarios de validación de tipos, esquemas e inserciones mockeadas (gastos, traspasos y nombres). Cero regresiones.
4. Actualiza version.json a v0.3.0 y haz commit y push a Git.
```

---

### Paso 4 (v0.4): Autenticación Multi-Usuario, Nombres Personalizables y Perfiles
**Prompt:**
```text
inicia el siguiente paso:
1. Implementa autenticación con Supabase Auth (Magic Link / Email).
2. Crea el sistema de vinculación de pareja (creación de Household, configuración inicial de nombres y código de invitación).
3. Añade middleware de Next.js para protección de rutas privadas y gestión de sesiones ligeras.
4. Desarrolla el gestor de perfiles con sincronización en tiempo real de los nombres de usuario en todas las ventanas abiertas.
5. Refactor: Centraliza hooks de sesión (useAuth, useHousehold, useUserNames) evitando re-renders y llamadas duplicadas.
6. Tests: Tests unitarios de middleware de auth, propagación de nombres y redirecciones.
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
3. Interfaz modal de conexión con nombres personalizados: Tras autorizar el banco, solicita asignar la titularidad de cada cuenta/tarjeta descubierta ('Nombre A', 'Nombre B' o 'Ambos/Conjunta').
4. Tests: Tests unitarios con mocks de la API de GoCardless y flujo de callback.
5. Actualiza version.json a v0.5.0 y haz commit y push a Git.
```

---

### Paso 6 (v0.6): Motor de Sincronización y Detector de Traspasos Internos vs Entre Pareja
**Prompt:**
```text
inicia el siguiente paso:
1. Desarrolla el endpoint backend POST /api/bank/sync:
   - Recorre las cuentas activas de GoCardless de ambos miembros.
   - Descarga transacciones recientes y calcula tx_hash (SHA-256) para desduplicación.
2. Motor de Detección de Traspasos:
   - Traspaso Interno (Misma Persona): Si el movimiento es entre dos cuentas de la misma persona, márcalo como origin = 'transfer_internal' y status = 'neutral_transfer' (oculto de gastos/deudas).
   - Traspaso Entre Pareja: Si es una transferencia/Bizum entre Persona A y Persona B, asígnalo a category = 'Traspaso' y origin = 'transfer_settlement' para computar como abono de saldo directo.
   - Otros gastos: Inserción normal con status = 'pending_assignment'.
3. Tests: Tests de detección de transferencias propias (neutras), transferencias entre miembros y desduplicación.
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
3. Desarrolla el motor de reglas automáticas (coincidencia de texto, cuenta o importe) para asignar directamente a Nombre A, Nombre B o Ambos (split 50/50 o variable) y marcar status = 'auto_assigned'.
4. Reversibilidad: Todo gasto auto-asignado puede ser reasignado manualmente por el usuario en cualquier momento.
5. Tests: Tests unitarios de clasificación IA, auto-aprendizaje de categorías y aplicación de reglas.
6. Actualiza version.json a v0.7.0 y haz commit y push a Git.
```

---

### Paso 8 (v0.8): Motor Matemático de Balances, Liquidaciones y Absorción de Traspasos
**Prompt:**
```text
inicia el siguiente paso:
1. Desarrolla el motor de cálculo de balances compartidos:
   - Suma total de gastos marcados como conjuntos (bancarios y manuales/efectivo) pagados por Nombre A vs Nombre B.
   - Aplica porcentajes de reparto (50/50 por defecto o splits personalizados).
   - Absorbe automáticamente los movimientos de transfer_settlement (Bizums/traspasos entre miembros) y registros en settlements como pagos de deuda directos.
   - Suma ajustes iniciales de traspaso de saldo histórico.
   - Determina el saldo neto en tiempo real con nombres dinámicos: "[Nombre A] debe X € a [Nombre B]" o "Cuentas saldadas".
2. Tests: Suite exhaustiva de tests matemáticos con múltiples escenarios de gastos conjuntos, transferencias cruzadas, pagos en efectivo y liquidaciones.
3. Actualiza version.json a v0.8.0 y haz commit y push a Git.
```

---

### Paso 9 (v0.9): Dashboard Principal Estilo Fintonic: Nombres Reactivos, Gráfico Donut, Inbox y Feed
**Prompt:**
```text
inicia el siguiente paso:
1. Desarrolla el Dashboard PWA con estética Fintonic y nombres de usuario 100% dinámicos:
   - Gráfico Donut Central Interactivo (Recharts): Distribución de gasto por categoría con total en el centro.
   - Gráfico de Área Suave: Evolución del gasto conjunto acumulado del mes.
   - Tarjeta de Balance Neto en vivo con los nombres reales de la pareja + botón rápido "Saldar cuentas".
   - Botón modal "Añadir Gasto Manual / Efectivo / Ajuste Inicial".
2. Inbox / Backlog Prioritario al abrir la app con filtrado inteligente y botones rotulados con los nombres reales:
   - Botones de triage: [[Nombre A]] [[Nombre B]] [Ambos (50/50)].
   - Desaparición reactiva inmediata al catalogar un gasto común.
   - Selector de categoría con sugerencia IA/Aprendizaje integrado.
3. Bandeja de Validación de Auto-Asignados: Pestaña para revisar gastos asignados por regla/IA ("Validar todo" o editar puntualmente).
4. Feed histórico de movimientos con buscador, filtros y reasignación rápida.
5. Tests: Tests de renderizado de UI, reactividad de nombres en tiempo real, gráficos y triage responsive.
6. Actualiza version.json a v0.9.0 y haz commit y push a Git.
```

---

### Paso 10 (v0.10): Gestión de Cuentas, Editor de Nombres/Reglas/Categorías y Monitor PSD2
**Prompt:**
```text
inicia el siguiente paso:
1. Desarrolla el panel de configuración:
   - Edición de nombres de los miembros del hogar con propagación instantánea a todas las vistas y pestañas abiertas.
   - Panel de administración de cuentas/tarjetas y selector de titularidad ([Nombre A] / [Nombre B] / Ambos).
   - Visualización de saldos y fecha de última sincronización.
2. Monitor de Consentimiento Bancario (PSD2):
   - Contador de días restantes de validez del consentimiento bancario (alerta visual si quedan < 15 días).
   - Botón de re-autorización biométrica directa con 1 toque.
3. Editor de reglas y gestor de patrones aprendidos por IA.
4. Tests: Tests unitarios de cambio reactivo de nombres, cálculo de expiración PSD2 y CRUD de reglas.
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
4. Verificación Cross-Platform y Reactividad de Nombres:
   - iOS: Instalación Safari PWA ("Añadir a pantalla de inicio"), safe-areas y gráficos táctiles.
   - PC: Chrome y Edge en local/producción con responsive fluido y ergonomía de escritorio.
5. Genera la documentación de usuario final y walkthrough de la aplicación.
6. Actualiza version.json a v0.11.0, realiza el commit final y push a la rama main.
```
