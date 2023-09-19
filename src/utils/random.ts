import * as crypto from 'crypto';

const GROUP_ID_LENGTH = 32;

export function generateGroupId() {
  const array = new Uint8Array(GROUP_ID_LENGTH);
  const bytes = crypto.getRandomValues(array);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}
