import { RenderMode, type ServerRoute } from '@angular/ssr';

/**
 * - /admin: renderizado só no navegador. O HTML do servidor não contém dados do painel.
 * - Demais rotas: renderizadas no servidor A CADA requisição, com dados atuais do banco
 *   (nada é pré-gerado no build — alterações do painel aparecem imediatamente).
 */
export const serverRoutes: ServerRoute[] = [
  { path: 'admin', renderMode: RenderMode.Client },
  { path: 'admin/**', renderMode: RenderMode.Client },
  { path: '**', renderMode: RenderMode.Server },
];
