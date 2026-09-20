# EVO Crypto — Security

This directory is the public technical reference surface for EVO Crypto on Polygon.

## Public-site security posture

- Static content only.
- No wallet connection.
- No transaction signing.
- No seed phrase or private-key collection.
- No forms.
- No third-party JavaScript.
- No analytics or tracking scripts.
- No external runtime dependencies.
- Restrictive Content Security Policy is declared in the HTML.
- External links use `noopener noreferrer`.

## Official on-chain references

- EVO V2: `0x0F4C77AfC5937491ec0274baeAEB30608daF2192`
- Migration contract: `0x697092dB28B69DFd4E7631A72B9B3B507a049BAF`
- Uniswap V3 WPOL/EVO V2 pool: `0x9bFF486cCfC9BE5A021D1E8586D4BCBB3aC47e67`
- Network: Polygon Mainnet (chain ID 137)

## Operational rules

- Never publish seed phrases, private keys, recovery codes, or signing secrets.
- Avoid unlimited token approvals; revoke allowances when no longer required.
- Verify the chain, contract address, spender, amount, and transaction simulation before signing.
- Keep the website informational; wallet/transaction functionality should be isolated into separately reviewed code if ever introduced.
- Security claims must be factual. No system should be described as unhackable or 100% secure.
