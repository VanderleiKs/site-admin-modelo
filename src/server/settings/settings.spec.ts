import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PNG_1X1, startTestServer, TestClient, type TestServer } from '../testing/test-server';

describe('configurações do site (API)', () => {
  let server: TestServer;
  let admin: TestClient;

  beforeEach(async () => {
    server = await startTestServer();
    admin = new TestClient(server.url);
    await admin.login();
  });
  afterEach(() => server.close());

  it('instalação nova tem configurações neutras', async () => {
    const site = await new TestClient(server.url).request('GET', '/api/public/site');
    expect(site.body.settings.companyName).toBe('Minha Empresa');
  });

  it('salva, normaliza e publica imediatamente', async () => {
    const current = (await admin.request('GET', '/api/admin/settings')).body;
    const logo = (
      await admin.request('POST', '/api/admin/media', PNG_1X1, { 'content-type': 'image/png' })
    ).body;
    const saved = await admin.request('PUT', '/api/admin/settings', {
      ...current,
      companyName: 'Nova Empresa',
      whatsapp: '+55 (54) 99999-0000',
      logoId: logo.id,
    });
    expect(saved.status).toBe(200);
    expect(saved.body).toMatchObject({
      companyName: 'Nova Empresa',
      whatsapp: '5554999990000',
      logo: { id: logo.id },
    });

    const site = await new TestClient(server.url).request('GET', '/api/public/site');
    expect(site.body.settings.companyName).toBe('Nova Empresa');
    // imagem em uso pelas configurações não pode ser excluída
    expect((await admin.request('DELETE', `/api/admin/media/${logo.id}`)).status).toBe(409);
  });

  it('rejeita cor, URL e e-mail inválidos', async () => {
    const current = (await admin.request('GET', '/api/admin/settings')).body;
    const response = await admin.request('PUT', '/api/admin/settings', {
      ...current,
      primaryColor: 'vermelho',
      instagramUrl: 'javascript:alert(1)',
      email: 'nao-e-email',
    });
    expect(response.status).toBe(400);
    expect(response.body.errors.map((e: { field: string }) => e.field)).toEqual(
      expect.arrayContaining(['primaryColor', 'instagramUrl', 'email']),
    );
  });
});
