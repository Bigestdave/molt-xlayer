import { ethers } from 'ethers';
import chalk from 'chalk';
import dotenv from 'dotenv';

dotenv.config();

// X Layer Mainnet Addresses (Chain ID: 196)
const ROUTER_ADDRESS = "0x5507749f2C558bb3E162c6e90c314C092E7372fF"; // Uniswap V3 SwapRouter02
const WOKB_ADDRESS = "0xe538905cf8410324e03a5a23c1c177a474d59b2b";
const USDC_ADDRESS = "0x74b7f16337b8972027f6196a17a631ac6de26d22";

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)"
];

const ROUTER_ABI = [
  "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)"
];

/**
 * Execute a direct on-chain swap using Uniswap V3 on X Layer.
 * This bypasses centralized APIs and interacts directly with smart contracts.
 */
export async function executeAgentSwap(tokenInSymbol, tokenOutSymbol, amountInStr) {
  try {
    const rpcUrl = process.env.RPC_URL || "https://rpc.xlayer.tech";
    const privateKey = process.env.PRIVATE_KEY;

    if (!privateKey) {
      throw new Error("PRIVATE_KEY not found in .env");
    }

    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log(chalk.blue(`\n[Agentic Wallet] Initializing swap on X Layer (Chain 196)...`));
    console.log(chalk.gray(`[Info] Wallet Address: ${wallet.address}`));

    // For this hackathon demo, we'll map symbols to hardcoded X Layer addresses
    const tokenIn = tokenInSymbol.toUpperCase() === 'OKB' ? 'NATIVE' : (tokenInSymbol.toUpperCase() === 'USDC' ? USDC_ADDRESS : WOKB_ADDRESS);
    const tokenOut = tokenOutSymbol.toUpperCase() === 'OKB' ? WOKB_ADDRESS : (tokenOutSymbol.toUpperCase() === 'USDC' ? USDC_ADDRESS : null);

    if (!tokenOut) throw new Error(`Unsupported token: ${tokenOutSymbol}`);

    const amountIn = ethers.utils.parseEther(amountInStr);
    const router = new ethers.Contract(ROUTER_ADDRESS, ROUTER_ABI, wallet);

    // Uniswap V3 Fee (0.3% = 3000)
    const fee = 3000;
    const deadline = Math.floor(Date.now() / 1000) + 60 * 10; // 10 minutes from now

    let tx;

    if (tokenIn === 'NATIVE') {
      // Swapping Native OKB for USDC/WOKB
      console.log(chalk.yellow(`[Action] Swapping ${amountInStr} OKB for ${tokenOutSymbol}...`));
      
      const params = {
        tokenIn: WOKB_ADDRESS, // Wrap happens inside router if using WOKB as in
        tokenOut: tokenOut,
        fee: fee,
        recipient: wallet.address,
        amountIn: amountIn,
        amountOutMinimum: 0, // In production, use high slippage protection
        sqrtPriceLimitX96: 0
      };

      tx = await router.exactInputSingle(params, { 
        value: amountIn,
        gasLimit: 300000 
      });
    } else {
      // Token to Token swap
      const tokenContract = new ethers.Contract(tokenIn, ERC20_ABI, wallet);
      
      console.log(chalk.yellow(`[Action] Checking allowance for ${tokenInSymbol}...`));
      const allowance = await tokenContract.allowance(wallet.address, ROUTER_ADDRESS);
      
      if (allowance.lt(amountIn)) {
        console.log(chalk.cyan(`[Process] Approving ${tokenInSymbol}...`));
        const approveTx = await tokenContract.approve(ROUTER_ADDRESS, ethers.constants.MaxUint256);
        await approveTx.wait();
        console.log(chalk.green(`[Success] Approval confirmed.`));
      }

      const params = {
        tokenIn: tokenIn,
        tokenOut: tokenOut,
        fee: fee,
        recipient: wallet.address,
        amountIn: amountIn,
        amountOutMinimum: 0,
        sqrtPriceLimitX96: 0
      };

      tx = await router.exactInputSingle(params, { gasLimit: 300000 });
    }

    console.log(chalk.magenta(`[Transaction] Pushing to X Layer: ${tx.hash}`));
    const receipt = await tx.wait();
    
    console.log(chalk.greenBright(`[COMPLETE] Swap successful! Block: ${receipt.blockNumber}`));
    return { success: true, hash: tx.hash, block: receipt.blockNumber };

  } catch (error) {
    console.error(chalk.red(`\n[ERROR] Swap Failed: ${error.message}`));
    return { success: false, error: error.message };
  }
}
