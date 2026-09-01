# Protocolo de Pasos y Roadmap del Proyecto (FitDuo Versioning)

## Protocolo de Conversaciones
- **Al finalizar conversación**, el usuario dirá: `paso finalizado`.
  - Respuesta obligatoria: `El paso X ([Nombre/Titular del paso X]) está finalizado. El siguiente paso es el paso Y: [Nombre/Titular del paso Y].`
- **Al iniciar nueva conversación**, el usuario dirá: `inicia el siguiente paso`.
  - Respuesta obligatoria inicial: `Los pasos finalizados son estos: [lista con número y titular], el próximo paso es: [número y titular del paso].` A continuación, comenzar la ejecución autónoma de dicho paso.

---

## Lista de Pasos y Correspondencia de Versiones

- **Paso 1 (v0.1)**: **Reglas del Agente, Arquitectura, Estándar FitDuo y Repositorio Base** *(Completado)*
  - Configuración de `AGENTS.md`, `GEMINI.md`, repositorio Git remoto y hoja de ruta con protocolo de pasos.
  
- **Paso 2 (v0.2)**: **Setup de la Aplicación Next.js PWA & Sistema de Versión Visual**
  - Creación del proyecto Next.js (TypeScript, Tailwind CSS, Lucide icons), soporte PWA para móviles y componente de cabecera que muestra la versión actual en todo momento.

- **Paso 3 (v0.3)**: **Esquema de Base de Datos Supabase (PostgreSQL)**
  - Migraciones SQL: tablas `users`, `bank_connections`, `accounts`, `transactions`, `rules`, `category_learnings`, `categories` y `settlements` (con soporte para estados: `pending_assignment`, `auto_assigned`, `verified`), tipos TypeScript y cliente de conexión.

- **Paso 4 (v0.4)**: **Autenticación Multi-Usuario y Perfiles de Pareja**
  - Sistema de acceso seguro con Supabase Auth (Magic Link / Email) para los 2 miembros del hogar y vinculación de perfiles.

- **Paso 5 (v0.5)**: **Conector Open Banking (GoCardless PSD2 - Conexión Bancaria)**
  - Flujo de autenticación OAuth bancario oficial: selección de banco (BBVA, Santander, Revolut, etc.), redirección segura y registro de cuentas/tarjetas autorizadas.

- **Paso 6 (v0.6)**: **Motor de Sincronización Desatendida de Movimientos**
  - Endpoint de sincronización en segundo plano: descarga automática de transacciones, desduplicación mediante hashes y marcado de nuevos gastos en estado pendiente para triage.

- **Paso 7 (v0.7)**: **Motor de Categorización Inteligente con IA, Aprendizaje por Feedback y Reglas de Asignación**
  - Clasificador inteligente de categorías inicial, sistema de auto-aprendizaje cuando el usuario corrige una categoría para futuros movimientos, motor de reglas por comercio/cuenta y soporte de splits 50/50 o personalizados.

- **Paso 8 (v0.8)**: **Motor de Balances en Tiempo Real ("Quién debe a quién")**
  - Algoritmo de cálculo de saldos entre los miembros, historial de compensaciones y registro de pagos para saldar cuentas.

- **Paso 9 (v0.9)**: **Dashboard Principal: Inbox de Asignación Rápida, Validación de Reglas y Feed UI**
  - Interfaz de usuario PWA: Backlog de triage rápido al abrir la app (asignar a Persona A, Persona B o Ambos con 1 toque), selector rápido de categoría con auto-aprendizaje, bandeja de validación rápida de movimientos auto-asignados, balance en vivo y barras de presupuesto.

- **Paso 10 (v0.10)**: **Gestión de Bancos, Tarjetas, Editor de Reglas/Categorías y Monitor PSD2**
  - Panel de administración de cuentas/tarjetas, visualizador y editor de patrones aprendidos por IA/reglas, indicador de días restantes del permiso bancario y botón de re-autorización biométrica.

- **Paso 11 (v0.11)**: **Despliegue en Producción y Automatización de Cron Jobs**
  - Despliegue en Vercel, configuración del Cron Job nocturno/diario desatendido en la nube, verificación PWA en iOS/Android y entrega final.
