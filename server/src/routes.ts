import { Router } from 'express';
import { query } from './db';

const router = Router();

router.get('/', async (req, res) => {
  res.redirect('/customers');
});

router.get('/customers', async (req, res) => {
  const { rows } = await query('SELECT * FROM customers ORDER BY id');
  res.render('customers_list', { rows, appName: process.env.APP_NAME });
});

router.get('/customers/new', (req, res) => {
  res.render('customers_new', { appName: process.env.APP_NAME });
});

router.post('/customers', async (req, res) => {
  const { name, email } = req.body;
  await query(
    'INSERT INTO customers(name, email, created_at, updated_at) VALUES($1,$2,NOW(),NOW())',
    [name, email]
  );
  res.redirect('/customers');
});

router.get('/customers/:id/edit', async (req, res) => {
  const { rows } = await query('SELECT * FROM customers WHERE id = $1', [req.params.id]);
  res.render('customers_edit', { c: rows[0], appName: process.env.APP_NAME });
});

router.post('/customers/:id', async (req, res) => {
  const { name, email } = req.body;
  await query('UPDATE customers SET name=$1, email=$2, updated_at=NOW() WHERE id=$3', [name, email, req.params.id]);
  res.redirect('/customers');
});

router.post('/customers/:id/delete', async (req, res) => {
  await query('DELETE FROM customers WHERE id=$1', [req.params.id]);
  res.redirect('/customers');
});

export default router;