import { HttpEventType } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import type { Subscription } from 'rxjs';
import {
  ACCEPTED_IMAGE_TYPES,
  type ImageRef,
  MAX_UPLOAD_BYTES,
} from '../../../../../shared/models';
import { AdminApi } from '../../../../core/admin-api/admin-api';
import { errorMessage } from '../../../../core/utils/api-error';
import { Icon } from '../../../../shared/ui/icon/icon';

/**
 * Seleção, pré-visualização e envio de imagem com barra de progresso.
 * A validação no navegador é só conveniência: o servidor confere o tipo real e o tamanho.
 */
@Component({
  selector: 'app-image-uploader',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './image-uploader.html',
})
export class ImageUploader {
  private readonly api = inject(AdminApi);

  readonly image = input<ImageRef | null>(null);
  readonly label = input('Imagem');
  readonly buttonLabel = input('Escolher imagem');
  readonly removable = input(true);
  readonly alt = input('');

  readonly uploaded = output<ImageRef>();
  readonly removed = output<void>();
  /** Emite true durante o envio (o formulário bloqueia o botão salvar). */
  readonly busy = output<boolean>();

  protected readonly accept = ACCEPTED_IMAGE_TYPES.join(',');
  protected readonly preview = signal<string | null>(null);
  protected readonly uploading = signal(false);
  protected readonly progress = signal(0);
  protected readonly error = signal('');
  private upload?: Subscription;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.upload?.unsubscribe();
      this.setPreview(null);
    });
  }

  protected onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    this.error.set('');
    if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
      this.error.set('Formato não suportado. Use JPEG, PNG ou WebP.');
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      this.error.set('Arquivo maior que 5 MB. Reduza a imagem e tente novamente.');
      return;
    }

    this.setPreview(URL.createObjectURL(file));
    this.setUploading(true);
    this.progress.set(0);
    this.upload = this.api.uploadImage(file, this.alt() || undefined).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          this.progress.set(Math.round((event.loaded / event.total) * 100));
        } else if (event.type === HttpEventType.Response && event.body) {
          this.finish();
          this.uploaded.emit(event.body);
        }
      },
      error: (error: unknown) => {
        this.finish();
        this.error.set(errorMessage(error, 'Falha ao enviar a imagem.'));
      },
    });
  }

  protected cancel(): void {
    this.upload?.unsubscribe();
    this.finish();
  }

  protected remove(): void {
    this.removed.emit();
  }

  private finish(): void {
    this.setUploading(false);
    this.setPreview(null);
  }

  private setUploading(value: boolean): void {
    this.uploading.set(value);
    this.busy.emit(value);
  }

  private setPreview(url: string | null): void {
    const previous = this.preview();
    if (previous) URL.revokeObjectURL(previous);
    this.preview.set(url);
  }
}
