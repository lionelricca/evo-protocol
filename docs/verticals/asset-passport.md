# EVO Asset Passport · V3.1

## Product promise
Create a portable, verifiable history for equipment and high-value assets that survives changes of owner, operator, workshop and service provider.

EVO should not become a CMMS. The product is the trust layer between systems and organizations.

## Initial markets
Prioritize assets where service history affects risk, resale value, warranty or operational trust:
- generators and engines
- pumps and compressors
- industrial electrical equipment
- construction and rental equipment
- forklifts and lifting equipment
- agricultural machinery
- HVAC and refrigeration equipment
- BESS and energy equipment later

## Core differentiator
Current EVO events are owner declarations. V3.1 introduces two evidence levels:

### DECLARED
A current owner signs an event.

### SERVICE PROOF / COUNTERSIGNED
A service provider or inspector also signs the same service evidence.

This distinction must remain visible publicly. EVO must never present an owner declaration as an independently verified service.

## Service Proof data
A richer service event should support:
- service type
- provider organization / wallet
- technician public label when appropriate
- date
- operating hours / odometer / cycle count when relevant
- work performed
- parts or components replaced
- measurements / result summary
- next service due by date or hours
- warranty reference
- evidence hashes for attached reports or photos
- owner signature
- optional provider countersignature

## Event families
Keep ownership transfer separate from service history.

Asset lifecycle:
- INSPECTED
- SERVICED
- REPAIRED
- COMMISSIONED
- WARRANTY
- COMPONENT_REPLACED
- METER_READING
- NOTE

Ownership:
- TRANSFERRED using the existing two-party transfer flow

## Public trust states
Each timeline item must make evidence level obvious:
- Owner declared
- Service provider signed
- Two-party confirmed
- Document evidence attached

Do not use the generic word VERIFIED unless the UI explains exactly what was verified.

## Workflow
1. Owner opens an asset from My EVO.
2. Selects Record Service Proof.
3. Adds service data.
4. Owner signs.
5. Optional provider link lets the service provider countersign.
6. Public Passport adds the event and its evidence level.

## Integration strategy
EVO should accept events from third-party systems later through an API instead of replacing their CMMS/ERP.

Future API target:
POST /assets/{sealId}/events

## Commercial hypothesis
- owner/fleet plans
- service-company plans
- dealer and rental plans
- API tiers
- branded verification pages later without hiding EVO evidence

## V3.1 success criteria
- a service event can be added from My EVO without manually entering a Seal ID;
- declared and countersigned service are impossible to confuse;
- ownership transfer remains independent and two-party;
- public history is useful during resale or audit;
- the core remains compatible with non-industrial assets.
