# Site institucional + painel — Angular 22 SSR

Uma única aplicação Angular com SSR que entrega:

- **Site público** renderizado no servidor (início, catálogo com filtro, página de produto, sobre, contato, 404), com SEO, sitemap e pedidos pelo WhatsApp;
- **Painel administrativo** em `/admin` (produtos, categorias, imagens, configurações do site, troca de senha);
- **API REST** no próprio Express do Angular SSR, com banco **SQLite nativo do Node** (`node:sqlite`) e imagens em disco.

Sem NestJS, sem PostgreSQL, sem serviços externos: um processo Node e uma pasta `data/`.

Cliente de demonstração: a marca fictícia **Queijos da Serra** (todos os dados são ilustrativos).

---

## Stack

| Item | Versão | Observação |
|---|---|---|
| Node.js | **24 LTS (≥ 24.15)** ou 22 (≥ 22.22.3) | exigência do Angular 22; `node:sqlite` embutido |
| Angular + `@angular/ssr` | 22.2 | standalone, signals, zoneless, OnPush, Reactive Forms |
| Express | 5 | já incluído pelo Angular SSR |
| Banco | SQLite (`node:sqlite`) | sem dependência nativa externa |
| Validação no servidor | zod 4 | |
| Estilos | Tailwind CSS 4 | fontes empacotadas via `@fontsource` |
| Testes | Vitest (app e servidor), `node:test` (SSR) | |
| TypeScript | **7.0** (`tsc`) + 6.0 interno do Angular | ver abaixo |

### TypeScript 7

O comando `tsc` do projeto é o **TypeScript 7.0.2** (compilador nativo): `npm run typecheck` verifica **todo** o código — site, painel, servidor e testes — em ~2 s, sem erros.

O **compilador do Angular 22 ainda exige TypeScript 6.0** (`peerDependency: >=6.0 <6.1`), porque usa a API JavaScript do TypeScript, que o TS 7 não oferece. Por isso:

- `typescript` (6.0) é usado internamente pelo `ng build` / `ng serve` (inclusive a checagem de tipos dos templates);
- `typescript7` (alias npm de `typescript@7.0.2`) fornece o `tsc` do projeto.

O `tsconfig` é compatível com as duas versões (nada de opções removidas no TS 7, como `baseUrl`, `moduleResolution: node10` ou `target: es5`). Quando o Angular passar a suportar o TS 7, basta remover o alias.

---

## Executar localmente

```bash
npm install
cp .env.example .env
```

Em `.env`, defina o administrador inicial (não há usuário/senha padrão):

```dotenv
ADMIN_EMAIL=voce@exemplo.com.br
ADMIN_PASSWORD=Uma-Senha-Forte-123   # ≥ 10 caracteres, 3 tipos (maiúsc., minúsc., números, símbolos)
```

```bash
npm start            # http://localhost:4200  (painel em /admin)
```

Na primeira requisição o servidor cria `data/site.db`, aplica as migrations, cria o administrador e, em desenvolvimento, insere o conteúdo de demonstração. Depois do primeiro acesso, apague `ADMIN_PASSWORD` do `.env`.

**Fluxo principal:** `/admin` → Produtos → Novo produto → preencha, envie a imagem → Cadastrar → "Ver no site". Edite e salve: ao recarregar a página do site, a alteração já aparece (sem rebuild).

### Produção local

```bash
npm run build
NODE_ENV=production PUBLIC_SITE_URL=http://localhost:4000 npm run serve   # http://localhost:4000
```

(Com `NODE_ENV=production` os cookies são `Secure`; sem HTTPS o login só funciona em `localhost`.)

---

## Comandos

| Comando | O que faz |
|---|---|
| `npm start` | Servidor de desenvolvimento com SSR, API e recarga automática (porta 4200) |
| `npm run build` | Build de produção (`dist/site-ssr`) |
| `npm run serve` | Executa o build de produção (porta `PORT`, padrão 4000) |
| `npm test` | Testes do servidor + testes do Angular |
| `npm run test:server` | API, banco, autenticação, uploads (Vitest, ambiente Node) |
| `npm run test:app` | Componentes e serviços Angular (`ng test`, Vitest) |
| `npm run test:ssr` | HTML renderizado no servidor + fluxo criar/editar/desativar (servidor no ar) |
| `npm run typecheck` | Verificação de tipos com TypeScript 7 |
| `npm run lint` | Typecheck + Prettier |
| `npm run format` | Formata o código |
| `npm run backup` | Backup do banco e das imagens |

`test:ssr`: `SITE_URL=http://localhost:4000 E2E_ADMIN_EMAIL=... E2E_ADMIN_PASSWORD=... npm run test:ssr`

