import type { ContentSource } from '../../shared/content-source';
import type {
  DashboardSummary,
  Product,
  ProductList,
  ProductQuery,
  PublicSite,
} from '../../shared/models';
import type { CategoryService } from '../catalog/category.service';
import type { ProductService } from '../catalog/product.service';
import type { SettingsService } from '../settings/settings.service';

/**
 * Leituras usadas pelo site público. É chamado tanto pela rota /api/public (navegação no
 * navegador) quanto diretamente pela renderização SSR — sem requisição HTTP intermediária.
 * Só expõe produtos ATIVOS.
 */
export class ContentService implements ContentSource {
  constructor(
    private readonly settings: SettingsService,
    private readonly categories: CategoryService,
    private readonly products: ProductService,
  ) {}

  site(): PublicSite {
    return { settings: this.settings.get(), categories: this.categories.list(true) };
  }

  productList(query: ProductQuery): ProductList {
    let category = null;
    if (query.category) {
      category = this.categories.list(true).find((c) => c.slug === query.category) ?? null;
      if (!category) return { items: [], category: null };
    }
    const items = this.products.list({
      onlyActive: true,
      featured: query.featured,
      categoryId: category?.id,
      limit: query.limit,
    });
    return { items, category };
  }

  product(slug: string): Product | null {
    return this.products.findActiveBySlug(slug);
  }

  sitemap(): { products: { slug: string; updatedAt: string }[]; categories: string[] } {
    return {
      products: this.products
        .list({ onlyActive: true })
        .map((p) => ({ slug: p.slug, updatedAt: p.updatedAt })),
      categories: this.categories
        .list(true)
        .filter((c) => c.productCount > 0)
        .map((c) => c.slug),
    };
  }

  dashboard(): DashboardSummary {
    const all = this.products.list();
    return {
      productCount: all.length,
      activeProductCount: all.filter((p) => p.active).length,
      featuredCount: all.filter((p) => p.featured).length,
      categoryCount: this.categories.list().length,
      productsWithoutImage: all.filter((p) => !p.mainImage).length,
      recentlyUpdated: [...all]
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, 5)
        .map(({ id, name, slug, active, updatedAt }) => ({ id, name, slug, active, updatedAt })),
    };
  }
}
