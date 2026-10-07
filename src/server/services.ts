import { AuthService } from './auth/auth.service';
import { LoginLimiter } from './auth/login-limiter';
import { CategoryService } from './catalog/category.service';
import { ProductService } from './catalog/product.service';
import { loadConfig, type ServerConfig } from './config/env';
import { ContentService } from './content/content.service';
import { type Database, openDatabase } from './db/database';
import { seedDemoContent } from './db/seed';
import { MediaService } from './media/media.service';
import { SettingsService } from './settings/settings.service';

/** Composição das dependências do backend (injeção manual, sem framework). */
export interface Services {
  readonly config: ServerConfig;
  readonly db: Database;
  readonly auth: AuthService;
  readonly loginLimiter: LoginLimiter;
  readonly media: MediaService;
  readonly categories: CategoryService;
  readonly products: ProductService;
  readonly settings: SettingsService;
  readonly content: ContentService;
}

export function createServices(
  config: ServerConfig,
  db: Database = openDatabase(config.databaseFile),
): Services {
  const media = new MediaService(db, config.uploadsDir);
  const categories = new CategoryService(db);
  const products = new ProductService(db, media);
  const settings = new SettingsService(db, media);
  return {
    config,
    db,
    auth: new AuthService(db, config),
    loginLimiter: new LoginLimiter(config.login.maxPerIpPer15Min),
    media,
    categories,
    products,
    settings,
    content: new ContentService(settings, categories, products),
  };
}

let instance: Services | undefined;
let ready: Promise<Services> | undefined;

/**
 * Instância única usada pelo servidor (API e SSR compartilham o mesmo banco).
 * Na primeira chamada: abre o banco, aplica migrations, cria o admin (via .env)
 * e, se SEED_DEMO=true e o banco estiver vazio, insere o conteúdo de demonstração.
 */
export function getServices(config: ServerConfig = loadConfig()): Services {
  instance ??= createServices(config);
  return instance;
}

export function initServices(config?: ServerConfig): Promise<Services> {
  ready ??= (async () => {
    const services = getServices(config);
    await services.auth.ensureAdmin();
    if (services.config.seedDemo) await seedDemoContent(services);
    await services.media.cleanupOrphans();
    return services;
  })();
  return ready;
}