---

## Estrutura

```
src/
├── server.ts                  # Express: segurança, /api, /uploads, robots, sitemap, SSR
├── server/                    # backend (roda só no Node)
│   ├── api.ts                 # monta /api/auth, /api/public, /api/admin
│   ├── services.ts            # composição das dependências (injeção manual)
│   ├── config/env.ts          # variáveis de ambiente
│   ├── db/                    # conexão SQLite, migrations, seed de demonstração
│   ├── http/                  # erros padronizados e validação (zod)
│   ├── auth/                  # senhas (scrypt), sessões, CSRF, limite de login
│   ├── catalog/               # produtos e categorias (serviços, schemas, rotas)
│   ├── media/                 # upload e remoção de imagens
│   ├── settings/              # configurações do site
│   ├── content/               # leituras públicas (API e SSR), robots/sitemap
│   └── testing/               # servidor de teste (banco em memória)
├── shared/                    # contratos usados pelos dois lados (tipos e constantes)
│   ├── models.ts
│   └── content-source.ts
└── app/                       # Angular
    ├── core/                  # serviços de aplicação (sem UI)
    │   ├── content/           # ContentGateway + implementações servidor/navegador
    │   ├── auth/  admin-api/  seo/  site/  ui/  utils/
    ├── shared/ui/             # componentes reutilizáveis (ícone, cartão de produto, estados)
    └── features/
        ├── public/            # layout, páginas e componentes do site
        └── admin/             # layout, páginas e componentes do painel
```

Convenções:

- Todo componente tem **TypeScript e template separados** (`nome.ts` + `nome.html`, `templateUrl`), seguindo a nomenclatura do guia de estilo atual do Angular (sem sufixo `.component`).
- Componentes standalone, `ChangeDetectionStrategy.OnPush`, `inject()`, `input()`/`output()`, signals para estado e `computed` para valores derivados (sem chamadas de formatação no template).
- Rotas por feature com *lazy loading*; o painel não entra no bundle inicial do site.
- O navegador nunca importa código de `src/server` (verificado no bundle).

---

## Como as alterações aparecem sem rebuild

```
Visitante → Express → Angular SSR ──(REQUEST_CONTEXT)──► ContentService ──► SQLite
                          │
                          └─ HTML + TransferState ──► navegador hidrata sem nova consulta
Painel → /api/admin/... ──► grava no SQLite (a próxima renderização já lê o dado novo)
```

1. As páginas públicas usam `RenderMode.Server`: o HTML é gerado **a cada requisição**. Nada é pré-renderizado no build.
2. No SSR o Angular **não faz requisição HTTP para si mesmo**: o `server.ts` passa o `ContentService` pelo `REQUEST_CONTEXT`, e o `ServerContentGateway` lê o banco direto (SQLite local, consultas síncronas de microssegundos). Por isso não há cache de conteúdo para invalidar.
3. O resultado vai para o `TransferState`; no navegador, o `HttpContentGateway` reaproveita esse dado na hidratação (zero chamadas à API na carga inicial, conteúdo idêntico ao HTML). Navegações seguintes usam `/api/public/*`.
4. O HTML sai com `Cache-Control: no-cache` e a API pública com `no-cache` + ETag (revalidação barata, 304). Imagens enviadas têm nome único e cache `immutable` de 1 ano.
5. O painel (`/admin`) usa `RenderMode.Client`: o servidor entrega só o shell, sem dados nem consultas privadas no SSR.

Se colocar uma CDN na frente, mantenha o HTML sem cache na borda (ou purgue após salvar no painel); `/uploads/*` e os arquivos com hash podem ficar em cache longo.

---

## Segurança implementada

