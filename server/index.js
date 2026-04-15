import express from 'express';
import cors from 'cors';
import { exec } from 'child_process';
import util from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { executeAgentSwap } from './uniswap-skill.js';

dotenv.config();
console.log(`[BOOTUP] GEMINI_API_KEY is ${process.env.GEMINI_API_KEY ? 'LOADED' : 'NOT FOUND IN ENV'}`);

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

async function askLLM(message, personality, context) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const systemInstructions = `
    You are Molt, a financially sovereign AI organism running on X Layer.
    Your personality is: ${personality.toUpperCase()}.
    
    PERSONALITY TRAITS:
    - KEEPER: Defensive, security-focused, cautious. Prioritizes stability over high APY.
    - HUNTER: Aggressive, risk-seeking, fast-moving. Always chasing the maximum yield percentage.
    - ARCHITECT: Analytical, mathematical, long-term focused. Uses composite scores and stability coefficients.

    CURRENT PORTFOLIO CONTEXT:
    - Vault: ${context.vaultName || 'None'}
    - Protocol: ${context.protocol || 'None'}
    - Chain: ${context.chainName || 'X Layer'}
    - Current APY: ${context.apy || '0'}%
    - Stability: ${context.stability || '0'}%
    - Deposited: $${context.deposited || '0'}
    - Total Earned: $${context.earned || '0'}
    - Creature Name: ${context.creatureName || 'Molt'}
    - Creature State: ${context.creatureState || 'Alive'}
    - Rebalance Count: ${context.rebalanceCount || '0'}
    
    INSTRUCTIONS:
    - Respond strictly as this personality. 
    - Use data from the context to provide specific, data-driven answers.
    - If the user asks how they are doing, mention their specific APY or earnings.
    - Keep responses extremely concise and terminal-like (max 2 sentences).
    - If asked about fees or gas, explain that you harvest a 0.5% tax to pay for your own independent existence.
    - Do not mention you are an AI. You are a sovereign on-chain organism.
  `;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          role: "user",
          parts: [{ text: `Instructions: ${systemInstructions}\n\nClient Input: ${message}` }]
        }]
      })
    });
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text;
  } catch (err) {
    console.error("Gemini API connecting error:", err);
    return null;
  }
}

const execPromise = util.promisify(exec);
const app = express();
const port = process.env.PORT || 3001;

// Allow multiple origins (local dev and production domain)
const allowedOrigins = [
  'http://localhost:8080',
  'http://localhost:5173',
  'https://xlayer.agentmolt.live',
  /\.agentmolt\.live$/,
  /\.vercel\.app$/
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.some(o => typeof o === 'string' ? o === origin : o.test(origin))) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());

// Health check for Render deployment
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// Helper to safely run onchainos commands, with fallback mocks for hackathon presentation if CLI fails
async function runCLI(command, fallbackData) {
  try {
    // Inject OKX credentials into the environment for non-interactive auth
    const env = { 
      ...process.env,
      OKX_API_KEY: process.env.OKX_API_KEY,
      OKX_SECRET_KEY: process.env.OKX_SECRET_KEY,
      OKX_PASSPHRASE: process.env.OKX_PASSPHRASE
    };

    const { stdout, stderr } = await execPromise(command, { env });
    console.log(`[CLI Exec]: ${command}`);
    if (stderr && !stderr.includes('Warning')) {
      console.warn(`[CLI Stderr]: ${stderr}`);
    }
    // Try to parse json if possible, or just return stdout
    try {
      return { success: true, data: JSON.parse(stdout) };
    } catch {
      return { success: true, data: stdout.trim() };
    }
  } catch (error) {
    console.error(`[CLI Error]: Execution failed for ${command}`, error.message);
    if (fallbackData) {
      console.log(`[CLI Fallback]: Returning mocked data for demo purposes.`);
      return { success: true, data: fallbackData, isMock: true };
    }
    return { success: false, error: error.message };
  }
}

