export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  try {
    const { repoUrl, botToken, ownerID, type, extraEnv } = req.body;
    if (!repoUrl) return res.status(400).json({ error: 'Repo URL required' });

    const RENDER_API_KEY = process.env.RENDER_API_KEY;
    if (!RENDER_API_KEY) return res.status(500).json({ error: 'RENDER_API_KEY missing in Vercel Env' });

    const finalOwner = ownerID || '267000000000';
    const finalToken = botToken || 'default';

    // Build env vars list
    let envVars = [];
    if (type === 'telegram') {
      envVars.push({ key: 'TELEGRAM_TOKEN', value: finalToken });
      envVars.push({ key: 'BOT_TOKEN', value: finalToken });
    } else if (type === 'discord') {
      envVars.push({ key: 'DISCORD_TOKEN', value: finalToken });
      envVars.push({ key: 'BOT_TOKEN', value: finalToken });
    } else {
      envVars.push({ key: 'BOT_TOKEN', value: finalToken });
    }
    envVars.push({ key: 'OWNER_ID', value: finalOwner });
    envVars.push({ key: 'OWNER_NUMBER', value: finalOwner });
    envVars.push({ key: 'NUMBER', value: finalOwner });

    // Parse extra env: SESSION_ID=xxx;PREFIX=.
    if (extraEnv) {
      extraEnv.split(';').forEach(pair => {
        const [k, v] = pair.split('=');
        if (k && v) envVars.push({ key: k.trim(), value: v.trim() });
      });
    }

    const serviceName = `${type}-${Date.now()}`;
    
    let payload = {
      type: type === 'static' ? 'static_site' : 'web_service',
      name: serviceName,
      repo: repoUrl,
      branch: 'main',
      plan: 'free',
      envVars: envVars
    };

    if (type === 'static') {
      payload.buildCommand = '';
      payload.publishPath = './';
    } else {
      payload.buildCommand = 'npm install';
      payload.startCommand = 'npm start';
    }

    const response = await fetch('https://api.render.com/v1/services', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RENDER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(400).json({ error: data.message || JSON.stringify(data).slice(0, 500) });
    }

    return res.status(200).json({ success: true, type: type, message: `${type} deployed! Check Render dashboard`, service: data });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
                                  }
