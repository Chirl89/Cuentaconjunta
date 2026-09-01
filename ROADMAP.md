# Protocolo de Pasos y Roadmap del Proyecto (FitDuo Versioning)

## Protocolo de Conversaciones
- **Fin de conversación**: El usuario enviará "paso finalizado".
  - Respuesta del agente: "el paso x está finalizado, siguiente paso, y".
- **Inicio de nueva conversación**: El usuario enviará "inicia el siguiente paso".
  - Respuesta del agente: "los pasos finalizados son estos: [lista], el próximo paso es: [nombre del paso]" (y comenzará la ejecución autónoma).

---

## Lista de Pasos y Correspondencia de Versiones

- **Paso 1 (v0.1)**: **Reglas, Arquitectura y Repositorio Base** *(Completado)*
  - Configuración de AGENTS.md, GEMINI.md, repositorio Git remoto y hoja de ruta con protocolo de pasos.
  
- **Paso 2 (v0.2)**: **Setup de la Aplicación Next.js PWA & Sistema de Versión Visual**
  - Creación del proyecto Next.js (TypeScript, Tailwind CSS, Lucide icons), soporte PWA para móviles y componente de cabecera que muestra la versión actual en todo momento.

- **Paso 3 (v0.3)**: **Esquema de Base de Datos Supabase (PostgreSQL)**
  - Migraciones SQL completas: tablas users, ank_connections, ccounts, 	ransactions, categories y settlements, con tipos TypeScript y cliente de conexión.

- **Paso 4 (v0.4)**: **Autenticación Multi-Usuario y Perfiles de Pareja**
  - Sistema de acceso seguro con Supabase Auth (Magic Link / Email) para los 2 miembros del hogar y vinculación de perfiles.

- **Paso 5 (v0.5)**: **Conector Open Banking (GoCardless PSD2 - Conexión Bancaria)**
  - Flujo de autenticación OAuth bancario oficial: selección de banco (BBVA, Santander, Revolut, etc.), redirección segura y registro de cuentas/tarjetas autorizadas.

- **Paso 6 (v0.6)**: **Motor de Sincronización Desatendida de Movimientos**
  - Endpoint de sincronización en segundo plano: descarga automática de transacciones, desduplicación mediante hashes y guardado en PostgreSQL.

- **Paso 7 (v0.7)**: **Motor de Reglas Inteligentes y Clasificación de Gastos**
  - Reglas de asignación automática de gastos (comercios conjuntos vs gastos personales, categorización y splits 50/50 o personalizados).

- **Paso 8 (v0.8)**: **Motor de Balances en Tiempo Real ("Quién debe a quién")**
  - Algoritmo de cálculo de saldos entre los miembros, historial de compensaciones y registro de pagos para saldar cuentas.

- **Paso 9 (v0.9)**: **Dashboard Principal y Feed de Transacciones (UI/PWA)**
  - Vistas principales de la app: Tarjeta de balance en vivo, barras de presupuesto mensual por categoría, listado interactivo de movimientos y cambio rápido de estado con un toque.

- **Paso 10 (v0.10)**: **Gestión de Bancos, Tarjetas y Monitor de Consentimiento PSD2**
  - Panel de administración de cuentas y tarjetas conectadas, indicador de días restantes del permiso bancario y botón de re-autorización biométrica.

- **Paso 11 (v0.11)**: **Despliegue en Producción y Automatización de Cron Jobs**
  - Despliegue en Vercel, configuración del Cron Job nocturno/diario desatendido en la nube, verificación PWA en iOS/Android y entrega final.