| Item | Como |
|---|---|
| Senhas | scrypt (N=2¹⁵, r=8, p=3), comparação em tempo constante, política mínima de força |
| Sessão | token aleatório de 256 bits em cookie `HttpOnly`, `SameSite=Lax`, `Secure` + prefixo `__Host-` em produção; o banco guarda só o SHA-256; logout e troca de senha encerram sessões |
| CSRF | cookie `XSRF-TOKEN` + cabeçalho `X-XSRF-TOKEN` (enviado automaticamente pelo `HttpClient`) obrigatório em escritas; login aceita apenas JSON |
| Abuso de login | bloqueio da conta após N falhas, limite por IP, mensagem genérica e tempo equalizado para e-mail inexistente |
| Autorização | todas as rotas `/api/admin/*` passam por `requireAuth` no servidor |
| Entrada | zod em todas as rotas (tamanhos, slugs, cores, URLs só http/https, e-mail, WhatsApp); campos extras ignorados; corpo JSON até 100 KB |
| Uploads | só autenticado; até 5 MB; tipo detectado pelo conteúdo (JPEG/PNG/WebP; SVG recusado); nome UUID; servidos com `nosniff` e CSP `sandbox` |
| Banco | consultas parametrizadas, chaves estrangeiras (`RESTRICT`/`SET NULL`), transações |
| SSR | `allowedHosts` (proteção contra SSRF via `Host`), painel fora do SSR, `X-Robots-Tag: noindex` no painel |
| Cabeçalhos | `nosniff`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy` |
| Segredos | só no `.env` (fora do Git); nada vai ao navegador |

---

## Implantação

Requer **um processo Node.js contínuo** (não funciona em hospedagem só estática). Exemplo em VPS:

```bash
git clone <repo> /srv/site && cd /srv/site
npm ci && npm run build
cp .env.example .env    # NODE_ENV=production, PUBLIC_SITE_URL, ADMIN_EMAIL/ADMIN_PASSWORD, TRUST_PROXY=1
node dist/site-ssr/server/server.mjs   # use systemd ou PM2 para manter no ar
```

`/etc/systemd/system/site.service`:

```ini
[Service]
User=site
WorkingDirectory=/srv/site
ExecStart=/usr/bin/node dist/site-ssr/server/server.mjs
Restart=always
Environment=NODE_ENV=production
```

HTTPS com Caddy (certificado automático):

```
www.dominio-do-cliente.com.br {
  request_body { max_size 6MB }
  reverse_proxy 127.0.0.1:4000
}
```

Com Nginx: `proxy_pass http://127.0.0.1:4000;`, `proxy_set_header Host $host;`, `X-Forwarded-For`/`X-Forwarded-Proto`, `client_max_body_size 6m;` e certificado via certbot.

**Importante:** `PUBLIC_SITE_URL` (e `ALLOWED_HOSTS`, se houver mais domínios) deve conter o domínio público; para um host fora da lista o Angular recusa o SSR.

### Backup

Tudo fica em `DATA_DIR` (padrão `./data`): `site.db` e `uploads/`.

```bash
npm run backup                  # ./backups/AAAA-MM-DD_HHMMSS/ com site.db e uploads/
npm run backup -- /mnt/backup   # outro destino
```

O banco é copiado com a API de backup do SQLite (consistente mesmo com o servidor no ar). Agende com cron, guarde as cópias fora do servidor e teste a restauração: pare o serviço, coloque `site.db` e `uploads/` de volta em `DATA_DIR` e inicie.

### Checklist de produção

- [ ] `NODE_ENV=production`, HTTPS ativo, `TRUST_PROXY` coerente com o proxy
- [ ] `PUBLIC_SITE_URL` com o domínio final (confira que `/` traz o `<h1>` no HTML)
- [ ] Administrador criado e `ADMIN_PASSWORD` removido do `.env` (`chmod 600 .env`)
- [ ] `SEED_DEMO` vazio/false; conteúdo e contatos reais cadastrados no painel
- [ ] Backup diário de `data/` com cópia externa
- [ ] Sitemap enviado ao Google Search Console

---

## Reutilizar para outro cliente

Copie o repositório, crie um `.env` novo com `SEED_DEMO=false` e cadastre tudo pelo painel (nome, logotipo, cores, textos, contatos, SEO, categorias e produtos). O que é específico do cliente fica no banco; o código não muda.

Ajustes opcionais em código: favicon (`public/favicon.svg`), `theme-color` (`src/index.html`), fontes (`src/styles.css`), rótulos como "Produtos" (`features/public/layout/site-header`), e o seed de demonstração (`src/server/db/seed.ts`).

Para um novo campo configurável: adicione em `SiteSettingsInput` (`src/shared/models.ts`), no schema (`src/server/settings/settings.schema.ts`), no formulário (`features/admin/pages/settings`) e use `store.settings()` no componente.

Alterações no banco: adicione uma nova migration em `src/server/db/migrations.ts` (aplicada automaticamente ao iniciar).

---

## O que mudou em relação à versão anterior (NestJS + PostgreSQL)

Removidos para simplificar: NestJS, Prisma/PostgreSQL, Cloudflare R2, `sharp` (conversão de imagens), papéis de usuário, reordenação por arrastar (agora há o campo "Ordem de exibição"), redes YouTube/TikTok e seleção de seções da home (as seções aparecem quando têm conteúdo). Se o cliente precisar de armazenamento externo de imagens, o ponto de troca é `src/server/media/media.service.ts`.
