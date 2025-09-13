// Netlify Function - Faucet with Weekly Rate Limiting
// Sends 10 SONIC to user's wallet (once per week per address)

// Note: Netlify Functions use Node.js, so we use require() instead of import
const { ethers } = require('ethers');
const fs = require('fs').promises;
const path = require('path');

// Rate limiting functions
async function getRateLimitData() {
    try {
        const filePath = '/tmp/faucet-requests.json';
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // File doesn't exist or is empty, return empty object
        return {};
    }
}

async function saveRateLimitData(data) {
    try {
        const filePath = '/tmp/faucet-requests.json';
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error saving rate limit data:', error);
    }
}

function isWithinTimeout(timestamp, timeoutMinutes) {
    const timeoutMs = timeoutMinutes * 60 * 1000; // Convert minutes to milliseconds
    return Date.now() - timestamp < timeoutMs;
}

async function checkRateLimit(userAddress, timeoutMinutes) {
    const rateLimitData = await getRateLimitData();
    const lastRequest = rateLimitData[userAddress.toLowerCase()];
    
    if (lastRequest && isWithinTimeout(lastRequest, timeoutMinutes)) {
        const timeoutMs = timeoutMinutes * 60 * 1000;
        const timeLeft = (lastRequest + timeoutMs) - Date.now();
        const daysLeft = Math.ceil(timeLeft / (24 * 60 * 60 * 1000));
        return {
            allowed: false,
            daysLeft: daysLeft
        };
    }
    
    return { allowed: true };
}

async function recordRequest(userAddress) {
    const rateLimitData = await getRateLimitData();
    rateLimitData[userAddress.toLowerCase()] = Date.now();
    await saveRateLimitData(rateLimitData);
}

exports.handler = async (event, context) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { userAddress } = JSON.parse(event.body);
        
        // Validate input
        if (!userAddress || !ethers.isAddress(userAddress)) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Invalid wallet address' })
            };
        }

        // Check rate limiting (configurable timeout per address)
        const rateLimitCheck = await checkRateLimit(userAddress, TIMEOUT_MINUTES);
        if (!rateLimitCheck.allowed) {
            return {
                statusCode: 429,
                body: JSON.stringify({ 
                    error: `Faucet limit reached. You can request again in ${rateLimitCheck.daysLeft} day(s).`,
                    daysLeft: rateLimitCheck.daysLeft
                })
            };
        }

        // Faucet configuration from environment variables
        const RPC_URL = process.env.VITE_RPC_URL || 'https://api.testnet.sonic.game';
        const PRIVATE_KEY = process.env.VITE_FAUCET_PRIVATE_KEY; // Your test wallet private key
        const AMOUNT = process.env.VITE_FAUCET_AMOUNT || '10'; // 10 SONIC
        const TIMEOUT_MINUTES = parseInt(process.env.VITE_FAUCET_TIMEOUT) || 10080; // Default 7 days in minutes

        if (!PRIVATE_KEY) {
            throw new Error('Faucet private key not configured');
        }

        // Create provider and wallet
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const faucetWallet = new ethers.Wallet(PRIVATE_KEY, provider);

        // Check faucet balance
        const balance = await faucetWallet.provider.getBalance(faucetWallet.address);
        const amountWei = ethers.parseEther(AMOUNT);
        
        if (balance < amountWei) {
            return {
                statusCode: 503,
                body: JSON.stringify({ 
                    error: 'Faucet is empty', 
                    balance: ethers.formatEther(balance) 
                })
            };
        }

        // Rate limiting check (simple in-memory, resets on function restart)
        // For production, use a database or external service
        const userIP = event.headers['client-ip'] || event.headers['x-forwarded-for'] || 'unknown';
        
        // Send the transaction
        console.log(`Sending ${AMOUNT} SONIC to ${userAddress} from ${faucetWallet.address}`);
        
        const tx = await faucetWallet.sendTransaction({
            to: userAddress,
            value: amountWei,
            gasLimit: 21000 // Standard ETH transfer gas limit
        });

        console.log(`Transaction sent: ${tx.hash}`);
        
        // Wait for confirmation
        const receipt = await tx.wait();
        
        // Record this request for rate limiting
        await recordRequest(userAddress);
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*', // Adjust for production
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST'
            },
            body: JSON.stringify({
                success: true,
                txHash: tx.hash,
                amount: AMOUNT,
                to: userAddress,
                explorerUrl: `https://testnet.sonicscan.org/tx/${tx.hash}`
            })
        };

    } catch (error) {
        console.error('Faucet error:', error);
        
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                error: 'Faucet transaction failed',
                details: error.message 
            })
        };
    }
};
