export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*'); // Adjust this to your Vercel frontend URL for better security
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        // 1. Extract data from the frontend form
        const { repoUrl, botToken, ownerID, type, extraEnv } = req.body;

        if (!repoUrl) {
            return res.status(400).json({ error: 'Repo URL is required' });
        }

        const RENDER_API_KEY = process.env.RENDER_API_KEY;
        if (!RENDER_API_KEY) {
            return res.status(500).json({ error: 'Render API Key missing in Vercel' });
        }

        // 2. Handle Owner ID (Make sure this is YOUR Render Owner ID, not the user's Telegram ID)
        // You should ideally store your Render Owner ID in Vercel env vars too.
        const RENDER_OWNER_ID = process.env.RENDER_OWNER_ID || 'tea-xxxxxxxx'; 

        // 3. Build the Environment Variables array for Render
        let envVars = [];
        
        // Add the bot token if provided
        if (botToken) {
            envVars.push({ key: 'BOT_TOKEN', value: botToken });
            envVars.push({ key: 'TELEGRAM_TOKEN', value: botToken }); // Covers both bases
        }
        
        // Add Owner ID if provided
        if (ownerID) {
            envVars.push({ key: 'OWNER_ID', value: ownerID });
            envVars.push({ key: 'OWNER_NUMBER', value: ownerID });
        }

        // Parse Extra ENV (e.g., "SESSION_ID=xxx;PREFIX=!")
        if (extraEnv) {
            const pairs = extraEnv.split(';');
            pairs.forEach(pair => {
                const [key, ...valueParts] = pair.split('=');
                if (key && valueParts.length > 0) {
                    envVars.push({ key: key.trim(), value: valueParts.join('=').trim() });
                }
            });
        }

        // ==========================================
        // 👇 ADD THIS CODE HERE 👇
        // ==========================================
        
        // 4. Determine start command based on Project Type
        let startCommand = 'npm start'; 
        let buildCommand = 'npm install';
        
        if (type === 'WhatsApp Bot') {
            startCommand = 'node index.js'; // Change this if your WhatsApp bot uses a different main file
        } else if (type === 'Telegram Bot') {
            startCommand = 'node index.js'; // Change this if your Telegram bot uses a different main file
        }

        // 5. Make the actual request to Render's API
        const renderResponse = await fetch('https://api.render.com/v1/services', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RENDER_API_KEY}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                type: 'web_service', // Render classifies bots that run continuously as web_services
                name: `bot-${Date.now()}`, // Generates a unique name for the bot
                ownerId: RENDER_OWNER_ID, // Must be YOUR Render account Owner ID
                repo: repoUrl,
                branch: 'main',
                autoDeploy: 'yes',
                envVars: envVars,
                serviceDetails: {
                    env: 'node',
                    plan: 'free', // or 'starter'
                    region: 'oregon', // Choose your preferred region (e.g., 'frankfurt', 'singapore')
                    buildCommand: buildCommand,
                    startCommand: startCommand,
                    envSpecificDetails: {
                        url: 'https://example.com' // Placeholder, Render will assign the actual URL
                    }
                }
            })
        });

        // 6. Check if Render rejected the request
        if (!renderResponse.ok) {
            const errorData = await renderResponse.json();
            console.error('Render API Error:', errorData);
            throw new Error(errorData.message || 'Render deployment failed');
        }

        // 7. Send success response back to your frontend
        const data = await renderResponse.json();
        return res.status(200).json({ success: true, message: 'Deployment started!', data: data });

        // ==========================================
        // 👆 END OF NEW CODE 👆
        // ==========================================

    } catch (error) {
        console.error('Deployment Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
