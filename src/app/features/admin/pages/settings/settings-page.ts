import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  type FormArray,
  type FormGroup,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import type {
  ImageRef,
  SiteSettings,
  SiteSettingsInput,
  TextItem,
} from '../../../../../shared/models';
import { AdminApi } from '../../../../core/admin-api/admin-api';
import { ToastService } from '../../../../core/ui/toast-service';
import { errorMessage, fieldErrors } from '../../../../core/utils/api-error';
import { Icon } from '../../../../shared/ui/icon/icon';
import { ImageUploader } from '../../components/image-uploader/image-uploader';

type ListKey = 'features' | 'processSteps';

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const URL_PATTERN = /^https?:\/\/\S+$/i;
const MAX_ITEMS = 8;

/** Identidade, textos, contatos e SEO do site — tudo que é específico do cliente. */
@Component({
  selector: 'app-settings-page',
  imports: [ReactiveFormsModule, ImageUploader, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './settings-page.html',
})
export class SettingsPage {
  private readonly api = inject(AdminApi);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly loaded = signal(false);
  protected readonly loadError = signal('');
  protected readonly saving = signal(false);
  protected readonly busy = signal(false);
  protected readonly formError = signal('');
  private readonly serverErrors = signal<Readonly<Record<string, string>>>({});
  protected readonly logo = signal<ImageRef | null>(null);
  protected readonly heroImage = signal<ImageRef | null>(null);
  protected readonly aboutImage = signal<ImageRef | null>(null);

  protected readonly maxItems = MAX_ITEMS;
  protected readonly colorFields = [
    { key: 'primaryColor', label: 'Cor principal' },
    { key: 'secondaryColor', label: 'Cor de fundo' },
    { key: 'accentColor', label: 'Cor de destaque' },
  ] as const;
  protected readonly socialFields = [
    { key: 'instagramUrl', label: 'Instagram' },
    { key: 'facebookUrl', label: 'Facebook' },
  ] as const;
  protected readonly lists = [
    { key: 'features', label: 'Diferenciais' },
    { key: 'processSteps', label: 'Etapas do processo' },
  ] as const;

  protected readonly form = this.fb.group({
    companyName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
    tagline: ['', Validators.maxLength(120)],
    primaryColor: ['#1f3d2b', [Validators.required, Validators.pattern(HEX_COLOR)]],
    secondaryColor: ['#f6efe2', [Validators.required, Validators.pattern(HEX_COLOR)]],
    accentColor: ['#c8922e', [Validators.required, Validators.pattern(HEX_COLOR)]],
    heroTitle: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    heroSubtitle: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(400)]],
    aboutTitle: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    aboutText: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(6000)]],
    features: this.fb.array<FormGroup>([]),
    processSteps: this.fb.array<FormGroup>([]),
    phone: ['', Validators.maxLength(30)],
    whatsapp: ['', Validators.pattern(/^[\d\s()+-]{0,25}$/)],
    whatsappMessage: ['', Validators.maxLength(300)],
    email: ['', Validators.email],
    address: ['', Validators.maxLength(300)],
    openingHours: ['', Validators.maxLength(300)],
    instagramUrl: ['', Validators.pattern(URL_PATTERN)],
    facebookUrl: ['', Validators.pattern(URL_PATTERN)],
    seoTitle: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(70)]],
    seoDescription: [
      '',
      [Validators.required, Validators.minLength(20), Validators.maxLength(170)],
    ],
  });

  constructor() {
    this.api.settings().subscribe({
      next: (settings) => this.fill(settings),
      error: (error: unknown) => this.loadError.set(errorMessage(error)),
    });
  }

  protected arr(key: ListKey): FormArray<FormGroup> {
    return this.form.controls[key];
  }

  protected addItem(key: ListKey): void {
    this.arr(key).push(this.itemGroup());
  }

  protected removeItem(key: ListKey, index: number): void {
    this.arr(key).removeAt(index);
  }

  /** Mensagem de erro do campo (servidor tem prioridade). */
  protected err(name: string): string {
    const server = this.serverErrors()[name];
    if (server) return server;
    const control = this.form.get(name);
    if (!control?.invalid || !(control.touched || control.dirty)) return '';
    const errors = control.errors ?? {};
    if (errors['required']) return 'Campo obrigatório.';
    if (errors['minlength']) return `Mínimo de ${errors['minlength'].requiredLength} caracteres.`;
    if (errors['maxlength']) return `Máximo de ${errors['maxlength'].requiredLength} caracteres.`;
    if (errors['email']) return 'E-mail inválido.';
    if (name.endsWith('Color')) return 'Use o formato #rrggbb.';
    if (name.endsWith('Url')) return 'Informe uma URL completa (https://…).';
    return 'Formato inválido.';
  }

  protected save(): void {
    this.formError.set('');
    this.serverErrors.set({});
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.formError.set('Corrija os campos destacados.');
      return;
    }
    this.saving.set(true);
    this.api.saveSettings(this.toInput()).subscribe({
      next: (settings) => {
        this.saving.set(false);
        this.fill(settings);
        this.toast.success('Configurações salvas — o site já está atualizado.');
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.serverErrors.set(fieldErrors(error));
        this.formError.set(errorMessage(error, 'Não foi possível salvar.'));
      },
    });
  }

  private itemGroup(item: TextItem = { title: '', description: '' }): FormGroup {
    return this.fb.group({
      title: [item.title, [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
      description: [
        item.description,
        [Validators.required, Validators.minLength(2), Validators.maxLength(400)],
      ],
    });
  }

  private toInput(): SiteSettingsInput {
    const v = this.form.getRawValue();
    const optional = (value: string) => value.trim() || null;
    return {
      ...v,
      tagline: optional(v.tagline),
      phone: optional(v.phone),
      whatsapp: optional(v.whatsapp),
      whatsappMessage: optional(v.whatsappMessage),
      email: optional(v.email),
      address: optional(v.address),
      openingHours: optional(v.openingHours),
      instagramUrl: optional(v.instagramUrl),
      facebookUrl: optional(v.facebookUrl),
      features: v.features as TextItem[],
      processSteps: v.processSteps as TextItem[],
      logoId: this.logo()?.id ?? null,
      heroImageId: this.heroImage()?.id ?? null,
      aboutImageId: this.aboutImage()?.id ?? null,
    };
  }

  private fill(settings: SiteSettings): void {
    for (const key of ['features', 'processSteps'] as const) {
      this.arr(key).clear();
      settings[key].forEach((item) => this.arr(key).push(this.itemGroup(item)));
    }
    // As listas já foram preenchidas acima (FormArray); aqui só os campos simples.
    const { features: _features, processSteps: _steps, ...fields } = settings;
    this.form.patchValue({
      ...fields,
      tagline: settings.tagline ?? '',
      phone: settings.phone ?? '',
      whatsapp: settings.whatsapp ?? '',
      whatsappMessage: settings.whatsappMessage ?? '',
      email: settings.email ?? '',
      address: settings.address ?? '',
      openingHours: settings.openingHours ?? '',
      instagramUrl: settings.instagramUrl ?? '',
      facebookUrl: settings.facebookUrl ?? '',
    });
    this.logo.set(settings.logo);
    this.heroImage.set(settings.heroImage);
    this.aboutImage.set(settings.aboutImage);
    this.form.markAsPristine();
    this.loaded.set(true);
  }
}
