/**
 * Contratos compartilhados entre o servidor (Express) e o cliente (Angular).
 * Contém apenas tipos e constantes simples (sem dependências de Node ou do Angular).
 */

export type Availability = 'IN_STOCK' | 'MADE_TO_ORDER' | 'OUT_OF_STOCK';

export const AVAILABILITY_LABELS: Readonly<Record<Availability, string>> = {
  IN_STOCK: 'Disponível',
  MADE_TO_ORDER: 'Sob encomenda',
  OUT_OF_STOCK: 'Indisponível no momento',
};

export interface ImageRef {
  readonly id: string;
  readonly url: string;
  readonly alt: string | null;
}

export interface TextItem {
  readonly title: string;
  readonly description: string;
}

export interface Category {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly description: string | null;
  readonly sortOrder: number;
  readonly productCount: number;
}

export interface Product {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly shortDescription: string;
  readonly description: string;
  readonly category: Pick<Category, 'id' | 'name' | 'slug'>;
  readonly priceCents: number | null;
  readonly priceUnit: string | null;
  readonly availability: Availability;
  readonly featured: boolean;
  readonly active: boolean;
  readonly sortOrder: number;
  readonly mainImage: ImageRef | null;
  readonly gallery: readonly ImageRef[];
  readonly updatedAt: string;
}

/** Campos editáveis das configurações do site (o que o painel envia). */
export interface SiteSettingsInput {
  readonly companyName: string;
  readonly tagline: string | null;
  readonly logoId: string | null;
  readonly heroImageId: string | null;
  readonly aboutImageId: string | null;
  readonly heroTitle: string;
  readonly heroSubtitle: string;
  readonly aboutTitle: string;
  readonly aboutText: string;
  readonly features: readonly TextItem[];
  readonly processSteps: readonly TextItem[];
  readonly phone: string | null;
  readonly whatsapp: string | null;
  readonly whatsappMessage: string | null;
  readonly email: string | null;
  readonly address: string | null;
  readonly openingHours: string | null;
  readonly instagramUrl: string | null;
  readonly facebookUrl: string | null;
  readonly primaryColor: string;
  readonly secondaryColor: string;
  readonly accentColor: string;
  readonly seoTitle: string;
  readonly seoDescription: string;
}

export interface SiteSettings extends SiteSettingsInput {
  readonly logo: ImageRef | null;
  readonly heroImage: ImageRef | null;
  readonly aboutImage: ImageRef | null;
  readonly updatedAt: string;
}

export interface PublicSite {
  readonly settings: SiteSettings;
  readonly categories: readonly Category[];
}

export interface ProductQuery {
  readonly category?: string | null;
  readonly featured?: boolean;
  readonly limit?: number;
}

export interface ProductList {
  readonly items: readonly Product[];
  /** Categoria filtrada (null se não houver filtro ou se o slug não existir). */
  readonly category: Category | null;
}

export interface ProductInput {
  readonly name: string;
  readonly slug: string;
  readonly shortDescription: string;
  readonly description: string;
  readonly categoryId: string;
  readonly priceCents: number | null;
  readonly priceUnit: string | null;
  readonly availability: Availability;
  readonly featured: boolean;
  readonly active: boolean;
  readonly sortOrder: number;
  readonly mainImageId: string | null;
  readonly galleryImageIds: readonly string[];
}

export interface CategoryInput {
  readonly name: string;
  readonly slug: string;
  readonly description: string | null;
  readonly sortOrder: number;
}

export interface AuthUser {
  readonly id: string;
  readonly email: string;
  readonly name: string;
}

export interface DashboardSummary {
  readonly productCount: number;
  readonly activeProductCount: number;
  readonly featuredCount: number;
  readonly categoryCount: number;
  readonly productsWithoutImage: number;
  readonly recentlyUpdated: readonly Pick<
    Product,
    'id' | 'name' | 'slug' | 'active' | 'updatedAt'
  >[];
}

export interface FieldError {
  readonly field: string;
  readonly message: string;
}

export interface ApiError {
  readonly status: number;
  readonly message: string;
  readonly errors?: readonly FieldError[];
}

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
