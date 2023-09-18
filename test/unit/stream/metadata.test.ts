import { InvalidInputError } from '@/error/InvalidInputError';
import { decodeMetadata, encodeMetadata, validateMetadata } from '@/stream/metadata';
import { generateGroupId } from '@/utils/random';

describe('metadata', () => {
  it('encode and decode', () => {
    const metadata = {
      name: 'test name',
      groupId: generateGroupId(),
    };

    const str = encodeMetadata(metadata);
    const decoded = decodeMetadata(str);

    expect(decoded).toStrictEqual(metadata);
  });

  it('Special characters', () => {
    const metadata = {
      name: '[]!?@$1',
      groupId: 'utf-8 string with ()<>{}',
    };
    const str = encodeMetadata(metadata);
    const decoded = decodeMetadata(str);

    expect(decoded).toStrictEqual(metadata);
  });

  it('validate', () => {
    validateMetadata({
      name: '[]!?@$1',
      groupId: 'utf-8 string with ()<>{}',
    });
    expect(() =>
      validateMetadata({
        name: '名字',
        groupId: generateGroupId(),
      }),
    ).toThrow(InvalidInputError);
  });
});
