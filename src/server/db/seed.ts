import type { Availability, ProductInput, SiteSettingsInput } from '../../shared/models';
import type { Services } from '../services';
import { aboutSvg, type CheeseShape, heroSvg, productSvg } from './demo-images';

/**
 * Conteúdo de DEMONSTRAÇÃO da marca fictícia "Queijos da Serra".
 * Só é inserido quando SEED_DEMO=true e o banco ainda não tem categorias.
 * Para um cliente real use SEED_DEMO=false e cadastre tudo pelo painel.
 */
const CATEGORIES = [
  {
    slug: 'queijos-frescos',
    name: 'Queijos frescos',
    description: 'Leves, macios e feitos para consumo em poucos dias.',
  },
  {
    slug: 'queijos-curados',
    name: 'Queijos curados',
    description: 'Maturados com paciência, de sabor marcante.',
  },
  {
    slug: 'especiais-da-casa',
    name: 'Especiais da casa',
    description: 'Receitas próprias com ervas e defumação.',
  },
  {
    slug: 'laticinios',
    name: 'Laticínios artesanais',
    description: 'Doce de leite, manteiga e outros feitos em pequenos lotes.',
  },
];

interface DemoProduct {
  slug: string;
  name: string;
  category: string;
  shape: CheeseShape;
  gallery?: CheeseShape[];
  short: string;
  description: string;
  priceCents: number | null;
  priceUnit: string | null;
  availability: Availability;
  featured: boolean;
}

const PRODUCTS: DemoProduct[] = [
  {
    slug: 'queijo-colonial',
    name: 'Queijo Colonial',
    category: 'queijos-curados',
    shape: 'wheel',
    gallery: ['wedge', 'block'],
    short: 'Massa amarelada, casca fina e sabor levemente adocicado. O clássico da casa.',
    description:
      'Produzido com leite fresco recebido todas as manhãs, o Queijo Colonial é prensado à mão e maturado por cerca de 30 dias.\n\nTem textura macia e sabor que fica mais intenso com o tempo. Vai bem puro, com pão caseiro ou derretido na chapa.\n\nPeças de aproximadamente 1 kg. Mantenha refrigerado.',
    priceCents: 6990,
    priceUnit: 'kg',
    availability: 'IN_STOCK',
    featured: true,
  },
  {
    slug: 'queijo-minas-frescal',
    name: 'Queijo Minas Frescal',
    category: 'queijos-frescos',
    shape: 'fresh',
    short: 'Branco, úmido e suave. Ideal para o café da manhã e lanches leves.',
    description:
      'Queijo fresco, levemente salgado e com textura úmida, feito em pequenos lotes.\n\nConsuma em até 10 dias após a abertura, mantendo sempre refrigerado.',
    priceCents: 3290,
    priceUnit: 'peça de 500 g',
    availability: 'IN_STOCK',
    featured: true,
  },
  {
    slug: 'ricota-fresca',
    name: 'Ricota Fresca',
    category: 'queijos-frescos',
    shape: 'ricotta',
    short: 'Leve e cremosa, perfeita para recheios, pastas e receitas doces.',
    description:
      'Ricota obtida do soro do leite, com textura delicada e sabor suave.\n\nProduto perecível: consuma em até 5 dias.',
    priceCents: 1890,
    priceUnit: 'peça de 400 g',
    availability: 'IN_STOCK',
    featured: false,
  },
  {
    slug: 'queijo-serrano-curado',
    name: 'Queijo Serrano Curado',
    category: 'queijos-curados',
    shape: 'wedge',
    short: 'Maturação longa, massa firme e sabor intenso. Produção limitada.',
    description:
      'Nosso queijo de maturação mais longa, de massa firme e levemente quebradiça.\n\nProduzido em quantidade limitada: trabalhamos sob consulta.',
    priceCents: null,
    priceUnit: null,
    availability: 'MADE_TO_ORDER',
    featured: true,
  },
  {
    slug: 'colonial-com-ervas',
    name: 'Colonial com Ervas Finas',
    category: 'especiais-da-casa',
    shape: 'herbs',
    short: 'A massa do colonial com orégano, manjericão e alecrim desidratados.',
    description:
      'Receita da casa que combina a massa do Queijo Colonial com ervas desidratadas. Ótimo para tábuas de frios.\n\nPeças de aproximadamente 500 g.',
    priceCents: 4490,
    priceUnit: 'peça de 500 g',
    availability: 'IN_STOCK',
    featured: true,
  },
  {
    slug: 'queijo-defumado',
    name: 'Queijo Defumado',
    category: 'especiais-da-casa',
    shape: 'smoked',
    short: 'Defumado lentamente, de casca dourada e aroma marcante.',
    description:
      'Depois de maturado, o queijo passa por defumação a frio, ganhando casca dourada e aroma característico.\n\nProduzido sob encomenda.',
    priceCents: 7990,
    priceUnit: 'kg',
    availability: 'MADE_TO_ORDER',
    featured: false,
  },
  {
    slug: 'doce-de-leite-artesanal',
    name: 'Doce de Leite Artesanal',
    category: 'laticinios',
    shape: 'jar',
    short: 'Cozido em tacho por horas, cremoso e no ponto de colher.',
    description:
      'Feito apenas com leite e açúcar, cozido lentamente até atingir cor caramelo.\n\nApós aberto, mantenha refrigerado.',
    priceCents: 2400,
    priceUnit: 'pote de 400 g',
    availability: 'IN_STOCK',
    featured: true,
  },
  {
    slug: 'manteiga-artesanal',
    name: 'Manteiga Artesanal com Sal',
    category: 'laticinios',
    shape: 'butter',
    short: 'Batida a partir de nata fresca, com uma pitada de sal.',
    description:
      'Manteiga de nata fresca, batida em pequenas quantidades e levemente salgada.\n\nMantenha refrigerada.',
    priceCents: 2290,
    priceUnit: 'tablete de 200 g',
    availability: 'IN_STOCK',
    featured: true,
  },
  {
    slug: 'requeijao-de-corte',
    name: 'Requeijão de Corte',
    category: 'laticinios',
    shape: 'block',
    short: 'Firme por fora, cremoso por dentro, com a casquinha tostada típica.',
    description:
      'Requeijão de corte tradicional, com casquinha levemente tostada. Excelente na chapa.\n\nTemporariamente indisponível.',
    priceCents: 3890,
    priceUnit: 'kg',
    availability: 'OUT_OF_STOCK',
    featured: false,
  },
];

