import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  type OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  type AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  type ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  type Availability,
  AVAILABILITY_LABELS,
  type ImageRef,
  type Product,
  type ProductInput,
} from '../../../../../shared/models';
import { AdminApi } from '../../../../core/admin-api/admin-api';
import { ConfirmService } from '../../../../core/ui/confirm-service';
import { ToastService } from '../../../../core/ui/toast-service';
import { errorMessage, fieldErrors } from '../../../../core/utils/api-error';
import { centsToInput, parsePrice, SLUG_PATTERN, slugify } from '../../../../core/utils/format';
import { Icon } from '../../../../shared/ui/icon/icon';
import { ImageUploader } from '../../components/image-uploader/image-uploader';

function priceValidator(control: AbstractControl<string>): ValidationErrors | null {
  const cents = parsePrice(control.value);
  if (cents === null) return null;
  return Number.isNaN(cents) ? { price: 'Use o formato 49,90.' } : null;
}

const MAX_GALLERY = 12;

/** Cadastro e edição de produto (/admin/produtos/novo e /admin/produtos/:id). */
@Component({
  selector: 'app-product-form-page',
  imports: [ReactiveFormsModule, RouterLink, ImageUploader, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './product-form-page.html',
})
export class ProductFormPage implements OnInit {
  /** Parâmetro :id da rota (withComponentInputBinding). Ausente no cadastro. */
  readonly id = input<string>();

  private readonly api = inject(AdminApi);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly maxGallery = MAX_GALLERY;
  protected readonly isEdit = computed(() => !!this.id());
  protected readonly categories = toSignal(this.api.categories(), { initialValue: [] });
  protected readonly loading = signal(false);
  protected readonly loadError = signal('');
  protected readonly saving = signal(false);
  protected readonly formError = signal('');
  protected readonly saved = signal<Product | null>(null);
  protected readonly mainImage = signal<ImageRef | null>(null);
  protected readonly gallery = signal<readonly ImageRef[]>([]);
  private readonly uploads = signal<Readonly<Record<string, boolean>>>({});
  protected readonly uploadingCount = computed(
    () => Object.values(this.uploads()).filter(Boolean).length,
  );
  private slugEdited = false;

  protected readonly availabilityOptions = (Object.keys(AVAILABILITY_LABELS) as Availability[]).map(
    (value) => ({
      value,
      label: AVAILABILITY_LABELS[value],
    }),
  );

  protected readonly form = inject(NonNullableFormBuilder).group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    slug: ['', [Validators.required, Validators.maxLength(140), Validators.pattern(SLUG_PATTERN)]],
    shortDescription: [
      '',
      [Validators.required, Validators.minLength(10), Validators.maxLength(280)],
    ],
    description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(5000)]],
    categoryId: ['', Validators.required],
    price: ['', priceValidator],
    priceUnit: ['', Validators.maxLength(30)],
    availability: ['IN_STOCK' as Availability],
    sortOrder: [0, [Validators.required, Validators.min(0)]],
    featured: [false],
    active: [true],
  });

  ngOnInit(): void {
    const id = this.id();
    if (!id) return;
    this.slugEdited = true;
    this.loading.set(true);
    this.api
      .product(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (product) => {
          this.fill(product);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.loadError.set(errorMessage(error, 'Produto não encontrado.'));
        },
      });
  }

  protected onNameInput(): void {
    if (!this.slugEdited) this.form.controls.slug.setValue(slugify(this.form.controls.name.value));
  }

  protected markSlugEdited(): void {
    this.slugEdited = true;
  }

  protected invalid(name: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || control.dirty);
  }

  /** Mensagem do servidor (se houver) ou a mensagem padrão do campo. */
  protected errorFor(name: keyof typeof this.form.controls, fallback: string): string {
    const errors = this.form.controls[name].errors;
    return (
      (errors?.['server'] as string | undefined) ??
      (errors?.['price'] as string | undefined) ??
      fallback
    );
  }

  protected setUploading(key: string, busy: boolean): void {
    this.uploads.update((state) => ({ ...state, [key]: busy }));
  }

  protected addGallery(image: ImageRef): void {
    this.gallery.update((list) => [...list, image]);
  }

  protected removeGallery(index: number): void {
    this.gallery.update((list) => list.filter((_, i) => i !== index));
  }

  protected moveGallery(index: number, delta: -1 | 1): void {
    this.gallery.update((list) => {
      const next = [...list];
      [next[index], next[index + delta]] = [next[index + delta], next[index]];
      return next;
    });
  }

  protected submit(): void {
    this.formError.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.formError.set('Corrija os campos destacados.');
      return;
    }
    const id = this.id();
    this.saving.set(true);
    this.api.saveProduct(this.toInput(), id).subscribe({
      next: (product) => {
        this.saving.set(false);
        if (id) {
          this.fill(product);
          this.toast.success(
            product.active
              ? 'Alterações salvas — o site já está atualizado.'
              : 'Alterações salvas.',
          );
        } else {
          this.toast.success(
            product.active
              ? 'Produto cadastrado e publicado no site.'
              : 'Produto cadastrado (inativo).',
          );
          void this.router.navigate(['/admin/produtos', product.id]);
        }
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.showServerErrors(error);
      },
    });
  }

  protected async remove(): Promise<void> {
    const product = this.saved();
    if (!product) return;
    const confirmed = await this.confirm.ask({
      title: 'Excluir produto?',
      message: `"${product.name}" será removido definitivamente.`,
      confirmLabel: 'Excluir',
    });
    if (!confirmed) return;
    this.api.deleteProduct(product.id).subscribe({
      next: () => {
        this.toast.success('Produto excluído.');
        void this.router.navigate(['/admin/produtos']);
      },
      error: (error: unknown) => this.toast.error(errorMessage(error)),
    });
  }

  private toInput(): ProductInput {
    const v = this.form.getRawValue();
    return {
      name: v.name.trim(),
      slug: v.slug.trim(),
      shortDescription: v.shortDescription.trim(),
      description: v.description.trim(),
      categoryId: v.categoryId,
      priceCents: parsePrice(v.price),
      priceUnit: v.priceUnit.trim() || null,
      availability: v.availability,
      sortOrder: Number(v.sortOrder) || 0,
      featured: v.featured,
      active: v.active,
      mainImageId: this.mainImage()?.id ?? null,
      galleryImageIds: this.gallery().map((image) => image.id),
    };
  }

  private fill(product: Product): void {
    this.saved.set(product);
    this.form.reset({
      name: product.name,
      slug: product.slug,
      shortDescription: product.shortDescription,
      description: product.description,
      categoryId: product.category.id,
      price: centsToInput(product.priceCents),
      priceUnit: product.priceUnit ?? '',
      availability: product.availability,
      sortOrder: product.sortOrder,
      featured: product.featured,
      active: product.active,
    });
    this.mainImage.set(product.mainImage);
    this.gallery.set(product.gallery);
  }

  private showServerErrors(error: unknown): void {
    const message = errorMessage(error, 'Não foi possível salvar.');
    this.formError.set(message);
    const errors = fieldErrors(error);
    if (/slug/i.test(message)) errors['slug'] ??= message;
    for (const [field, text] of Object.entries(errors)) {
      const control = this.form.get(field === 'priceCents' ? 'price' : field);
      control?.setErrors({ server: text });
      control?.markAsTouched();
    }
  }
}
