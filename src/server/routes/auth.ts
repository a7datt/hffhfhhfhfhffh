import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { supabase } from '../db.js';
import { loginRateLimiter } from '../middleware.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_change_me_in_production';

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      res.status(400).json({ error: 'All fields are required' });
      return;
    }

    const { data: existingUser } = await supabase.from('users').select('id').eq('email', email).single();
    if (existingUser) {
      res.status(400).json({ error: 'Email already exists' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert({ name, email, password_hash: passwordHash })
      .select('id, email, name')
      .single();

    if (userError || !newUser) {
      throw userError || new Error('Failed to create user');
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await supabase.from('subscriptions').insert({
      user_id: newUser.id,
      status: 'active',
      max_wallets: 1,
      current_balance: 0,
      expires_at: expiresAt
    });

    const token = jwt.sign({ id: newUser.id, email: newUser.email }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, user: { id: newUser.id, name: newUser.name, email: newUser.email } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/login', loginRateLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, password_hash')
      .eq('email', email)
      .single();

    if (error || !user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
