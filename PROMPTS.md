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
> `inicia el siguiente paso: Implementa el esquema SQL en Supabase para users, bank_connections, accounts (con propiedad: A, B, Ambos), transactions, rules, category_learnings, categories y settlements con soporte de estados. Genera los tipos TypeScript limpios y el cliente modular de Supabase. Audita redundancias para ahorrar tokens, crea tests unitarios para las interfaces y asegura cero regresiones.`

---

### Paso 4 (v0.4): Auth Multi-Usuario y Pareja
**Prompt:**
> `inicia el siguiente paso: Desarrolla el módulo de autenticación seguro (Magic Link/Email con Supabase Auth) y vinculación de perfiles de pareja. Refactoriza el manejo de sesión para máxima ligereza, ejecuta tests de login/perfil y resuelve incidencias al vuelo.`

---

### Paso 5 (v0.5): Conector Open Banking (GoCardless PSD2) y Titularidad
**Prompt:**
> `inicia el siguiente paso: Integra GoCardless Bank Account Data API. Implementa el flujo OAuth de conexión bancaria, selección de entidades, captura segura de cuentas/tarjetas y diálogo de asignación de titularidad (Persona A, Persona B o Ambos). Optimiza las llamadas API, añade tests unitarios/mocked y valida que no haya regresiones.`

---

### Paso 6 (v0.6): Sincronización Desatendida de Movimientos
**Prompt:**
> `inicia el siguiente paso: Construye el motor de sincronización desatendida en segundo plano para descargar movimientos bancarios, desduplicar por hash y persistir nuevos movimientos en estado pendiente de triage asociados a la titularidad de su cuenta. Limpia código repetido, ejecuta tests de sincronización y desduplicación, y soluciona cualquier fallo al instante.`

---

### Paso 7 (v0.7): Motor de Categorización Inteligente con IA, Aprendizaje y Reglas
**Prompt:**
> `inicia el siguiente paso: Desarrolla el clasificador de categorías con IA ligera, el sistema de aprendizaje continuo basado en el feedback del usuario (memorización de reasignaciones para futuros movimientos del mismo comercio/concepto) y el motor de reglas automáticas de asignación conjunta/individual. Refactoriza para ligereza, corre tests unitarios de categorización y verifica cero regresiones.`

---

### Paso 8 (v0.8): Motor de Balances y Liquidaciones
**Prompt:**
> `inicia el siguiente paso: Implementa el algoritmo de balance en tiempo real ("Quién debe a quién"), cálculo de saldos compensatorios y registro de liquidaciones. Optimiza cálculos en memoria, añade tests exhaustivos de balance y salda deudas, corrigiendo incidencias de inmediato.`

---

### Paso 9 (v0.9): Dashboard Principal: Inbox Inteligente por Usuario, Validación y Feed UI
**Prompt:**
> `inicia el siguiente paso: Crea el Dashboard PWA con el Inbox inteligente filtrado por usuario (muestra gastos de tarjetas propias + comunes aún no catalogadas), selector de categoría con IA/aprendizaje, bandeja de validación rápida de movimientos auto-asignados, balance en vivo y barras de presupuesto. Refactoriza componentes para reutilización de estilos, verifica renderizado y tests de UI sin regresiones.`

---

### Paso 10 (v0.10): Gestión de Bancos, Titularidad de Tarjetas, Editor de Reglas/Categorías y Monitor PSD2
**Prompt:**
> `inicia el siguiente paso: Desarrolla la pantalla de administración de cuentas/tarjetas y selector de titularidad (A/B/Ambos), el editor de reglas y patrones aprendidos por IA, y el monitor de consentimiento PSD2 (días restantes y re-autorización rápida). Simplifica la gestión de estado, añade tests de expiración de token y valida funcionamiento global.`

---

### Paso 11 (v0.11): Despliegue en Producción y Cron Automatizado
**Prompt:**
> `inicia el siguiente paso: Configura el despliegue en Vercel, programa el Cron Job desatendido para la sincronización diaria, ejecuta la suite completa de tests de regresión de extremo a extremo, verifica la PWA en móvil y prepara el release final v0.11.`
