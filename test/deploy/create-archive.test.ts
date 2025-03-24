import { expect } from 'chai';
import createArchive from '../../src/utils/create-archive.js';
import prepareTmpDirectory from '../../src/services/tmp-dir.js';
import getAllFiles from '../helpers/getAllFiles.js';
import { extract } from 'tar';
import fs from 'fs-extra';

describe('create-archive', async () => {
  it('should throw an error if all files are ignored', async () => {
    const sourcePath = prepareTmpDirectory();
    try {
      await createArchive(sourcePath, 'test/fixtures/all-ignored', 'node');
    } catch (error) {
      expect(error.message).to
        .equal(`Seems like you have ignored everything so we can't upload any of your files. Please double-check the content of your .gitignore, .dockerignore and .liaraignore files.
    
> Read more: https://docs.liara.ir/app-features/ignore`);
    }
  });

  it('should create an archive and ignore files and directories listed in .gitignore', async () => {
    const sourcePath = prepareTmpDirectory();

    const originFiles = getAllFiles('test/fixtures/simple-gitignore');

    await createArchive(sourcePath, 'test/fixtures/simple-gitignore', 'node');

    fs.mkdirSync(`${sourcePath}-dir`);

    await extract({
      file: sourcePath,
      cwd: `${sourcePath}-dir`,
    });

    expect(originFiles).to.deep.equal(
      originFiles.filter((val) => val != 'node_modules'),
    );
  });

  it('should create an archive and ignore files and directories listed in .liaraignore', async () => {
    const sourcePath = prepareTmpDirectory();

    const originFiles = getAllFiles('test/fixtures/simple-gitignore');

    await createArchive(sourcePath, 'test/fixtures/simple-gitignore', 'node');

    fs.mkdirSync(`${sourcePath}-dir`);

    await extract({
      file: sourcePath,
      cwd: `${sourcePath}-dir`,
    });

    expect(originFiles).to.deep.equal(
      originFiles.filter((val) => val != 'node_modules'),
    );
  });

  it('should ignore some files and directories by default', async () => {
    const sourcePath = prepareTmpDirectory();

    await createArchive(sourcePath, 'test/fixtures/default-ignores', 'node');

    fs.mkdirSync(`${sourcePath}-dir`);

    await extract({
      file: sourcePath,
      cwd: `${sourcePath}-dir`,
    });

    const extractedFiles = getAllFiles(`${sourcePath}-dir`);
    expect(extractedFiles).to.deep.equal(['file.txt']);
  });
});
