import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';

const PARAMS = { N: 2 ** 15, r: 8, p: 3, maxmem: 128 * 1024 * 1024 } as const;
const KEY_LENGTH = 64;

function derive(
  password: string,
  salt: Buffer,
  options: ScryptOptions,
  length = KEY_LENGTH,
): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(password, salt, length, options, (error, key) => (error ? reject(error) : resolve(key))),
  );
}

/** Hash scrypt (parâmetros recomendados pela OWASP). Formato: scrypt$N$r$p$sal$hash */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(password, salt, PARAMS);
  return [
    'scrypt',
    PARAMS.N,
    PARAMS.r,
    PARAMS.p,
    salt.toString('base64'),
    key.toString('base64'),
  ].join('$');
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algorithm, n, r, p, salt, hash] = stored.split('$');
  if (algorithm !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'base64');
  const actual = await derive(
    password,
    Buffer.from(salt, 'base64'),
    {
      N: Number(n),
      r: Number(r),
      p: Number(p),
      maxmem: PARAMS.maxmem,
    },
    expected.length,
  );
  return timingSafeEqual(actual, expected);
}

/** Política mínima para senhas do painel. Retorna a mensagem de erro ou null. */
export function passwordProblem(password: string): string | null {
  if (password.length < 10) return 'A senha deve ter pelo menos 10 caracteres.';
  if (password.length > 200) return 'A senha deve ter no máximo 200 caracteres.';
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(password)).length;
  return kinds < 3 ? 'Combine ao menos 3 tipos: minúsculas, maiúsculas, números e símbolos.' : null;
}
