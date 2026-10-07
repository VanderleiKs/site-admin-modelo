import { DOCUMENT, inject, Injectable, RESPONSE_INIT } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { SITE_ORIGIN } from '../tokens';

export interface PageSeo {
  readonly title: string;
  readonly description: string;
  /** Caminho a partir da raiz, ex.: /produtos/queijo-colonial */
  readonly path: string;
  readonly image?: string | null;
  readonly type?: 'website' | 'product' | 'article';
  readonly noindex?: boolean;
  readonly jsonLd?: object | null;
}

/** Metadados por página (title, description, canônica, Open Graph, JSON-LD) e status HTTP do SSR. */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);
  private readonly origin = inject(SITE_ORIGIN);
  private readonly responseInit = inject(RESPONSE_INIT, { optional: true });

  absoluteUrl(path: string | null | undefined): string | null {
    if (!path) return null;
    return /^https?:\/\//i.test(path)
      ? path
      : `${this.origin}${path.startsWith('/') ? '' : '/'}${path}`;
  }

  update(page: PageSeo): void {
    const url = this.absoluteUrl(page.path) ?? '';
    const image = this.absoluteUrl(page.image);
    this.title.setTitle(page.title);
    this.setMeta('name', 'description', page.description);
    this.setMeta('name', 'robots', page.noindex ? 'noindex, nofollow' : 'index, follow');
    this.setMeta('property', 'og:title', page.title);
    this.setMeta('property', 'og:description', page.description);
    this.setMeta('property', 'og:type', page.type ?? 'website');
    this.setMeta('property', 'og:url', url);
    this.setMeta('property', 'og:locale', 'pt_BR');
    if (image) this.setMeta('property', 'og:image', image);
    else this.meta.removeTag("property='og:image'");
    this.setCanonical(page.noindex ? null : url);
    this.setJsonLd(page.jsonLd ?? null);
  }

  /** Define o status HTTP da resposta SSR (ex.: 404). Sem efeito no navegador. */
  setStatus(status: number): void {
    if (this.responseInit) this.responseInit.status = status;
  }

  private setMeta(attribute: 'name' | 'property', key: string, content: string): void {
    const selector = `${attribute}='${key}'`;
    if (this.meta.getTag(selector)) this.meta.updateTag({ [attribute]: key, content }, selector);
    else this.meta.addTag({ [attribute]: key, content });
  }

  private setCanonical(url: string | null): void {
    let link = this.document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!url) {
      link?.remove();
      return;
    }
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }

  private setJsonLd(data: object | null): void {
    this.document.head.querySelectorAll('script[data-seo="jsonld"]').forEach((el) => el.remove());
    if (!data) return;
    const script = this.document.createElement('script');
    script.setAttribute('type', 'application/ld+json');
    script.setAttribute('data-seo', 'jsonld');
    // "<" escapado impede que o conteúdo feche a tag <script>.
    script.textContent = JSON.stringify(data).replace(/</g, '\\u003c');
    this.document.head.appendChild(script);
  }
}
