# Política de Respaldo Continuo en la Nube y Point-in-Time Recovery (PITR)
**FitDuo - Cuenta Conjunta**

Este documento detalla la arquitectura de alta disponibilidad, tolerancia a fallos y política de cero pérdida de datos implementada para la aplicación Cuenta Conjunta.

---

## 1. Arquitectura de Respaldo Multi-Capa

FitDuo emplea una estrategia de protección de datos en 3 niveles complementarios:

```
[Nivel 1: Tiempo Real]
  └─ Supabase PostgreSQL WAL (Write-Ahead Logging) Archiving
     └─ Point-in-Time Recovery (PITR) continuo a nivel de segundo

[Nivel 2: Nocturno / Desatendido]
  └─ GitHub Actions Workflow (.github/workflows/cloud-backup.yml)
     └─ Snapshot completo de tablas mediante scripts/cloud-backup.js
     └─ Verificación criptográfica SHA-256
     └─ Retención de 90 días en almacenamiento seguro de artefactos cifrados

[Nivel 3: Local / Desconexión]
  └─ Almacenamiento local redundante en el navegador del cliente (localStorage)
     └─ Reconciliación automática y Catch-Up Sync al recuperar conexión
```

---

## 2. Nivel 1: Supabase Point-in-Time Recovery (PITR)

### 2.1 Descripción
Point-in-Time Recovery (PITR) registra continuamente cada cambio que ocurre en la base de datos PostgreSQL utilizando registros WAL (Write-Ahead Logs) transmitidos en tiempo real al almacenamiento seguro de Supabase.

- **Ventana de retención activa:** 7 días (ampliable a 30 días en entornos de alta criticidad).
- **Granularidad de recuperación:** Precisión a nivel de segundo.
- **RPO (Recovery Point Objective):** < 1 minuto.
- **RTO (Recovery Time Objective):** < 15 minutos.

### 2.2 Activación y Gestión mediante Supabase CLI
Para verificar o activar la configuración de PITR en el proyecto:

```bash
# Iniciar sesión en Supabase CLI
npx supabase login

# Enlazar con el proyecto remoto
npx supabase link --project-ref egougygfqnnzfqpceggn

# Comprobar estado de copias y PITR
npx supabase backups list
```

### 2.3 Procedimiento de Restauración PITR
Si se produce un borrado accidental o corrupción lógica:
1. Acceder al panel de Supabase: `Database > Backups > Point-in-Time Recovery`.
2. Seleccionar la fecha y hora exacta deseada (UTC) anterior al incidente.
3. Hacer clic en **Restore to this point**. Supabase provisionará una instancia réplica sincronizada exactamente a ese instante.

---

## 3. Nivel 2: Snapshots Automatizados Cifrados y Verificación SHA-256

### 3.1 Script de Exportación (`scripts/cloud-backup.js`)
El script ejecuta una extracción estructurada de todas las tablas críticas:
- `households` (hogares y configuración de nombres)
- `users` (usuarios y roles)
- `bank_connections` (credenciales y consentimientos Open Banking)
- `accounts` (cuentas corrientes y tarjetas con su titularidad)
- `transactions` (movimientos bancarios y manuales con categoría y split)
- `categories` (catálogo y presupuestos)
- `category_learnings` (patrones aprendidos de IA)
- `rules` (reglas automáticas de asignación)
- `settlements` (liquidaciones de deuda ejecutadas)

### 3.2 Verificación Criptográfica de Integridad
Cada snapshot generado incluye un hash canónico SHA-256 calculado sobre los datos:
```bash
# Ejecutar backup manual
node scripts/cloud-backup.js

# Verificar la integridad del último snapshot
node scripts/cloud-backup.js --verify
```
Si cualquier byte ha sido alterado, la comprobación falla de forma inmediata.

### 3.3 Automatización Nocturna (GitHub Actions)
El workflow `.github/workflows/cloud-backup.yml` se ejecuta todas las noches a las `02:00 UTC` desatendido:
1. Extrae los datos actualizados de Supabase.
2. Calcula y valida el checksum SHA-256.
3. Guarda el archivo en `data/backups/`.
4. Sube el paquete como artefacto cifrado a la infraestructura de GitHub con 90 días de retención.

---

## 4. Nivel 3: Recuperación en Caso de Desconexión (Catch-Up Gap Sync)

Cuando la aplicación se ejecuta en el móvil (iOS Safari PWA) o en el navegador del PC (Chrome/Edge):
1. Los gastos manuales se guardan inmediatamente en caché local.
2. Al restablecer la conexión o abrir la app, el motor de sincronización reconcilia los últimos 90 días bancarios mediante hashes únicos de transacción (`tx_hash = SHA-256(iban + fecha + importe + concepto)`) para evitar duplicidades sin importar caídas de red.
3. Los gastos manuales con importe y fecha coincidente (±48h) con un movimiento bancario se consolidan automáticamente.

---

## 5. Tabla de Responsabilidades y Seguridad

| Parámetro | Configuración |
|---|---|
| **Cifrado en tránsito** | TLS 1.3 / HTTPS obligatorio |
| **Cifrado en reposo** | AES-256 nativo en Supabase Storage y PostgreSQL |
| **Protección contra inyección** | Supabase Row Level Security (RLS) |
| **Aislamiento de perfiles** | Bloqueo por PIN de 6 dígitos (Carlos / Andrea) |
| **Auditoría de integridad** | Checksums SHA-256 automáticos |
| **Frecuencia de sincronización bancaria** | Cada hora (`bank-sync.yml`) y 2 veces al día (`vercel.json`) |
| **Frecuencia de respaldo continuo** | WAL continuo + Snapshot diario a las 02:00 UTC |