export async function seedDemoContent(services: Services): Promise<void> {
  const { db, media, settings, categories, products } = services;
  if (Number(db.prepare('SELECT COUNT(*) AS n FROM categories').get()?.['n']) > 0) return;

  const svg = (content: string, name: string, alt: string) =>
    media.store(Buffer.from(content), 'image/svg+xml', name, alt);

  const hero = await svg(heroSvg(), 'hero.svg', 'Tábua com queijos artesanais e serra ao fundo');
  const about = await svg(aboutSvg(), 'sobre.svg', 'Prateleiras de maturação com queijos');
  const demoSettings: SiteSettingsInput = {
    companyName: 'Queijos da Serra',
    tagline: 'Queijaria artesanal',
    logoId: null,
    heroImageId: hero.id,
    aboutImageId: about.id,
    heroTitle: 'Queijos artesanais feitos sem pressa, do jeito da serra',
    heroSubtitle:
      'Leite fresco, receitas de família e maturação cuidadosa. Conheça nossos queijos e faça seu pedido direto com a queijaria.',
    aboutTitle: 'Uma pequena queijaria de família',
    aboutText:
      'A Queijos da Serra é uma marca fictícia criada para demonstrar este modelo de site. Ela representa uma pequena fábrica artesanal que transforma leite fresco em queijos produzidos em pequenos lotes.\n\nCada peça é feita à mão e acompanhada até o fim da maturação. Preferimos produzir menos e manter o cuidado em cada etapa.\n\nTodo o conteúdo desta demonstração — nomes, endereço, telefones e produtos — é ilustrativo e pode ser alterado pelo painel.',
    features: [
      { title: 'Leite fresco', description: 'Recebido diariamente e processado no mesmo dia.' },
      {
        title: 'Pequenos lotes',
        description: 'Produção limitada para acompanhar cada peça de perto.',
      },
      {
        title: 'Maturação cuidadosa',
        description: 'Peças viradas e escovadas manualmente durante a cura.',
      },
      {
        title: 'Pedido direto',
        description: 'Fale com a queijaria pelo WhatsApp e combine retirada ou entrega.',
      },
    ],
    processSteps: [
      {
        title: 'Seleção do leite',
        description: 'O leite chega cedo e é conferido antes da produção.',
      },
      {
        title: 'Coagulação e corte',
        description: 'A coalhada é cortada no tempo de cada receita.',
      },
      {
        title: 'Enformagem e salga',
        description: 'A massa vai para as formas, é prensada e salgada.',
      },
      { title: 'Maturação', description: 'As peças descansam até atingir o ponto ideal.' },
    ],
    phone: '(00) 0000-0000',
    whatsapp: '5500000000000',
    whatsappMessage: 'Olá! Vi o site da Queijos da Serra e gostaria de mais informações.',
    email: 'contato@queijosdaserra.example',
    address: 'Estrada da Serra, km 0 — Zona Rural (endereço fictício)',
    openingHours: 'Segunda a sexta, 8h às 18h · Sábado, 8h às 12h',
    instagramUrl: 'https://instagram.com/',
    facebookUrl: null,
    primaryColor: '#1f3d2b',
    secondaryColor: '#f6efe2',
    accentColor: '#c8922e',
    seoTitle: 'Queijos da Serra — Queijaria artesanal',
    seoDescription:
      'Queijos artesanais e laticínios produzidos em pequenos lotes. Conheça o catálogo e faça seu pedido pelo WhatsApp.',
  };
  await settings.update(demoSettings);

  const categoryIds = new Map<string, string>();
  CATEGORIES.forEach((c, i) =>
    categoryIds.set(c.slug, categories.create({ ...c, sortOrder: i }).id),
  );

  for (const [i, p] of PRODUCTS.entries()) {
    const main = await svg(productSvg(p.shape, i + 1), `${p.slug}.svg`, p.name);
    const gallery = [];
    for (const [j, shape] of (p.gallery ?? []).entries()) {
      gallery.push(await svg(productSvg(shape, i * 10 + j + 7), `${p.slug}-${j + 1}.svg`, p.name));
    }
    const input: ProductInput = {
      name: p.name,
      slug: p.slug,
      shortDescription: p.short,
      description: p.description,
      categoryId: categoryIds.get(p.category)!,
      priceCents: p.priceCents,
      priceUnit: p.priceUnit,
      availability: p.availability,
      featured: p.featured,
      active: true,
      sortOrder: i,
      mainImageId: main.id,
      galleryImageIds: gallery.map((g) => g.id),
    };
    products.create(input);
  }
  console.warn('[seed] Conteúdo de demonstração criado (SEED_DEMO=true).');
}
