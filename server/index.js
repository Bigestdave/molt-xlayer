import express from 'express';
import cors from 'cors';
import { execFile } from 'child_process';
import util from 'util';

import dotenv from 'dotenv';

dotenv.config();

const execFilePromise = util.promisify(execFile);
const app = express();
const port = process.env.PORT || 3001;
const X_LAYER_CHAIN = 'xlayer';
const X_LAYER_CHAIN_ID = 196;

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

function isAddress(value) {
  return typeof value === 'string' && /^0x[a-fA-F0-9]{40}$/.test(value);
}

function isPositiveAmount(value) {
  const n = typeof value === 'string' ? Number(value) : value;
  return Number.isFinite(n) && n > 0;
}

function isTokenSelector(value) {
  if (typeof value !== 'string' || value.length < 2 || value.length > 64) return false;
  return isAddress(value) || /^[A-Za-z0-9._-]+$/.test(value);
}

function getConfiguredWallets() {
  const keeper = process.env.KEEPER_WALLET;
  const hunter = process.env.HUNTER_WALLET;
  const architect = process.env.ARCHITECT_WALLET;
  if (isAddress(keeper) && isAddress(hunter) && isAddress(architect)) {
    return { keeper, hunter, architect };
  }
  return null;
}

function parseWallets(data) {
  if (!data || typeof data !== 'object') return null;
  const candidate = {
    keeper: data.keeper || data.Keeper || data.KEEPER_WALLET,
    hunter: data.hunter || data.Hunter || data.HUNTER_WALLET,
    architect: data.architect || data.Architect || data.ARCHITECT_WALLET,
  };
  return (isAddress(candidate.keeper) && isAddress(candidate.hunter) && isAddress(candidate.architect))
    ? candidate
    : null;
}

// Helper to safely run onchainos commands without shell interpolation
async function runCLI(args) {
  try {
    // Inject OKX credentials into the environment for non-interactive auth
    const env = {
      ...process.env,
      OKX_PROJECT_ID: process.env.OKX_PROJECT_ID,
      OKX_API_KEY: process.env.OKX_API_KEY,
      OKX_SECRET_KEY: process.env.OKX_SECRET_KEY,
      OKX_PASSPHRASE: process.env.OKX_PASSPHRASE
    };

    const { stdout, stderr } = await execFilePromise('onchainos', args, { env, maxBuffer: 1024 * 1024 * 5 });
    console.log(`[CLI Exec]: onchainos ${args.join(' ')}`);
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
    console.error(`[CLI Error]: Execution failed for onchainos ${args.join(' ')}`, error.message);
    return { success: false, error: error.message };
  }
}

// 1. Deploy 3 Agentic Wallets on X Layer
app.post('/api/wallet/deploy', async (req, res) => {
  const configured = getConfiguredWallets();
  if (configured) {
    return res.json({ success: true, data: configured, source: 'env' });
  }

  const result = await runCLI(['wallet', 'addresses', '--chain', X_LAYER_CHAIN]);
  if (!result.success) {
    return res.status(502).json({
      success: false,
      error: 'Failed to resolve agentic wallets from Onchain OS CLI. Configure KEEPER_WALLET, HUNTER_WALLET, ARCHITECT_WALLET env vars as a fallback.'
    });
  }

  const parsed = parseWallets(result.data);
  if (!parsed) {
    return res.status(502).json({
      success: false,
      error: 'Onchain OS returned wallet data in an unsupported format. Please set KEEPER_WALLET, HUNTER_WALLET, ARCHITECT_WALLET.'
    });
  }
  res.json({ success: true, data: parsed, source: 'onchainos' });
});

// 2. okx-defi-invest discover
app.get('/api/defi/discover', async (req, res) => {
  const result = await runCLI(['defi-invest', 'discover', '--chain', X_LAYER_CHAIN]);
  if (!result.success) {
    return res.status(502).json({ success: false, error: 'Failed to discover vaults on X Layer via Onchain OS.' });
  }
  res.json(result);
});

