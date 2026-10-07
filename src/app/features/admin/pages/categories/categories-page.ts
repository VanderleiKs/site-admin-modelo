import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  FormControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import type { Category } from '../../../../../shared/models';
import { AdminApi } from '../../../../core/admin-api/admin-api';
import { ConfirmService } from '../../../../core/ui/confirm-service';
import { ToastService } from '../../../../core/ui/toast-service';
import { errorMessage } from '../../../../core/utils/api-error';
import { SLUG_PATTERN, slugify } from '../../../../core/utils/format';
import { Icon } from '../../../../shared/ui/icon/icon';

/** Cadastro de categorias. Excluir uma categoria com produtos exige escolher o destino deles. */
@Component({
  selector: 'app-categories-page',
  imports: [ReactiveFormsModule, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './categories-page.html',
})
export class CategoriesPage {
  private readonly api = inject(AdminApi);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  protected readonly categories = signal<readonly Category[]>([]);
  protected readonly error = signal('');
  protected readonly editing = signal<Category | null>(null);
  protected readonly deleting = signal<Category | null>(null);
  protected readonly saving = signal(false);
  protected readonly formError = signal('');
  protected readonly moveTo = new FormControl('', { nonNullable: true });
  private slugEdited = false;

  protected readonly form = inject(NonNullableFormBuilder).group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
    slug: ['', [Validators.required, Validators.pattern(SLUG_PATTERN), Validators.maxLength(100)]],
    description: ['', Validators.maxLength(500)],
  });

  constructor() {
    this.load();
  }

  protected onName(): void {
    if (!this.slugEdited) this.form.controls.slug.setValue(slugify(this.form.controls.name.value));
  }

  protected markSlugEdited(): void {
    this.slugEdited = true;
  }

  protected edit(category: Category): void {
    this.editing.set(category);
    this.slugEdited = true;
    this.formError.set('');
    this.form.reset({
      name: category.name,
      slug: category.slug,
      description: category.description ?? '',
    });
  }

  protected reset(): void {
    this.editing.set(null);
    this.slugEdited = false;
    this.formError.set('');
    this.form.reset();
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const current = this.editing();
    this.saving.set(true);
    this.formError.set('');
    this.api
      .saveCategory(
        {
          name: value.name.trim(),
          slug: value.slug.trim(),
          description: value.description.trim() || null,
          sortOrder: current?.sortOrder ?? this.categories().length,
        },
        current?.id,
      )
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.toast.success(current ? 'Categoria atualizada.' : 'Categoria criada.');
          this.reset();
          this.load();
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.formError.set(errorMessage(error));
        },
      });
  }

  protected async startDelete(category: Category): Promise<void> {
    if (category.productCount > 0) {
      this.moveTo.reset();
      this.deleting.set(category);
      return;
    }
    const confirmed = await this.confirm.ask({
      title: 'Excluir categoria?',
      message: `A categoria "${category.name}" será excluída.`,
      confirmLabel: 'Excluir',
    });
    if (confirmed) this.remove(category);
  }

  protected cancelDelete(): void {
    this.deleting.set(null);
  }

  protected remove(category: Category, moveTo?: string): void {
    this.api.deleteCategory(category.id, moveTo || undefined).subscribe({
      next: ({ movedProducts }) => {
        this.toast.success(
          movedProducts
            ? `Categoria excluída; ${movedProducts} produto(s) movido(s).`
            : 'Categoria excluída.',
        );
        this.deleting.set(null);
        if (this.editing()?.id === category.id) this.reset();
        this.load();
      },
      error: (error: unknown) => this.toast.error(errorMessage(error)),
    });
  }

  private load(): void {
    this.api.categories().subscribe({
      next: (categories) => this.categories.set(categories),
      error: (error: unknown) => this.error.set(errorMessage(error)),
    });
  }
}
