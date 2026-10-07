import { z } from 'zod';
import type { SiteSettingsInput } from '../../shared/models';
import { optionalText, optionalUrl, requiredText } from '../http/validation';

const color = (label: string) =>
  z.string().regex(/^#[0-9a-fA-F]{6}$/, `${label}: use o formato #rrggbb.`);
const imageId = z
  .string()
  .uuid()
  .nullish()
  .transform((v) => v ?? null);
const textItem = z.object({
  title: requiredText('Título', 2, 80),
  description: requiredText('Descrição', 2, 400),
});

export const settingsSchema = z.object({
  companyName: requiredText('Nome da empresa', 2, 80),
  tagline: optionalText('Frase curta', 120),
  logoId: imageId,
  heroImageId: imageId,
  aboutImageId: imageId,
  heroTitle: requiredText('Título principal', 2, 120),
  heroSubtitle: requiredText('Texto de apoio', 2, 400),
  aboutTitle: requiredText('Título da apresentação', 2, 120),
  aboutText: requiredText('Texto de apresentação', 10, 6000),
  features: z.array(textItem).max(8, 'No máximo 8 diferenciais.'),
  processSteps: z.array(textItem).max(8, 'No máximo 8 etapas.'),
  phone: optionalText('Telefone', 30),
  whatsapp: z
    .string()
    .nullish()
    .transform((v) => (v ? v.replace(/\D/g, '') : null))
    .refine(
      (v) => v === null || /^\d{10,15}$/.test(v),
      'WhatsApp: informe de 10 a 15 dígitos, com DDI e DDD.',
    ),
  whatsappMessage: optionalText('Mensagem do WhatsApp', 300),
  email: z
    .string()
    .trim()
    .nullish()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || z.email().safeParse(v).success, 'Informe um e-mail válido.'),
  address: optionalText('Endereço', 300),
  openingHours: optionalText('Horário', 300),
  instagramUrl: optionalUrl('Instagram'),
  facebookUrl: optionalUrl('Facebook'),
  primaryColor: color('Cor principal'),
  secondaryColor: color('Cor de fundo'),
  accentColor: color('Cor de destaque'),
  seoTitle: requiredText('Título de SEO', 5, 70),
  seoDescription: requiredText('Descrição de SEO', 20, 170),
}) satisfies z.ZodType<SiteSettingsInput, unknown>;

/** Conteúdo neutro usado numa instalação nova (antes de qualquer configuração). */
export const DEFAULT_SETTINGS: SiteSettingsInput = {
  companyName: 'Minha Empresa',
  tagline: null,
  logoId: null,
  heroImageId: null,
  aboutImageId: null,
  heroTitle: 'Bem-vindo ao nosso site',
  heroSubtitle: 'Edite este texto em Painel → Configurações.',
  aboutTitle: 'Sobre nós',
  aboutText: 'Conte aqui a história da empresa. Edite este texto em Painel → Configurações.',
  features: [],
  processSteps: [],
  phone: null,
  whatsapp: null,
  whatsappMessage: null,
  email: null,
  address: null,
  openingHours: null,
  instagramUrl: null,
  facebookUrl: null,
  primaryColor: '#1f3d2b',
  secondaryColor: '#f6efe2',
  accentColor: '#c8922e',
  seoTitle: 'Minha Empresa',
  seoDescription: 'Conheça nossos produtos e entre em contato.',
};