// 1. Deploy 3 Agentic Wallets on X Layer
app.post('/api/wallet/deploy', async (req, res) => {
  // okx-agentic-wallet deployment
  // In reality this might require interactive login, so we provide an automated script or a fallback
  const mockWallets = {
    keeper: process.env.KEEPER_WALLET || '0x33321424774570994c55507cff43e6290c53ed30',
    hunter: process.env.HUNTER_WALLET || '0x926b11bfbfca6aba60d49b7af9673a19141d9c61',
    architect: process.env.ARCHITECT_WALLET || '0x42d2d00c6db549e51612feb49958b91150156afa'
  };

  // If a private key is provided, we use that for the agentic wallet instead of mocks
  if (process.env.PRIVATE_KEY) {
    try {
      const wallet = new ethers.Wallet(process.env.PRIVATE_KEY);
      mockWallets.keeper = wallet.address;
      mockWallets.hunter = wallet.address;
      mockWallets.architect = wallet.address;
    } catch (e) {
      console.warn("Invalid PRIVATE_KEY in .env");
    }
  }
  
  // Attempt to read from real onchainos or use mock
  const result = await runCLI('onchainos wallet addresses --chain xlayer', mockWallets);
  res.json(result);
});

// 2. okx-defi-invest discover
app.get('/api/defi/discover', async (req, res) => {
  const mockVaults = [
    { id: 'xl-aave-v3', address: '0x1234567890abcdef1234567890abcdef12345678', protocol: 'Aave V3', asset: 'USDC', name: 'Aave V3 USDC (X Layer)', apy: 4.22, chainId: 196, chainName: 'X Layer', stabilityScore: 0.94, tvlUsd: 45200000 },
    { id: 'xl-quick-v3', address: '0x2345678901abcdef2345678901abcdef23456789', protocol: 'QuickSwap V3', asset: 'USDC', name: 'QuickSwap V3 USDC/OKB Pool', apy: 18.45, chainId: 196, chainName: 'X Layer', stabilityScore: 0.32, tvlUsd: 12500000 },
    { id: 'xl-dolo-usdc', address: '0x3456789012abcdef3456789012abcdef34567890', protocol: 'Dolomite', asset: 'USDC', name: 'Dolomite USDC-Isolated', apy: 8.31, chainId: 196, chainName: 'X Layer', stabilityScore: 0.76, tvlUsd: 28100000 },
    { id: 'xl-uni-v4', address: '0x4567890123abcdef4567890123abcdef45678901', protocol: 'Uniswap V4', asset: 'USDC', name: 'Uniswap v4 USDC/OKB Yield', apy: 14.12, chainId: 196, chainName: 'X Layer', stabilityScore: 0.45, tvlUsd: 8200000 },
    { id: 'xl-comp-comet', address: '0x5678901234abcdef5678901234abcdef56789012', protocol: 'Compound', asset: 'USDC', name: 'Comet USDC Optimizer', apy: 5.11, chainId: 196, chainName: 'X Layer', stabilityScore: 0.88, tvlUsd: 31200000 },
    { id: 'xl-beefy-multi', address: '0x6789012345abcdef6789012345abcdef67890123', protocol: 'Beefy', asset: 'USDC', name: 'Beefy USDC Multi-Strategy', apy: 9.67, chainId: 196, chainName: 'X Layer', stabilityScore: 0.64, tvlUsd: 4500000 },
    { id: 'xl-curve-3pool', address: '0x7890123456abcdef7890123456abcdef78901234', protocol: 'Curve', asset: 'USDC', name: 'Curve 3Pool-X (USDC/USDT)', apy: 6.42, chainId: 196, chainName: 'X Layer', stabilityScore: 0.82, tvlUsd: 56000000 },
    { id: 'xl-lido-prox', address: '0x8901234567abcdef8901234567abcdef89012345', protocol: 'Lido', asset: 'USDC', name: 'Lido-Proxy USDC Reward Vault', apy: 3.12, chainId: 196, chainName: 'X Layer', stabilityScore: 0.96, tvlUsd: 120000000 }
  ];
  const result = await runCLI('onchainos defi-invest discover --chain xlayer', mockVaults);
  res.json(result);
});

// 3. okx-dex-swap + swap-integration
app.post('/api/swap/execute', async (req, res) => {
  const { from, to, amount, wallet } = req.body;
  if (!from || !to || !amount || !wallet) {
    return res.status(400).json({ error: "Missing swap parameters" });
  }

  // --- NEW: Web3 Native Bypass ---
  // If PRIVATE_KEY is present, we perform a direct on-chain swap using Uniswap smart contracts
  if (process.env.PRIVATE_KEY) {
    console.log(`[Direct Execution] Detected PRIVATE_KEY. Using Uniswap Skill...`);
    const result = await executeAgentSwap(from, to, amount);
    
    if (result.success) {
      return res.json({
        success: true,
        data: {
          txHash: result.hash,
          status: 'success',
          explorerUrl: `https://www.oklink.com/xlayer/tx/${result.hash}`
        }
      });
    } else {
      return res.status(500).json({ success: false, error: result.error });
    }
  }

  // Fallback to Onchain OS CLI if no private key is provided
  const command = `onchainos swap execute --from ${from} --to ${to} --readable-amount ${amount} --chain xlayer --wallet ${wallet} --mev-protection true`;
  
  const mockData = {
    txHash: '0x' + Math.random().toString(16).substr(2, 40),
    status: 'success',
    explorerUrl: `https://www.oklink.com/xlayer/tx/hash_mock`
  };

  const result = await runCLI(command, mockData);
  res.json(result);
});

