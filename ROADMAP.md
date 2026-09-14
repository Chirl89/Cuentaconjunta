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
  
- **Paso 2 (v0.2)**: **Setup Next.js PWA, Diseño Fintech Fintonic, Estado Global Reactivo de Nombres & Versión Visual** *(Completado)*
  - Creación del proyecto Next.js (TypeScript, Tailwind CSS con paleta Fintonic, Lucide icons, Recharts), contexto global reactivo para nombres configurables en tiempo real, soporte PWA cross-platform y componente de versión global.

- **Paso 3 (v0.3)**: **Esquema de Base de Datos Supabase (PostgreSQL) con Soporte de Traspasos**
  - Migraciones SQL: tablas `users`, `households`, `bank_connections`, `accounts` (titularidad: A, B, Ambos), `transactions` (origen: 'bank'|'manual'|'cash'|'transfer_internal'|'transfer_settlement'), `rules`, `category_learnings`, `categories` y `settlements`, tipos TypeScript y cliente de conexión.

- **Paso 4 (v0.4)**: **Autenticación Multi-Usuario, Perfiles de Pareja y Nombres Personalizables Reactivos**
  - Sistema de acceso seguro con Supabase Auth (Magic Link / Email), vinculación de perfiles de pareja y sincronización en tiempo real de nombres de usuario en todas las pestañas/ventanas.

- **Paso 5 (v0.5)**: **Conector Open Banking (GoCardless PSD2 - Conexión Bancaria y Titularidad de Cuentas)**
  - Flujo de autenticación OAuth bancario oficial: selección de banco, registro de cuentas/tarjetas y asignación de titularidad inicial (Persona A, Persona B o Ambos).

- **Paso 6 (v0.6)**: **Motor de Sincronización Desatendida y Detector de Traspasos Internos vs Entre Pareja**
  - Endpoint de sincronización: descarga de movimientos, desduplicación por hash SHA-256, detección automática de traspasos entre cuentas propias (movimientos neutros) y transferencias entre miembros de la pareja (categorizadas como 'Traspaso/Liquidación').

- **Paso 7 (v0.7)**: **Motor de Categorización Inteligente con IA, Aprendizaje por Feedback y Reglas de Asignación**
  - Clasificador inteligente de categorías inicial, sistema de auto-aprendizaje cuando el usuario corrige una categoría para futuros movimientos, motor de reglas por comercio/cuenta y soporte de splits 50/50 o personalizados.

- **Paso 8 (v0.8)**: **Motor de Balances en Tiempo Real ("Quién debe a quién"), Liquidaciones y Traspasos**
  - Algoritmo de cálculo de saldos entre los miembros, absorción automática de traspasos/Bizums entre miembros como abonos de deuda, historial de compensaciones y saldo inicial.

- **Paso 9 (v0.9)**: **Dashboard Principal Estilo Fintonic: Nombres Reactivos, Gráfico Donut, Inbox y Feed**
  - Interfaz PWA con nombres configurados en tiempo real: Gráfico donut interactivo con total central, Inbox de triage rápido filtrado por usuario con nombres dinámicos en los botones, modal de gasto manual, bandeja de validación y balance en vivo.

- **Paso 10 (v0.10)**: **Gestión de Cuentas, Edición de Nombres, Reglas/Categorías y Monitor PSD2**
  - Panel de administración: cambio de nombres de usuario con reflejo instantáneo en toda la app, reasignación de titularidad de cuentas/tarjetas, editor de reglas/patrones y monitor de consentimiento bancario.

- **Paso 11 (v0.11)**: **Despliegue en Producción, Verificación Cross-Platform y Automatización de Cron Jobs**
  - Despliegue en Vercel, configuración del Cron Job nocturno/diario desatendido en la nube, verificación visual en iOS (Safari PWA) y PC (Chrome/Edge) y entrega final.
