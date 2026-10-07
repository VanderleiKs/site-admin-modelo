import type { SiteSettings, SiteSettingsInput } from '../../shared/models';
import { type Database, nowIso } from '../db/database';
import { parseBody } from '../http/validation';
import type { MediaService } from '../media/media.service';
import { DEFAULT_SETTINGS, settingsSchema } from './settings.schema';

/** Configurações do site (linha única, documento JSON). Fonte de todos os dados do cliente. */
export class SettingsService {
  constructor(
    private readonly db: Database,
    private readonly media: MediaService,
  ) {}

  private readInput(): { input: SiteSettingsInput; updatedAt: string } {
    const row = this.db.prepare('SELECT data, updated_at FROM settings WHERE id = 1').get();
    if (!row) return { input: DEFAULT_SETTINGS, updatedAt: nowIso() };
    // Mescla com os padrões para tolerar campos novos adicionados em versões futuras.
    const stored = JSON.parse(String(row['data'])) as Partial<SiteSettingsInput>;
    return { input: { ...DEFAULT_SETTINGS, ...stored }, updatedAt: String(row['updated_at']) };
  }

  get(): SiteSettings {
    const { input, updatedAt } = this.readInput();
    const images = this.media.findMany(
      [input.logoId, input.heroImageId, input.aboutImageId].filter((id): id is string => !!id),
    );
    const image = (id: string | null) => (id ? (images.get(id) ?? null) : null);
    return {
      ...input,
      logo: image(input.logoId),
      heroImage: image(input.heroImageId),
      aboutImage: image(input.aboutImageId),
      updatedAt,
    };
  }

  async update(body: unknown): Promise<SiteSettings> {
    const input = parseBody(settingsSchema, body);
    this.media.assertExist([input.logoId, input.heroImageId, input.aboutImageId]);
    const previous = this.readInput().input;
    this.db
      .prepare(
        `INSERT INTO settings (id, data, updated_at) VALUES (1, ?, ?)
         ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
      )
      .run(JSON.stringify(input), nowIso());
    await this.media.deleteIfUnused([previous.logoId, previous.heroImageId, previous.aboutImageId]);
    return this.get();
  }
}
