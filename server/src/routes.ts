import { Router, Request, Response, NextFunction } from 'express';
import { query } from './db';
import express from 'express';
import bcrypt from 'bcryptjs';
import { Pool } from 'pg';

const router = Router();

// 認証チェックミドルウェア
const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if ((req as any).session && (req as any).session.userId) {
    next();
  } else {
    res.redirect('/login');
  }
};

// ログインページ
router.get('/login', (req, res) => {
  res.render('login', { error: null, appName: process.env.APP_NAME });
});

// ログイン処理
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  try {
    const { rows } = await query('SELECT * FROM users WHERE username = $1', [username]);
    const user = rows[0];
    
    if (user && await bcrypt.compare(password, user.password_hash)) {
      (req.session as any).userId = user.id;
      (req.session as any).username = user.username;
      res.redirect('/customers');
    } else {
      res.render('login', { error: 'ユーザー名またはパスワードが間違っています', appName: process.env.APP_NAME });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.render('login', { error: 'ログイン処理中にエラーが発生しました', appName: process.env.APP_NAME });
  }
});

// ログアウト
router.post('/logout', (req, res) => {
  (req as any).session.destroy((err: any) => {
    if (err) {
      console.error('Session destroy error:', err);
    }
    res.redirect('/login');
  });
});

router.get('/', async (req, res) => {
  res.redirect('/customers');
});

router.get('/customers', requireAuth, async (req, res) => {
  const { rows } = await query('SELECT * FROM customers ORDER BY id');
  res.render('customers_list', { rows, appName: process.env.APP_NAME, username: (req.session as any).username });
});

router.get('/customers/new', requireAuth, (req, res) => {
  res.render('customers_new', { appName: process.env.APP_NAME, username: (req.session as any).username });
});

router.post('/customers', requireAuth, async (req, res) => {
  const { name, email } = req.body;
  await query(
    'INSERT INTO customers(name, email, created_at, updated_at) VALUES($1,$2,NOW(),NOW())',
    [name, email]
  );
  res.redirect('/customers');
});

router.get('/customers/:id/edit', requireAuth, async (req, res) => {
  const { rows } = await query('SELECT * FROM customers WHERE id = $1', [req.params.id]);
  res.render('customers_edit', { c: rows[0], appName: process.env.APP_NAME, username: (req.session as any).username });
});

router.post('/customers/:id', requireAuth, async (req, res) => {
  const { name, email } = req.body;
  await query('UPDATE customers SET name=$1, email=$2, updated_at=NOW() WHERE id=$3', [name, email, req.params.id]);
  res.redirect('/customers');
});

router.post('/customers/:id/delete', requireAuth, async (req, res) => {
  await query('DELETE FROM customers WHERE id=$1', [req.params.id]);
  res.redirect('/customers');
});

export default router;