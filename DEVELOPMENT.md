# Desarrollo de EVO

Esta guía describe cómo trabajar sobre EVO Protocol sin depender de una instalación global de JavaScript ni de secretos dentro del frontend.

## 1. Arquitectura

- `index.html`: entrada raíz y redirección a la aplicación actual.
- `v1/`: frontend estático de EVO (Origin, wallet, checkout, Proofs, Passports, navegación e interfaces públicas).
- `supabase/functions/`: Edge Functions de autoridad, pagos, ciclo de vida y verificación.
- `supabase/migrations/`: cambios versionados de PostgreSQL/RLS/RPC.
- `standards/`: contratos portables de evidencia e interoperabilidad.
- `schemas/`: contratos JSON públicos.
- `tests/`: regresiones JavaScript y pruebas SQL/concurrencia.
- `security/`: threat model, auditoría y estado de migraciones.
- `docs/`: arquitectura, seguridad, estándares, NFC y verticales.

El frontend nunca debe contener `service_role`, claves privadas, seed phrases ni secretos de firma. La clave pública/anon de Supabase puede estar en código cliente cuando RLS y grants estén correctamente limitados; cualquier credencial privilegiada debe permanecer en servidor/Edge Function.

## 2. Estado de ramas

`main` es siempre la base promovida del código.

Toda funcionalidad nueva debe nacer desde `main` actualizado en una rama independiente. No hardcodear una rama de desarrollo específica en esta guía porque queda obsoleta después de cada merge.

V4.1 prioriza:

- EVO Origin como entrada comercial por defecto;
- coherencia de producto entre frontend y autoridad server-side;
- carga determinística de módulos críticos;
- pruebas de integración sobre la cadena real del navegador;
- piloto NFC sin claves productivas.

No desarrollar directamente sobre `main`.

## 3. Requisitos

Mínimos para frontend y pruebas JavaScript:

- Git.
- Node.js 20 o superior (CI usa Node 24).
- Un servidor HTTP local simple.

Para backend local y pruebas completas:

- Supabase CLI.
- Docker compatible con Supabase local.
- PostgreSQL client (`psql`) para ejecutar manualmente fixtures SQL.

## 4. Clonar y crear una rama

```bash
git clone https://github.com/lionelricca/evo-protocol.git
cd evo-protocol
git fetch --all --prune
git checkout main
git pull --ff-only
git checkout -b codex/evo-vXYZ-descripcion
```

Para retomar una rama ya existente:

```bash
git fetch --all --prune
git checkout <nombre-de-rama>
```

## 5. Ejecutar el frontend local

No hay build obligatorio: EVO es una aplicación web estática modular.

Linux/macOS:

```bash
python3 -m http.server 8000
```

Windows:

```powershell
py -m http.server 8000
```

Abrir:

```text
http://localhost:8000/v1/
```

Las Edge Functions endurecidas rechazan orígenes HTTP salvo localhost y sólo cuando el entorno backend define explícitamente:

```text
EVO_ALLOW_LOCAL_ORIGINS=true
```

No habilitar esa opción en producción.

## 6. Pruebas JavaScript

No hay dependencias npm de runtime. `package.json` estandariza los comandos:

```bash
npm test
npm run test:security
npm run test:document
npm run test:service
npm run test:navigation
npm run test:release
npm run test:nfc
```

Antes de enviar un PR, ejecutar como mínimo `npm run test:security` y las suites de las áreas modificadas.

Las pruebas de integración deben comprobar la cadena de carga real del frontend, no solamente que los archivos existan en el repositorio.

## 7. Backend Supabase local

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

## 8. Migraciones

Reglas:

1. Crear una migración nueva; **no reescribir una migración ya aplicada en producción**.
2. Hacer cambios aditivos cuando sea posible.
3. Mantener RLS y grants mínimos.
4. Probar rollback lógico o comportamiento de error antes de desplegar.
5. Para operaciones económicas o de ownership, mantener atomicidad e idempotencia.
6. Actualizar el historial de migraciones/auditoría cuando corresponda.

Nunca ejecutar migraciones de producción sólo porque una prueba local pasa. La promoción a producción es un paso explícito y auditable.

## 9. Edge Functions

Toda función privilegiada debe:

- validar método y tamaño de payload;
- validar formatos antes de consultar/escribir;
- verificar firma, signer, mensaje, nonce/timestamp y estado actual cuando corresponda;
- usar CORS restringido para llamadas de navegador;
- fallar cerrado;
- aplicar rate limit/abuse bounds donde exista superficie pública;
- responder con `Cache-Control: no-store` cuando maneje datos sensibles o decisiones de autoridad;
- no devolver secretos ni detalles internos innecesarios.

El helper CORS compartido está en `supabase/functions/_shared/evo-cors.ts`.

## 10. Free Proof

El frontend y backend deben conservar la misma regla:

```text
1 Free Proof por usuario elegible
```

No debe mostrarse ni implementarse como “1 por wallet”. Crear otra wallet no reinicia el beneficio. La decisión de elegibilidad pertenece al control server-side y el navegador debe fallar cerrado si ese control no está disponible.

## 11. NFC de laboratorio

El piloto NFC se desarrolla sin claves productivas.

Reglas:

- no comprometer AES/master keys en GitHub;
- no almacenar secretos NFC en tablas/API públicas;
- usar claves de laboratorio separadas;
- validar primero vectores oficiales y replay/counter behavior;
- no desplegar `NFC CRYPTO VERIFIED` hasta que la comprobación criptográfica sea server-side;
- un QR o una URL copiada nunca debe elevar confianza física;
- el objeto público NFC nunca debe afirmar autenticidad física por sí solo.

Arquitectura y piloto:

- `docs/NFC_ARCHITECTURE.md`
- `docs/NFC_PILOT_V411.md`
- `standards/evo-nfc-proof-v411.mjs`
- `schemas/evo-nfc-proof-v1.schema.json`

## 12. Flujo Git recomendado

```bash
git checkout main
git pull --ff-only
git checkout -b codex/evo-vXYZ-descripcion
```

Hacer cambios pequeños y verificables, ejecutar tests, subir la rama y abrir PR.

Antes de fusionar una entrega:

- Security Gate verde;
- suites Document Proof, Service Proof y navegación verdes si el cambio las afecta;
- revisión de diffs y migraciones;
- ninguna credencial nueva en el repositorio;
- estado de producción claramente separado del estado del código.

## 13. Publicación

El estado de un branch o PR **no implica** que sus Edge Functions o migraciones estén desplegadas. Registrar por separado:

- commit desplegado del frontend;
- funciones desplegadas y versión;
- migraciones aplicadas;
- variables de entorno/orígenes autorizados;
- plan de rollback.

Para un release de alta confianza siguen siendo gates relevantes los detallados en `docs/SECURITY.md`, incluyendo protección de `main`, headers de seguridad servidos por infraestructura, revisión del CSP, pruebas E2E reales y revisión independiente.

## 14. Regla de producto

EVO puede afirmar registro, integridad criptográfica, firma, procedencia declarada y continuidad de evidencia según el nivel demostrado. No debe afirmar que un archivo, producto u objeto físico es auténtico o legalmente original sólo porque exista un registro EVO.
