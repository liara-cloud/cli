import { expect } from 'chai';
import createArchive from '../../src/utils/create-archive.js';
import prepareTmpDirectory from '../../src/services/tmp-dir.js';

describe('create-archive', async () => {
  const sourcePath = prepareTmpDirectory();

  beforeAll(async () => {});
  it('should throw an error if all files are ignored', async () => {
    try {
      await createArchive(
        sourcePath,
        'test/fixtures/archive/ignore-all',
        'node',
      );
    } catch (error) {
      expect(error.message).to
        .equal(`Seems like you have ignored everything so we can't upload any of your files. Please double-check the content of your .gitignore, .dockerignore and .liaraignore files.
    
> Read more: https://docs.liara.ir/app-features/ignore`);
    }
  });

  it('should create an archive with the correct files', async () => {});
});
