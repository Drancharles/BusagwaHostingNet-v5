export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });

  try {
    const { repo, envVars } = req.body;
    const RENDER_API_KEY = process.env.RENDER_API_KEY;

    if (!RENDER_API_KEY) {
      return res.status(500).json({ error: 'RENDER_API_KEY missing in Vercel Settings > Environment Variables' });
    }
    if (!repo) {
      return res.status(400).json({ error: 'GitHub repo URL required' });
    }

    // Clean GitHub URL: https://github.com/user/repo -> https://github.com/user/repo
    const cleanRepo = repo.replace('.git','').trim();
    
    // Deploy to Render
    const renderRes = await fetch('https://api.render.com/v1/services', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RENDER_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        type: 'web_service',
        name: `busagwa-${Date.now()}`,
        autoDeploy: 'yes',
        repo: cleanRepo,
        branch: 'main',
        plan: 'free',
        runtime: 'node',
        buildCommand: 'npm install',
        startCommand: 'npm start',
        envVars: envVars ? Object.entries(envVars).map(([key,value])=>({key,value})) : []
      })
    });

    const data = await renderRes.json();

    if (!renderRes.ok) {
      return res.status(400).json({ error: data.message || JSON.stringify(data), details: data });
    }

    return res.status(200).json({ 
      success: true, 
      message: '🚀 Bot deploying to Render!',
      serviceId: data.id,
      dashboard: `https://dashboard.render.com/web/${data.id}`,
      logs: `https://dashboard.render.com/web/${data.id}/logs`
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}