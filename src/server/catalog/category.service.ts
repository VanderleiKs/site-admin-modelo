import { randomUUID } from 'node:crypto';
import type { Category } from '../../shared/models';
import { type Database, transaction } from '../db/database';
import { badRequest, conflict, notFound } from '../http/errors';
import { parseBody } from '../http/validation';
import { categorySchema } from './catalog.schemas';

const toCategory = (row: Record<string, unknown>): Category => ({
  id: String(row['id']),
  name: String(row['name']),
  slug: String(row['slug']),
  description: row['description'] === null ? null : String(row['description']),
  sortOrder: Number(row['sort_order']),
  productCount: Number(row['product_count'] ?? 0),
});

export class CategoryService {
  constructor(private readonly db: Database) {}

  /** @param onlyActive conta apenas produtos ativos (uso no site público). */
  list(onlyActive = false): Category[] {
    return this.db
      .prepare(
        `SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id ${onlyActive ? 'AND p.active = 1' : ''}) AS product_count
           FROM categories c ORDER BY c.sort_order, c.name`,
      )
      .all()
      .map(toCategory);
  }

  get(id: string): Category {
    const row = this.db
      .prepare(
        'SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) AS product_count FROM categories c WHERE id = ?',
      )
      .get(id);
    if (!row) throw notFound('Categoria não encontrada.');
    return toCategory(row);
  }

  create(body: unknown): Category {
    const input = parseBody(categorySchema, body);
    const id = randomUUID();
    this.assertSlugFree(input.slug);
    this.db
      .prepare(
        'INSERT INTO categories (id, name, slug, description, sort_order) VALUES (?, ?, ?, ?, ?)',
      )
      .run(id, input.name, input.slug, input.description, input.sortOrder);
    return this.get(id);
  }

  update(id: string, body: unknown): Category {
    this.get(id);
    const input = parseBody(categorySchema, body);
    this.assertSlugFree(input.slug, id);
    this.db
      .prepare(
        'UPDATE categories SET name = ?, slug = ?, description = ?, sort_order = ? WHERE id = ?',
      )
      .run(input.name, input.slug, input.description, input.sortOrder, id);
    return this.get(id);
  }

  /**
   * Exclui sem deixar produtos órfãos: se houver produtos, exige `moveTo` e os move
   * na mesma transação. O banco também impede a exclusão (FK RESTRICT).
   */
  delete(id: string, moveTo?: string): { movedProducts: number } {
    const category = this.get(id);
    if (category.productCount > 0 && !moveTo) {
      throw conflict(
        `A categoria possui ${category.productCount} produto(s). Escolha para qual categoria movê-los.`,
      );
    }
    if (moveTo) {
      if (moveTo === id) throw badRequest('A categoria de destino deve ser diferente.');
      this.get(moveTo);
    }
    return transaction(this.db, () => {
      const moved = moveTo
        ? Number(
            this.db
              .prepare('UPDATE products SET category_id = ? WHERE category_id = ?')
              .run(moveTo, id).changes,
          )
        : 0;
      this.db.prepare('DELETE FROM categories WHERE id = ?').run(id);
      return { movedProducts: moved };
    });
  }

  private assertSlugFree(slug: string, exceptId = ''): void {
    if (
      this.db.prepare('SELECT 1 FROM categories WHERE slug = ? AND id <> ?').get(slug, exceptId)
    ) {
      throw conflict('Já existe uma categoria com este slug.');
    }
  }
}
