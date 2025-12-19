export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    const { password } = req.body;
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

    if (password === ADMIN_PASSWORD) {
      const token = Buffer.from(`admin:${Date.now()}`).toString('base64');
      return res.status(200).json({ success: true, token });
    } else {
      return res.status(401).json({ success: false, error: 'Mật khẩu không đúng' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}


