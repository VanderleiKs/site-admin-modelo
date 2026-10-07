import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthStore } from '../../../../core/auth/auth-store';
import { errorMessage } from '../../../../core/utils/api-error';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex min-h-dvh items-center justify-center bg-stone-100 p-4' },
  templateUrl: './login-page.html',
})
export class LoginPage {
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly query = inject(ActivatedRoute).snapshot.queryParamMap;

  protected readonly expired = this.query.has('expirou');
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly form = inject(NonNullableFormBuilder).group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set('');
    const { email, password } = this.form.getRawValue();
    this.auth.login(email, password).subscribe({
      next: () => void this.router.navigateByUrl(this.safeReturnUrl()),
      error: (error: unknown) => {
        this.loading.set(false);
        this.error.set(errorMessage(error, 'Não foi possível entrar.'));
        this.form.controls.password.reset();
      },
    });
  }

  /** Aceita apenas caminhos internos do painel (evita redirecionamento aberto). */
  private safeReturnUrl(): string {
    const target = this.query.get('voltar') ?? '';
    return target.startsWith('/admin') && !target.startsWith('//') ? target : '/admin';
  }
}