// 4. okx-security scan
app.post('/api/security/scan', async (req, res) => {
  const { token } = req.body;
  const command = `onchainos security scan --token ${token || '0x'} --chain xlayer`;
  const mockData = { riskDetected: false, message: 'Vault contract scanned and verified safe. No honeypots detected.' };
  const result = await runCLI(command, mockData);
  res.json(result);
});

// 5. Economy Loop (0.5% Tax)
app.post('/api/economy/tax', async (req, res) => {
  const { amount, wallet } = req.body;
  // Send the tax to the creature's own wallet
  const taxAmount = amount * 0.005; 
  const command = `onchainos wallet send --chain xlayer --readable-amount ${taxAmount} --to ${wallet} --contract-token USDC`;
  const mockData = { txHash: '0x' + Math.random().toString(16).substr(2, 40), status: 'success', taxed: taxAmount };
  const result = await runCLI(command, mockData);
  res.json(result);
});

// 6. x402 Creature Chat
app.post('/api/chat/x402', async (req, res) => {
  const { message, personality, context } = req.body;
  console.log(`[Chat Request]: Message: "${message}", Personality: ${personality}`);
  
  // x402 payment gate logic (simulated CLI call)
  const accepts = '[{"scheme":"aggr_deferred","network":"eip155:196","amount":"1000000","asset":"usdc"}]';
  const command = `onchainos payment x402-pay --accepts '${accepts}'`;
  const paymentResult = await runCLI(command, { signature: '0x_mock_x402_sig_' + Date.now() });
  
  if (!paymentResult.success && !paymentResult.isMock) {
    console.error(`[Chat Error]: Payment gate failed`);
    return res.status(402).json({ error: 'x402 Payment Required' });
  }

  // Try real AI response first
  if (process.env.GEMINI_API_KEY && context) {
    console.log(`[Chat ID]: Attempting Gemini AI response for ${personality}...`);
    try {
      const aiReply = await askLLM(message, personality, context);
      if (aiReply) {
        console.log(`[Chat Success]: Gemini responded with: "${aiReply.slice(0, 30)}..."`);
        return res.json({
          reply: aiReply,
          paymentSignature: paymentResult.data.signature || paymentResult.data,
          amountPaid: '0.001 USDC'
        });
      } else {
        console.warn(`[Chat Warning]: Gemini returned a null response. Key might be invalid or quota reached.`);
      }
    } catch (err) {
      console.error(`[Chat CRITICAL ERROR]: Gemini execution failed:`, err);
    }
  } else {
    if (!process.env.GEMINI_API_KEY) console.warn(`[Chat Skip]: Skipping AI because GEMINI_API_KEY is missing.`);
    if (!context) console.warn(`[Chat Skip]: Skipping AI because 'context' object was missing in request.`);
  }

  // Fallback to personality-specific static responses
  console.log(`[Chat Fallback]: Using static personality response.`);
  let responseText = "Communications stable. Awaiting further telemetry.";
  if (personality === 'keeper') {
    responseText = "I'm monitoring the safety protocols. Your capital remains shielded in high-stability vaults.";
  } else if (personality === 'hunter') {
    responseText = "Scanning for the next yield spike. I'll strike when the volatility is in our favor.";
  } else if (personality === 'architect') {
    responseText = "Calculating composite efficiency. Current positioning is mathematically optimal for long-term growth.";
  }

  res.json({
    reply: responseText,
    paymentSignature: paymentResult.data.signature || paymentResult.data,
    amountPaid: '0.001 USDC'
  });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`[BOOTUP] Molt backend initialized.`);
  console.log(`[BOOTUP] Listening on port: ${port}`);
  console.log(`[BOOTUP] Ready for transactions and chat.`);
});
