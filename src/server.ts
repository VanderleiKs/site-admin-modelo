import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { createApiRouter } from './server/api';
import type { SsrRequestContext } from './shared/content-source';
import { renderSitemap, robotsTxt } from './server/content/seo-files';
import { loadConfig } from './server/config/env';
import { getServices, initServices } from './server/services';

// Variáveis do arquivo .env (as já definidas no ambiente têm precedência).
// Por isso a configuração só é lida abaixo, depois do .env.
if (existsSync('.env')) process.loadEnvFile('.env');

/**
 * Servidor único do projeto (Express):
 *   /api/*        API REST do painel e do site
 *   /uploads/*    imagens enviadas pelo painel (cache imutável)
 *   /robots.txt, /sitemap.xml
 *   demais rotas  Angular SSR (páginas públicas) ou shell do painel (/admin)
 */
const config = loadConfig();
// Banco e serviços são abertos na primeira requisição (não durante o build do Angular).
let api: express.Router | undefined;

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', config.trustProxy);

app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

// Garante que migrations, admin inicial e seed terminaram antes de atender.
app.use((_req, _res, next) => {
  initServices(config).then(() => next(), next);
});

app.use('/api', (req, res, next) => {
  api ??= createApiRouter(getServices(config));
  api(req, res, next);
});

app.use(
  '/uploads',
  express.static(config.uploadsDir, {
    immutable: true,
    maxAge: '1y',
    index: false,
    dotfiles: 'deny',
    // Arquivos enviados nunca executam script, mesmo se abertos diretamente.
    setHeaders: (res) =>
      res.setHeader(
        'Content-Security-Policy',
        "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      ),
  }),
  (_req, res) => res.status(404).end(),
);

const siteOrigin = (req: express.Request) =>
  config.publicSiteUrl || `${req.protocol}://${req.get('host')}`;

app.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(robotsTxt(siteOrigin(req)));
});

app.get('/sitemap.xml', (req, res) => {
  res.type('application/xml').setHeader('Cache-Control', 'no-cache');
  res.send(renderSitemap(siteOrigin(req), getServices(config).content.sitemap()));
});

app.use(
  express.static(join(import.meta.dirname, '../browser'), {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

// Hosts aceitos pelo SSR (proteção contra SSRF via cabeçalho Host).
const angularApp = new AngularNodeAppEngine({ allowedHosts: config.allowedHosts });

app.use((req, res, next) => {
  angularApp
    .handle(req, {
      content: getServices(config).content,
      siteOrigin: siteOrigin(req),
    } satisfies SsrRequestContext)
    .then((response) => {
      if (!response) return next();
      const isAdmin = req.path === '/admin' || req.path.startsWith('/admin/');
      // O HTML reflete o banco no momento da requisição: caches devem sempre revalidar.
      response.headers.set('Cache-Control', isAdmin ? 'no-store' : 'no-cache');
      if (isAdmin) response.headers.set('X-Robots-Tag', 'noindex, nofollow');
      return writeResponseToNodeResponse(response, res);
    })
    .catch(next);
});

if (isMainModule(import.meta.url) || process.env['pm_id']) {
  app.listen(config.port, config.host, (error) => {
    if (error) throw error;
    console.log(`Servidor em http://${config.host}:${config.port} — dados em ${config.dataDir}`);
  });
}

/** Usado pelo Angular CLI (ng serve e build). */
export const reqHandler = createNodeRequestHandler(app);
