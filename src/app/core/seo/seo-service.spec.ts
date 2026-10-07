import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { SITE_ORIGIN } from '../tokens';
import { SeoService } from './seo-service';

describe('SeoService', () => {
  let seo: SeoService;
  let doc: Document;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: SITE_ORIGIN, useValue: 'https://exemplo.com.br' }],
    });
    seo = TestBed.inject(SeoService);
    doc = TestBed.inject(DOCUMENT);
  });

  it('define título, descrição, canônica e Open Graph', () => {
    seo.update({
      title: 'Produto X',
      description: 'Desc',
      path: '/produtos/x',
      image: '/uploads/a.png',
    });
    expect(doc.title).toBe('Produto X');
    expect(doc.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('Desc');
    expect(doc.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      'https://exemplo.com.br/produtos/x',
    );
    expect(doc.querySelector('meta[property="og:image"]')?.getAttribute('content')).toBe(
      'https://exemplo.com.br/uploads/a.png',
    );
  });

  it('remove a canônica e marca noindex em páginas de erro', () => {
    seo.update({ title: 'A', description: 'B', path: '/a' });
    seo.update({ title: '404', description: 'x', path: '/404', noindex: true });
    expect(doc.querySelector('link[rel="canonical"]')).toBeNull();
    expect(doc.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe(
      'noindex, nofollow',
    );
  });

  it('escapa "<" no JSON-LD', () => {
    seo.update({
      title: 'A',
      description: 'B',
      path: '/',
      jsonLd: { name: '</script><script>alert(1)</script>' },
    });
    const script = doc.querySelector('script[data-seo="jsonld"]');
    expect(script?.textContent).not.toContain('</script>');
    expect(JSON.parse(script?.textContent ?? '{}').name).toBe('</script><script>alert(1)</script>');
  });
});
