import {
  type ApplicationConfig,
  inject,
  mergeApplicationConfig,
  REQUEST_CONTEXT,
} from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import type { SsrRequestContext } from '../shared/content-source';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { ContentGateway } from './core/content/content-gateway';
import { ServerContentGateway } from './core/content/server-content-gateway';
import { SITE_ORIGIN } from './core/tokens';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    // No SSR o conteúdo é lido direto do backend (sem HTTP) e enviado ao navegador via TransferState.
    { provide: ContentGateway, useClass: ServerContentGateway },
    {
      provide: SITE_ORIGIN,
      useFactory: () => (inject(REQUEST_CONTEXT) as SsrRequestContext | null)?.siteOrigin ?? '',
    },
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
