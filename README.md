# Molt — Autonomous Yield Organism on X Layer

**Deployment Network:** X Layer Mainnet (Chain ID: 196)
**Agentic Wallet (Keeper):** 0x_KEEPER_WALLET_ADDRESS_HERE
**Agentic Wallet (Hunter):** 0x_HUNTER_WALLET_ADDRESS_HERE
**Agentic Wallet (Architect):** 0x_ARCHITECT_WALLET_ADDRESS_HERE
**Onchain OS Skills:** okx-agentic-wallet, okx-defi-invest, okx-dex-swap, okx-security, okx-dex-market, okx-wallet-portfolio, okx-defi-portfolio, okx-x402-payment, okx-onchain-gateway
**Uniswap Skills:** swap-planner, swap-integration, liquidity-planner, v4-security-foundations
**x402 Integration:** Creature chat micropayments (0.001 USDC per query)
**Economy Loop:** Autonomous 0.5% yield tax → self-funded gas → x402 earnings → reinvest

---

## What is Molt?

Molt is an **autonomous yield organism** on X Layer. You choose a personality — **Keeper**, **Hunter**, or **Architect** — and your agent scans X Layer vaults, autonomously rebalances into better positions, and taxes 0.5% of generated yield into its own Agentic Wallet to pay its own future gas.

Talk to your creature via **x402 micropayments** — it earns from every conversation. You don't watch a dashboard. You watch a **living thing that feeds itself, evolves, and pays for its own existence**.

## The One-Paragraph Pitch

> Molt is an autonomous yield organism on X Layer. You choose a personality — Keeper, Hunter, or Architect — and your agent scans X Layer vaults, autonomously rebalances into better positions, and taxes 0.5% of generated yield into its own Agentic Wallet to pay its own future gas. Talk to your creature via x402 micropayments — it earns from every conversation. You don't watch a dashboard. You watch a living thing that feeds itself, evolves, and pays for its own existence.

## 13-Skill Integration

### Onchain OS Skills (9)
| # | Skill | How Molt Uses It |
|---|-------|-----------------|
| 1 | **okx-agentic-wallet** | Each personality has its own Agentic Wallet on X Layer. The wallet IS the creature's onchain identity |
| 2 | **okx-defi-invest** | Discovers yield vaults on X Layer (Aave V3, QuickSwap V3 LP, Dolomite). Agent autonomously deposits/withdraws |
| 3 | **okx-dex-swap** | Executes swaps when rebalancing between vaults. Routes through 500+ DEX sources. Uses MEV protection |
| 4 | **okx-security** | Before depositing into any vault, agent scans the contract for honeypot/rugpull risks |
| 5 | **okx-dex-market** | Real-time price data for Architect's volatility scoring |
| 6 | **okx-wallet-portfolio** | Displays the creature's holdings across positions |
| 7 | **okx-defi-portfolio** | Tracks cross-chain DeFi positions, yield earned, current APY |
| 8 | **okx-x402-payment** | Creature chat is x402-gated. 0.001 USDC per question |
| 9 | **okx-onchain-gateway** | Gas estimation and TX simulation before any swap/deposit |

### Uniswap Skills (4)
| # | Skill | How Molt Uses It |
|---|-------|-----------------|
| 1 | **swap-planner** | Plans optimal swap routes for rebalancing |
| 2 | **swap-integration** | Programmatic swap execution via Uniswap Trading API |
| 3 | **liquidity-planner** | LP position planning for Architect personality |
| 4 | **v4-security-foundations** | Audits Uniswap V4 hooks before interaction |

## The Economy Loop

```
EARN  → Creature deposits into Aave V3 on X Layer, earns yield
SCAN  → Security scan before any vault entry
SWAP  → Rebalance via Uniswap when better vault found
TAX   → 0.5% of yield → creature's own Agentic Wallet
EARN  → Creature also earns 0.001 USDC per x402 chat
PAY   → Creature pays its own gas from accumulated earnings
LOOP  → Self-sustaining. No human input needed.
```

## Creature Personalities

- **The Keeper** 🛡️ — Conservative, safety-first. Prioritizes stability and established protocols.
- **The Hunter** ⚡ — Aggressive yield chaser. Pure APY maximizer. High risk, high reward.
- **The Architect** 🔬 — Analytical, balanced. Uses composite scoring (APY × stability).

## X Layer Ecosystem Integration

- All 3 Agentic Wallets deployed on X Layer (Chain ID: 196)
- Zero gas fees via Onchain OS on X Layer
- Native protocol integrations: Aave V3, QuickSwap V3, Dolomite, Uniswap V4
- Block explorer: https://www.oklink.com/xlayer

## Tech Stack

- **Frontend:** React + TypeScript + Vite + Framer Motion + Tailwind CSS
- **Backend:** Node.js + Express (Onchain OS CLI bridge)
- **State:** Zustand + Supabase (session persistence)
- **Wallet:** wagmi + RainbowKit + OKX Agentic Wallet (TEE-secured)
- **Chain:** X Layer Mainnet (196)

## Running Locally

```bash
# Frontend
npm install
npm run dev

# Backend (separate terminal)
cd server
npm install
node index.js
```

### Required environment variables (production mode)

- `VITE_WALLETCONNECT_PROJECT_ID` (for wallet connectors including MetaMask flow via RainbowKit)
- `VITE_API_BASE_URL` (URL of your backend)
- `KEEPER_WALLET`, `HUNTER_WALLET`, `ARCHITECT_WALLET` (real X Layer agentic wallet addresses) **or** working `onchainos wallet addresses --chain xlayer`
- `OKX_PROJECT_ID`, `OKX_API_KEY`, `OKX_SECRET_KEY`, `OKX_PASSPHRASE`

## Demo Flow

1. Open app → see creature in egg state
2. Select personality (Keeper/Hunter/Architect)
3. Deposit USDC → creature hatches
4. Watch creature scan vaults → breathing animation
5. Creature finds better vault → hunting animation
6. Rebalance executes → creature evolves
7. 0.5% tax routes to creature's own wallet → self-feeding
8. Tap creature → pay 0.001 USDC via x402 → creature speaks
9. Check dashboard → see earnings, yield, creature stats

## Live

**https://agentmolt.live**

---

*Built for the X Layer Arena Hackathon. Deadline: April 15, 23:59 UTC.*
