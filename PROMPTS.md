# Guía de Prompts Token-Optimized por Paso

Cada conversación se puede iniciar simplemente con el comando estándar: `inicia el siguiente paso` o enviando el prompt específico del paso.

En cada paso, el agente ejecutará de forma autónoma el ciclo:
**[Desarrollo Modular] ➔ [Refactorización para Ahorro de Tokens] ➔ [Tests Unitarios + Regresión] ➔ [Resolución Inmediata de Incidencias] ➔ [Commit Git]**.

---

### Paso 2 (v0.2): Setup Next.js PWA + Versión Global
**Prompt:**
> `inicia el siguiente paso: Configura el proyecto base en Next.js (App Router, TypeScript, Tailwind CSS, Lucide Icons) con soporte PWA. Implementa el componente global de cabecera que muestra la versión actual extraída de version.json. Refactoriza para eliminar boilerplate innecesario, corre tests unitarios/build y commitea.`

---

### Paso 3 (v0.3): Esquema Supabase (PostgreSQL) y Tipos
**Prompt:**
> `inicia el siguiente paso: Implementa el esquema SQL en Supabase para users, bank_connections, accounts, transactions, categories y settlements. Genera los tipos TypeScript limpios y el cliente modular de Supabase. Audita redundancias para ahorrar tokens, crea tests unitarios para las interfaces y asegura cero regresiones.`

---

### Paso 4 (v0.4): Auth Multi-Usuario y Pareja
**Prompt:**
> `inicia el siguiente paso: Desarrolla el módulo de autenticación seguro (Magic Link/Email con Supabase Auth) y vinculación de perfiles de pareja. Refactoriza el manejo de sesión para máxima ligereza, ejecuta tests de login/perfil y resuelve incidencias al vuelo.`

---

### Paso 5 (v0.5): Conector Open Banking (GoCardless PSD2)
**Prompt:**
> `inicia el siguiente paso: Integra GoCardless Bank Account Data API. Implementa el flujo OAuth de conexión bancaria, selección de entidades y captura segura de cuentas/tarjetas. Optimiza las llamadas API, añade tests unitarios/mocked para la integración y valida que no haya regresiones.`

---

### Paso 6 (v0.6): Sincronización Desatendida de Movimientos
**Prompt:**
> `inicia el siguiente paso: Construye el motor de sincronización desatendida en segundo plano para descargar movimientos bancarios, desduplicar por hash y persistir en Supabase. Limpia código repetido, ejecuta tests de sincronización y desduplicación, y soluciona cualquier fallo al instante.`

---

### Paso 7 (v0.7): Motor de Reglas Inteligentes y Splits
**Prompt:**
> `inicia el siguiente paso: Desarrolla el motor de reglas automáticas para clasificar gastos conjuntos vs personales y asignar categorías y porcentajes de reparto (50/50 o variables). Refactoriza la lógica para que sea extensible y compacta, corre tests unitarios de reglas y verifica integridad.`

---

### Paso 8 (v0.8): Motor de Balances y Liquidaciones
**Prompt:**
> `inicia el siguiente paso: Implementa el algoritmo de balance en tiempo real ("Quién debe a quién"), cálculo de saldos compensatorios y registro de liquidaciones. Optimiza cálculos en memoria, añade tests exhaustivos de balance y salda deudas, corrigiendo incidencias de inmediato.`

---

### Paso 9 (v0.9): Dashboard Principal y Feed UI (PWA)
**Prompt:**
> `inicia el siguiente paso: Crea el Dashboard PWA con tarjeta de balance en vivo, barras de presupuesto mensual por categoría, feed de transacciones y toggle rápido personal/conjunto. Refactoriza componentes para reutilización de estilos, verifica renderizado y tests de UI sin regresiones.`

---

### Paso 10 (v0.10): Gestión de Bancos y Monitor PSD2
**Prompt:**
> `inicia el siguiente paso: Desarrolla la pantalla de administración de cuentas/tarjetas y el monitor de consentimiento PSD2 (días restantes y re-autorización rápida). Simplifica la gestión de estado, añade tests de expiración de token y valida funcionamiento global.`

---

### Paso 11 (v0.11): Despliegue en Producción y Cron Automatizado
**Prompt:**
> `inicia el siguiente paso: Configura el despliegue en Vercel, programa el Cron Job desatendido para la sincronización diaria, ejecuta la suite completa de tests de regresión de extremo a extremo, verifica la PWA en móvil y prepara el release final v0.11.`
