# Desarrollo de EVO

Esta guía describe cómo trabajar sobre EVO Trust Layer sin depender de una instalación global de JavaScript ni de secretos dentro del frontend.

## 1. Arquitectura

- `index.html`: entrada raíz y redirección a la aplicación actual.
- `v1/`: frontend estático de EVO (wallet, checkout, Proofs, Passports, navegación e interfaces públicas).
- `supabase/functions/`: Edge Functions de autoridad, pagos, ciclo de vida y verificación.
- `supabase/migrations/`: cambios versionados de PostgreSQL/RLS/RPC.
- `tests/`: regresiones JavaScript y pruebas SQL/concurrencia.
- `security/`: threat model, auditoría y estado de migraciones.
- `docs/`: arquitectura, seguridad, estándares y verticales.

El frontend nunca debe contener `service_role`, claves privadas, seed phrases ni secretos de firma. La clave anon de Supabase puede estar en código cliente cuando las políticas RLS y los grants estén correctamente limitados; cualquier credencial privilegiada debe permanecer en el entorno de servidor/Edge Function.

## 2. Requisitos

Mínimos para frontend y pruebas JavaScript:

- Git.
- Node.js 20 o superior (CI usa Node 24).
- Un servidor HTTP local simple.

Para backend local y pruebas completas:

- Supabase CLI.
- Docker compatible con Supabase local.
- PostgreSQL client (`psql`) para ejecutar manualmente los fixtures SQL.

## 3. Clonar y seleccionar la rama

```bash
git clone https://github.com/lionelricca/evo-protocol.git
cd evo-protocol
git fetch --all --prune
git checkout codex/evo-v400-release-candidate
```

Mientras el PR #49 siga abierto, esta rama es la línea consolidada de release candidate. Cuando se fusione con autorización explícita, trabajar desde `main` actualizado y crear una rama nueva por cambio.

## 4. Ejecutar el frontend local

No hay build obligatorio: EVO es una aplicación web estática modular.

Linux/macOS:

```bash
python3 -m http.server 8000
```

Windows (Python Launcher):

```powershell
py -m http.server 8000
```

Abrir:

```text
http://localhost:8000/v1/
```

La carga del frontend funciona localmente, pero las Edge Functions endurecidas rechazan orígenes HTTP salvo localhost y sólo cuando el entorno del backend define explícitamente:

```text
EVO_ALLOW_LOCAL_ORIGINS=true
```

No habilitar esa opción en producción.

## 5. Pruebas JavaScript

No hay dependencias npm de runtime. `package.json` existe para estandarizar los comandos.

```bash
npm test
npm run test:security
npm run test:document
npm run test:service
npm run test:navigation
npm run test:release
```

Antes de enviar un PR, ejecutar como mínimo `npm run test:security` y la suite del área modificada.

## 6. Backend Supabase local

Inicializar el stack local según la versión actual de Supabase CLI:

```bash
supabase start
supabase db reset
```

Servir funciones localmente con un archivo de entorno que **no se versiona**:

```bash
supabase functions serve --env-file supabase/.env.local
```

Los nombres exactos de secretos dependen de cada función. Revisar `Deno.env.get(...)` dentro de la función que se va a ejecutar. No copiar valores productivos a commits, issues, capturas ni documentación pública.

Para desarrollo del CORS compartido se admiten, por configuración:

```text
EVO_ALLOWED_ORIGINS=https://dominio-produccion.example
EVO_ALLOW_LOCAL_ORIGINS=true
```

`EVO_ALLOWED_ORIGINS` debe contener solamente orígenes HTTPS confiables, separados por coma. En producción `EVO_ALLOW_LOCAL_ORIGINS` debe permanecer deshabilitado.

## 7. Migraciones

Reglas:

1. Crear una migración nueva; no reescribir una migración ya aplicada en producción.
2. Hacer cambios aditivos cuando sea posible.
3. Mantener RLS y grants mínimos.
4. Probar rollback lógico o comportamiento de error antes de desplegar.
5. Para operaciones económicas o de ownership, mantener atomicidad e idempotencia.
6. Actualizar el historial de migraciones/auditoría cuando corresponda.

Nunca ejecutar migraciones de producción sólo porque una prueba local pasa. La promoción a producción es un paso explícito y auditable.

## 8. Edge Functions

Toda función privilegiada debe:

- validar método y tamaño de payload;
- validar formatos antes de consultar/escribir;
- verificar firma, signer, mensaje, nonce/timestamp y estado actual cuando corresponda;
- usar CORS restringido para llamadas de navegador;
- fallar cerrado;
- aplicar rate limit/abuse bounds donde exista superficie pública;
- responder con `Cache-Control: no-store` cuando maneje datos sensibles o decisiones de autoridad;
- no devolver secretos ni detalles internos innecesarios.

El helper compartido actual está en `supabase/functions/_shared/evo-cors.ts`.

## 9. Flujo Git recomendado

```bash
git checkout main
git pull --ff-only
git checkout -b codex/evo-vXYZ-descripcion
```

Hacer cambios pequeños y verificables, ejecutar tests, subir la rama y abrir PR. No desarrollar directamente sobre `main`.

Antes de fusionar una entrega de seguridad:

- Security Gate verde.
- Suites Document Proof, Service Proof y navegación verdes si el cambio las afecta.
- revisión de diffs y migraciones;
- ninguna credencial nueva en el repositorio;
- estado de producción claramente separado del estado del código.

## 10. Publicación

El estado de un branch o PR **no implica** que sus Edge Functions o migraciones estén desplegadas. Registrar por separado:

- commit desplegado del frontend;
- funciones desplegadas y versión;
- migraciones aplicadas;
- variables de entorno/orígenes autorizados;
- plan de rollback.

Para un release de alta confianza todavía son obligatorios los gates detallados en `docs/SECURITY.md`, incluyendo protección de `main`, headers de seguridad servidos por infraestructura, revisión del CSP, pruebas E2E reales y revisión independiente.

## 11. Regla de producto

EVO puede afirmar registro, integridad criptográfica, firma, procedencia declarada y continuidad de evidencia según el nivel demostrado. No debe afirmar que un archivo, producto u objeto físico es auténtico o legalmente original sólo porque exista un registro EVO.
