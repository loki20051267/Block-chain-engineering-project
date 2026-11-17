# CertiChain — Certificate Verification & Blockchain Simulator

CertiChain is a student-friendly front-end project that demonstrates certificate records and core blockchain ideas:
- SHA-256 hashes using the browser Web Crypto API
- Blocks connected through previous-hash references
- Chain validation and certificate integrity checks
- An interactive Proof-of-Work mining puzzle with adjustable difficulty
- A certificate registry, issue form, blockchain explorer, and viva learning page

## Run the project

1. Extract `CertiChain-Website.zip`.
2. Open the `CertiChain` folder in VS Code.
3. Recommended: install/use the **Live Server** extension and click **Go Live**.
4. Or run a local server from this folder:
   - Python: `python -m http.server 8000`
   - Then open `http://localhost:8000` in Chrome.
5. Do not rely on opening the file directly as `file://`; browser cryptography may be blocked outside a secure context.

No npm install or external libraries are required.

## Demonstration flow for faculty

1. Show the Overview dashboard.
2. Open Certificates and verify `CERT-2026-001`.
3. Issue a new certificate with a unique ID.
4. Open Blockchain Explorer and point out the block hash and previous hash.
5. Open Proof of Work, select the new block, choose 2 leading zeros, and start mining.
6. Validate the chain after mining.
7. Open Learn Blockchain and use the viva explanations.

## Important project limitation

This is a local browser simulation, not a public or decentralized blockchain. It does not connect to a university registry or prove the real-world identity of a certificate issuer. Data is kept in the current page session and resets when the page is reloaded. Proof of Work is an educational nonce-search puzzle, not real Bitcoin mining. A real system would require trusted issuer identities, persistent secure storage, a distributed blockchain network or trusted registry, and appropriate security review.

## Files

- `index.html` — page structure and sections
- `style.css` — layout, colors, responsive styling
- `script.js` — certificate records, SHA-256 hashing, block creation, validation and mining
