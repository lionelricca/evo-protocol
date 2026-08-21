# EVO V3.3.1 · Browser & Supply-Chain Shield

## Objetivo

V3.3.1 agrega una barrera de navegador delante de la aplicación EVO. No convierte la aplicación en “inhackeable”; reduce superficie de ataque, bloquea clases de ejecución no previstas y hace verificables varias decisiones de seguridad en CI.

## Content Security Policy actual

`v1/index.html` aplica una CSP por meta tag con estas reglas principales:

- `default-src 'self'`: deniega por defecto recursos no autorizados.
- `base-uri 'none'`: impide que un `<base>` inyectado cambie el destino de enlaces relativos.
- `object-src 'none'`: deshabilita plugins y objetos embebidos heredados.
- `script-src-attr 'none'`: bloquea JavaScript en atributos HTML como `onclick` y `onerror`.
- `script-src`: permite scripts locales y, de forma transitoria, sólo los hosts externos requeridos por QRCode.js y DePay.
- `form-action 'self'`: impide enviar formularios HTML a destinos externos arbitrarios.
- `upgrade-insecure-requests`: solicita HTTPS para recursos HTTP heredados.
- `referrer-policy`: `strict-origin-when-cross-origin` reduce la información enviada a otros orígenes.

## Dependencias externas autorizadas actualmente

### QRCode.js

La página todavía carga QRCode.js desde jsDelivr, fijado al commit upstream:

`06c7a5e134f116402699f03cda5819e10a0e5787`

El código upstream de ese commit fue revisado como dependencia conocida y su licencia es MIT. La dependencia está fijada a un commit inmutable, pero el CDN sigue siendo una dependencia de disponibilidad y entrega. El objetivo siguiente es incorporarla localmente al repositorio conservando su licencia, para eliminar ese runtime CDN del camino crítico.

### DePay

El checkout carga actualmente:

`https://sdk.depay.com/widgets/v13.0.45.js`

La versión se mantiene exacta, no como un alias mayor flotante. DePay sigue siendo una dependencia externa necesaria para el flujo de pago actual y deberá tener revisión específica antes de endurecer todavía más `script-src`, `connect-src` y `frame-src`.

## Browser Security Bootstrap

`v1/security-bootstrap-v331.js`:

- marca la versión `EVO-BROWSER-SHIELD-V3.3.1`;
- detecta fallos de carga de recursos críticos;
- muestra un fallback seguro en lugar de continuar silenciosamente con una interfaz incompleta;
- escucha violaciones CSP para diagnóstico;
- añade `noopener noreferrer` a enlaces que abren otra pestaña;
- publica un estado congelado `window.EVOSecurity`;
- declara expresamente que la telemetría pública no es evidencia autoritativa.

## Controles automáticos

`tests/security-hardening-v330.test.js` y `EVO Security Gate` verifican que:

- exista CSP;
- `base-uri` y `object-src` permanezcan deshabilitados;
- los handlers JavaScript inline sigan prohibidos;
- no reaparezcan atributos `on*=` en el HTML principal;
- el bootstrap de seguridad siga cargando;
- QRCode.js permanezca fijado al commit revisado mientras sea externo;
- DePay permanezca fijado a versión exacta;
- los secretos privilegiados no aparezcan en frontend;
- las GitHub Actions sigan fijadas a commits inmutables;
- las Edge Functions versionadas mantengan límites explícitos de tamaño de request.

## Restricciones transitorias conocidas

Esta CSP es una **línea base compatible**, no la política final más estricta:

1. `style-src 'unsafe-inline'` sigue siendo necesario porque la interfaz heredada contiene estilos inline y algunos módulos generan estilos dinámicos.
2. `connect-src` permite HTTPS/WSS de forma amplia para no romper proveedores Web3 y flujos de pago mientras se completa el inventario real de endpoints.
3. `frame-src https:` continúa amplio por compatibilidad con widgets externos de pago.
4. QRCode.js todavía se entrega desde jsDelivr.
5. Una CSP en `<meta>` no sustituye encabezados HTTP del servidor.

## Encabezados que requieren un hosting edge

Para una postura web más fuerte, EVO debe servir encabezados HTTP desde Cloudflare, Vercel u otra capa que los soporte. Entre los controles que no deben depender sólo del HTML están:

- `Content-Security-Policy` como response header;
- `frame-ancestors` para protección anti-clickjacking;
- `Strict-Transport-Security`;
- `Permissions-Policy`;
- `X-Content-Type-Options: nosniff`;
- políticas COOP/CORP/COEP cuando la compatibilidad haya sido validada.

## Próximos gates

Antes de una afirmación de seguridad de alto nivel:

1. vendorizar QRCode.js localmente con su licencia;
2. inventariar dominios realmente utilizados por wallet/DePay y cerrar `connect-src`/`frame-src`;
3. migrar estilos inline a CSS local y retirar `style-src 'unsafe-inline'`;
4. proteger `main` y exigir Security Gate;
5. desplegar las Edge Functions endurecidas sólo después de revisión;
6. completar revisión de endpoints productivos no versionados;
7. hacer atómica la creación de Seal y el consumo de crédito;
8. ejecutar un pentest independiente y documentar remediaciones.
