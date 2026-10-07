import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthStore } from '../../../../core/auth/auth-store';
import { ToastService } from '../../../../core/ui/toast-service';
import { errorMessage } from '../../../../core/utils/api-error';

/** Troca de senha do usuário logado (encerra as sessões e pede novo login). */
@Component({
  selector: 'app-account-page',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './account-page.html',
})
export class AccountPage {
  protected readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly form = inject(NonNullableFormBuilder).group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(10)]],
    confirmPassword: ['', Validators.required],
  });

  protected submit(): void {
    const { currentPassword, newPassword, confirmPassword } = this.form.getRawValue();
    if (this.form.invalid) {
      this.error.set('Preencha os campos. A nova senha precisa de pelo menos 10 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      this.error.set('A confirmação não confere com a nova senha.');
      return;
    }
    this.saving.set(true);
    this.error.set('');
    this.auth.changePassword(currentPassword, newPassword).subscribe({
      next: () => {
        this.toast.success('Senha alterada. Entre novamente.');
        void this.router.navigate(['/admin/login']);
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.error.set(errorMessage(error));
      },
    });
  }
}
