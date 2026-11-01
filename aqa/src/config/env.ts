import * as path from 'node:path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `${name} is not set. Copy aqa/.env.example to aqa/.env and fill it, ` +
        `or set ${name} as a CI variable (see aqa/README.md).`,
    );
  }
  if (!/^https?:\/\//.test(value)) {
    throw new Error(`${name} must start with http:// or https:// (got "${value}").`);
  }
  return value.replace(/\/+$/, '');
}

export const env = {
  baseUrl: required('BASE_URL'),
  apiUrl: required('API_URL'),
  dataPrefix: (process.env.TEST_DATA_PREFIX?.trim() || 'aqa-e2e').toLowerCase(),
};
