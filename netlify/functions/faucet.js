// Netlify Function - Simple Faucet
// Sends 10 SONIC to user's wallet

// Note: Netlify Functions use Node.js, so we use require() instead of import
const { ethers } = require('ethers');

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

        // Faucet configuration from environment variables
        const RPC_URL = process.env.FAUCET_RPC_URL || 'https://api.testnet.sonic.game';
        const PRIVATE_KEY = process.env.FAUCET_PRIVATE_KEY; // Your test wallet private key
        const AMOUNT = process.env.FAUCET_AMOUNT || '10'; // 10 SONIC

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
