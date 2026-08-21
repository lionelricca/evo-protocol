# EVO V2.5 · My EVO Dashboard

## Objetivo

Dar a una wallet conectada una vista única de su relación con EVO sin crear un sistema de cuentas paralelo.

## Qué muestra

- Proofs disponibles: Free Proof pendiente + Proofs comprados aún no consumidos.
- Passports creados por la wallet.
- Activos cuya propiedad actual corresponde a la wallet.
- Actividad pública reciente relacionada con la wallet, incluidas transferencias aceptadas.

## Cómo se calcula la propiedad

1. El emisor original de un Seal es su propietario inicial.
2. Se consultan los eventos `TRANSFERRED` activos del Passport.
3. Se aplican cronológicamente.
4. El `new_owner_wallet` del último evento de transferencia aceptado es el propietario actual.

Por eso “creado por mí” y “poseído por mí” son conceptos distintos.

## Seguridad

My EVO es read-only. Usa únicamente información ya pública en `evo_seals` y `evo_passport_events`, ambas protegidas con RLS para lectura de registros visibles/activos.

El dashboard:

- no solicita `personal_sign`;
- no envía transacciones;
- no aprueba tokens;
- no consulta directamente `evo_passport_transfers`;
- no muestra ofertas de transferencia pendientes;
- no requiere nuevas tablas, vistas, funciones SQL ni grants.

Las operaciones sensibles siguen viviendo en sus flujos existentes de EVO.