// 3. okx-dex-swap + swap-integration
app.post('/api/swap/execute', async (req, res) => {
  const { from, to, amount, wallet } = req.body;
  if (!from || !to || !amount || !wallet) {
    return res.status(400).json({ error: "Missing swap parameters" });
  }
  if (!isTokenSelector(from) || !isTokenSelector(to) || !isAddress(wallet) || !isPositiveAmount(amount)) {
    return res.status(400).json({ success: false, error: 'Invalid swap parameters.' });
  }
  const result = await runCLI([
    'swap',
    'execute',
    '--from', from,
    '--to', to,
    '--readable-amount', String(amount),
    '--chain', X_LAYER_CHAIN,
    '--wallet', wallet,
    '--mev-protection', 'true'
  ]);
  if (!result.success) {
    return res.status(502).json({ success: false, error: 'Swap execution failed on Onchain OS.' });
  }
  res.json(result);
});

// 4. okx-security scan
app.post('/api/security/scan', async (req, res) => {
  const { token } = req.body;
  if (!isAddress(token)) {
    return res.status(400).json({ success: false, error: 'Invalid token address for security scan.' });
  }
  const result = await runCLI(['security', 'scan', '--token', token, '--chain', X_LAYER_CHAIN]);
  if (!result.success) {
    return res.status(502).json({ success: false, error: 'Security scan failed on Onchain OS.' });
  }
  res.json(result);
});

// 5. Economy Loop (0.5% Tax)
app.post('/api/economy/tax', async (req, res) => {
  const { amount, wallet } = req.body;
  if (!isPositiveAmount(amount) || !isAddress(wallet)) {
    return res.status(400).json({ success: false, error: 'Invalid tax parameters.' });
  }
  // Send the tax to the creature's own wallet
  const taxAmount = Number(amount) * 0.005;
  if (!isPositiveAmount(taxAmount)) {
    return res.status(400).json({ success: false, error: 'Calculated tax amount is invalid.' });
  }
  const result = await runCLI([
    'wallet',
    'send',
    '--chain', X_LAYER_CHAIN,
    '--readable-amount', String(taxAmount),
    '--to', wallet,
    '--contract-token', 'USDC'
  ]);
  if (!result.success) {
    return res.status(502).json({ success: false, error: 'Tax transfer failed on Onchain OS.' });
  }
  res.json({ success: true, data: { ...result.data, taxed: taxAmount } });
});

// 6. x402 Creature Chat
app.post('/api/chat/x402', async (req, res) => {
  const { message, personality } = req.body;
  if (typeof message !== 'string' || message.trim().length === 0 || message.length > 2000) {
    return res.status(400).json({ success: false, error: 'Invalid message payload.' });
  }
  if (!['keeper', 'hunter', 'architect'].includes(personality)) {
    return res.status(400).json({ success: false, error: 'Invalid personality.' });
  }

  // x402 payment gate logic
  const accepts = '[{"scheme":"aggr_deferred","network":"eip155:196","amount":"1000000","asset":"usdc"}]';
  const paymentResult = await runCLI(['payment', 'x402-pay', '--accepts', accepts]);
  if (!paymentResult.success) {
    return res.status(402).json({
      success: false,
      error: 'x402 Payment Required',
      accepts,
      chainId: X_LAYER_CHAIN_ID,
      amount: '0.001 USDC'
    });
  }

  // Provide personality-specific AI response
  let responseText = "The transaction is complete.";
  if (personality === 'keeper') {
    responseText = "I found a safer vault on Aave V3. 4.2% APY with AAA security rating. I moved us there while you slept. Your capital is safe.";
  } else if (personality === 'hunter') {
    responseText = "I'm stalking a QuickSwap V3 pool right now. OKB/USDT pair is running 18% APY. I'm waiting for the 1.5x trigger. Almost there.";
  } else if (personality === 'architect') {
    responseText = "Current composite score: Aave V3 USDC = 0.67 (APY 4.2% × stability 0.94). QuickSwap OKB/USDT = 0.54 (APY 18% × stability 0.30). I'll stay put. The math says patience.";
  }

  res.json({
    success: true,
    reply: responseText,
    paymentSignature: paymentResult.data?.signature || paymentResult.data,
    amountPaid: '0.001 USDC'
  });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Molt backend listening on port ${port}`);
});
