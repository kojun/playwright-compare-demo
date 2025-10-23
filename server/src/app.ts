import express from 'express';
import path from 'path';
import router from './routes';
import expressLayouts from 'express-ejs-layouts';

const app = express();
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout'); // views/layout.ejs をデフォルトレイアウトに

app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

app.use('/', router);

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log(`[${process.env.APP_NAME}] listening on :${port}`);
});