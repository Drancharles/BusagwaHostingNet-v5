export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  try {
    const { repoUrl, botToken, ownerID, type } = req.body;
    
    if (!repoUrl) {
      return res.status(400).json({ error: 'Repo URL required' });
    }

    const RENDER_API_KEY = process.env.RENDER_API_KEY;
    if (!RENDER_API_KEY) {
      return res.status(500).json({ error: 'RENDER_API_KEY not set in Vercel env' });
    }

    // Make ownerID OPTIONAL - fix for your error!
    const finalOwnerID = (ownerID && ownerID.length > 5) ? ownerID : '256740736550';
    const finalToken = botToken || 'not_needed';

    let envVars = [
      { key: 'OWNER_ID', value: finalOwnerID },
      { key: 'OWNER_NUMBER', value: finalOwnerID }
    ];
    
    if (finalToken !== 'not_needed') {
      envVars.push({ key: 'BOT_TOKEN', value: finalToken });
    }

    const serviceName = `site-${Date.now()}`;
    const isStatic = (type === 'static');

    const payload = {
      type: isStatic ? 'static_site' : 'web_service',
      name: serviceName,
      repo: repoUrl,
      branch: 'main',
      plan: 'free',
      envVars: envVars,
      buildCommand: isStatic ? '' : 'npm install',
      startCommand: isStatic ? '' : 'npm start'
    };

    if (isStatic) {
      payload.publishPath = './';
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
      return res.status(400).json({ error: data.message || JSON.stringify(data).slice(0,400) });
    }

    return res.status(200).json({ success: true, message: 'Deployed! Check render.com/dashboard', service: data });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
