/**
 * Migrations versionadas do SQLite. Cada item é aplicado uma única vez, em ordem,
 * dentro de uma transação. Para alterar o banco, ADICIONE uma nova migration
 * (nunca edite uma já publicada).
 */
export interface Migration {
  readonly version: number;
  readonly name: string;
  readonly sql: string;
}

export const MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    name: 'estrutura inicial',
    sql: `
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        failed_attempts INTEGER NOT NULL DEFAULT 0,
        locked_until TEXT,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );

      CREATE TABLE sessions (
        id TEXT PRIMARY KEY,
        token_hash TEXT NOT NULL UNIQUE,
        csrf_token TEXT NOT NULL,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );
      CREATE INDEX sessions_user_idx ON sessions(user_id);

      CREATE TABLE media (
        id TEXT PRIMARY KEY,
        file_name TEXT NOT NULL UNIQUE,
        mime_type TEXT NOT NULL,
        size_bytes INTEGER NOT NULL,
        original_name TEXT NOT NULL,
        alt TEXT,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );

      CREATE TABLE categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        description TEXT,
        sort_order INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        short_description TEXT NOT NULL,
        description TEXT NOT NULL,
        category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
        price_cents INTEGER CHECK (price_cents IS NULL OR price_cents >= 0),
        price_unit TEXT,
        availability TEXT NOT NULL DEFAULT 'IN_STOCK'
          CHECK (availability IN ('IN_STOCK', 'MADE_TO_ORDER', 'OUT_OF_STOCK')),
        main_image_id TEXT REFERENCES media(id) ON DELETE SET NULL,
        featured INTEGER NOT NULL DEFAULT 0,
        active INTEGER NOT NULL DEFAULT 1,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );
      CREATE INDEX products_listing_idx ON products(active, sort_order);
      CREATE INDEX products_category_idx ON products(category_id);

      CREATE TABLE product_images (
        product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        media_id TEXT NOT NULL REFERENCES media(id) ON DELETE RESTRICT,
        position INTEGER NOT NULL,
        PRIMARY KEY (product_id, media_id)
      );
      CREATE INDEX product_images_media_idx ON product_images(media_id);

      -- Configurações do site: linha única com documento JSON validado pela aplicação.
      CREATE TABLE settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        data TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );
    `,
  },
];
