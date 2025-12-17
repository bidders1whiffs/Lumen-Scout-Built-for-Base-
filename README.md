# Lumen Scout (Built for Base)

Lumen Scout is a read-only Base token scanner that connects through Coinbase-supported providers and performs ERC-20 metadata + balance queries using Base RPC.

This repository is designed to validate Base tooling compatibility (including account abstraction–friendly provider surfaces) while keeping the default behavior strictly non-destructive (no mandatory transactions).

---

## Base relevance

Built for Base. This project targets Base Mainnet and Base Sepolia explicitly:
- Base Mainnet chainId (decimal): 8453
- Base Sepolia chainId (decimal): 84532

The script enforces correct Base network selection by requesting wallet chain switching/adding as needed, then reads onchain state through Base RPC endpoints.

---

## What it does

After connecting a wallet provider, Lumen Scout:
- Ensures the active network is Base (8453) or Base Sepolia (84532)
- Fetches a connected address and prints a Basescan link
- Reads ETH balance and latest block number (sanity checks)
- Reads ERC-20 token metadata:
  - name()
  - symbol()
  - decimals()
- Reads ERC-20 balances:
  - balanceOf(owner)
- Outputs a compact report with explorer links for:
  - token address
  - owner address

The scanner works with:
- Base Account SDK provider (Base Accounts oriented)
- Coinbase Wallet SDK provider (Coinbase Wallet / Smart Wallet environments)

---

## Repository structure

- app.lumen-scout.ts
  Browser-first script and UI surface.
  Connects to a wallet provider, targets Base networks, and performs read-only ERC-20 queries.

- package.json
  Declares SDK and tooling dependencies sourced from Coinbase/Base open-source repos.

- README.md
  Technical documentation, usage instructions, and deployment placeholders for Base Sepolia.

- LICENSE
  MIT license text (included below) to be copied into a LICENSE file.

---

## Dependencies

Provider / SDK layer
- @base-org/account
  Produces a Base Account EIP-1193 provider (getProvider) for Base account flows and account abstraction–friendly usage.
- @coinbase/wallet-sdk
  Coinbase Wallet SDK provider as a fallback connection strategy.

Onchain read tooling
- viem
  Base-compatible client for RPC reads (getBlockNumber, getBalance, readContract).

Optional Coinbase ecosystem packages (included for extension paths)
- @coinbase/onchainkit
  Useful if you add Base-native UI components.
- @coinbase/cdp-sdk
  Useful if you extend this into server-assisted or embedded wallet flows.
- @coinbase/x402
  Useful if you add paid API actions or micropayments.

---

## Installation

1) Add the files to a new GitHub repository:
   - app.lumen-scout.ts
   - README.md
   - package.json
2) Install dependencies:
   npm install

---

## Run

Recommended approach:
- Serve the script with a modern bundler (Vite).
- Start:
  npm run dev
- Open the printed local URL in a browser.

Usage flow:
- Connect using one of the provider buttons
- Toggle network if needed (Base ↔ Base Sepolia)
- Paste an ERC-20 token address (or click “Fill Examples”)
- Optionally paste an owner address (defaults to connected address)
- Click “Scan Token Balance”

Expected result:
- A report is printed with:
  - network + chainId
  - token metadata
  - raw balanceOf output
  - Basescan links for token and owner

---

## Notes on accuracy and formatting

- Raw ERC-20 balances are returned as uint256 integers.
- To display a human-readable value, divide by 10^decimals.
- This project intentionally prints raw balances to avoid rounding errors in auditing contexts.

---

## License

MIT License

Copyright (c) 2025 YOUR_NAME

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

## Author

GitHub: https://github.com/bidders1whiffs 

Email: bidders.whiffs-00@icloud.com

Public contact: https://x.com/brand0nlicata

---

## Testnet Deployment (Base Sepolia)

As part of pre-production validation, one or more contracts may be deployed to the Base Sepolia test network to confirm correct behavior and tooling compatibility.

Network: Base Sepolia  
chainId (decimal): 84532  
Explorer: https://sepolia.basescan.org  

Contract address:  
0xAec3b27558Ea5DD3d00e0dcc8713476b1E425aA1

Deployment and verification:
- https://sepolia.basescan.org/address/0xAec3b27558Ea5DD3d00e0dcc8713476b1E425aA1
- https://sepolia.basescan.org/0xAec3b27558Ea5DD3d00e0dcc8713476b1E425aA1/0#code  

These testnet deployments provide a controlled environment for validating Base tooling, account abstraction flows, and read-only onchain interactions prior to Base Mainnet usage. 
