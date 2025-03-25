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

    fs.writeFileSync('test/fixtures/simple-gitignore/ignore_1.html', 'test');
    fs.writeFileSync('test/fixtures/simple-gitignore/ignore_2.html', 'test');

    const originFiles = getAllFiles('test/fixtures/simple-gitignore');

    await createArchive(sourcePath, 'test/fixtures/simple-gitignore', 'php');

    fs.mkdirSync(`${sourcePath}-dir`);

    await extract({
      file: sourcePath,
      cwd: `${sourcePath}-dir`,
    });

    const extractedFiles = getAllFiles(`${sourcePath}-dir`);

    expect(extractedFiles).to.deep.equal(
      originFiles.filter(
        (val) => val != 'ignore_1.html' && val != 'ignore_2.html',
      ),
    );
  });

  it('should create an archive and ignore files and directories listed in .liaraignore', async () => {
    const sourcePath = prepareTmpDirectory();

    const originFiles = getAllFiles('test/fixtures/liaraignore');

    await createArchive(sourcePath, 'test/fixtures/liaraignore', 'php');

    fs.mkdirSync(`${sourcePath}-dir`);

    await extract({
      file: sourcePath,
      cwd: `${sourcePath}-dir`,
    });

    const extractedFiles = getAllFiles(`${sourcePath}-dir`);

    expect(extractedFiles).to.deep.equal(
      originFiles.filter(
        (val) => val != 'ignore_1.html' && val != 'ignore_2.html',
      ),
    );
  });

  it('should create an archive and ignore files and directories listed in .dockerignore', async () => {
    const sourcePath = prepareTmpDirectory();

    const originFiles = getAllFiles('test/fixtures/dockerignore');

    await createArchive(sourcePath, 'test/fixtures/dockerignore', 'php');

    fs.mkdirSync(`${sourcePath}-dir`);

    await extract({
      file: sourcePath,
      cwd: `${sourcePath}-dir`,
    });

    const extractedFiles = getAllFiles(`${sourcePath}-dir`);

    expect(extractedFiles).to.deep.equal(
      originFiles.filter(
        (val) =>
          val != 'ignore_1.html' &&
          val != 'ignore_2.html' &&
          val != '.dockerignore',
      ),
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

  it('should ignore files listed in .liaraignore and disregard .gitignore and .dockerignore if present', async () => {
    const sourcePath = prepareTmpDirectory();

    fs.writeFileSync('test/fixtures/simple-gitignore/ignore_2.html', 'test');

    const originFiles = getAllFiles('test/fixtures/multiple-ignores');

    await createArchive(sourcePath, 'test/fixtures/multiple-ignores', 'php');

    fs.mkdirSync(`${sourcePath}-dir`);

    await extract({
      file: sourcePath,
      cwd: `${sourcePath}-dir`,
    });

    const extractedFiles = getAllFiles(`${sourcePath}-dir`);

    expect(extractedFiles).to.deep.equal(
      originFiles.filter(
        (val) => val != 'ignore_1.html' && val != '.dockerignore',
      ),
    );
  });

  it('should respect a nested .gitignore file and apply its rules only to its directory and subdirectories', async () => {
    const sourcePath = prepareTmpDirectory();

    const originFiles = getAllFiles('test/fixtures/nested-ignore-files');

    await createArchive(sourcePath, 'test/fixtures/nested-ignore-files', 'php');

    fs.mkdirSync(`${sourcePath}-dir`);

    await extract({
      file: sourcePath,
      cwd: `${sourcePath}-dir`,
    });

    const extractedFiles = getAllFiles(`${sourcePath}-dir`);

    expect(extractedFiles).to.deep.equal(
      originFiles.filter(
        (val) => val != 'ignore.me' && val != 'sub1/hello.html',
      ),
    );
  });

  it('should ignore some files and directories in django platform', async () => {
    const sourcePath = prepareTmpDirectory();

    await createArchive(sourcePath, 'test/fixtures/python-ignores', 'django');

    fs.mkdirSync(`${sourcePath}-dir`);

    await extract({
      file: sourcePath,
      cwd: `${sourcePath}-dir`,
    });
    const extractedFiles = getAllFiles(`${sourcePath}-dir`);

    expect(extractedFiles.sort()).to.deep.equal(
      ['test.txt', '.webassets-cache', 'instance/test.txt'].sort(),
    );
  });

  it('should ignore some files and directories in dotnet platform', async () => {
    const sourcePath = prepareTmpDirectory();

    await createArchive(sourcePath, 'test/fixtures/dotnet-ignores', 'dotnet');

    fs.mkdirSync(`${sourcePath}-dir`);

    await extract({
      file: sourcePath,
      cwd: `${sourcePath}-dir`,
    });

    const extractedFiles = getAllFiles(`${sourcePath}-dir`);
    expect(extractedFiles).to.deep.equal(['test.txt']);
  });

  it('should ignore /vendor directory in php platform', async () => {
    const sourcePath = prepareTmpDirectory();

    await createArchive(sourcePath, 'test/fixtures/php-ignores', 'php');

    fs.mkdirSync(`${sourcePath}-dir`);

    await extract({
      file: sourcePath,
      cwd: `${sourcePath}-dir`,
    });

    const extractedFiles = getAllFiles(`${sourcePath}-dir`);
    expect(extractedFiles).to.deep.equal(['index.php']);
  });

  it('should ignore /vendor directory in laravel platform', async () => {
    const sourcePath = prepareTmpDirectory();

    await createArchive(sourcePath, 'test/fixtures/php-ignores', 'laravel');

    fs.mkdirSync(`${sourcePath}-dir`);

    await extract({
      file: sourcePath,
      cwd: `${sourcePath}-dir`,
    });

    const extractedFiles = getAllFiles(`${sourcePath}-dir`);
    expect(extractedFiles).to.deep.equal(['index.php']);
  });

  it('should ignore some files and directories in flask platform', async () => {
    const sourcePath = prepareTmpDirectory();

    await createArchive(sourcePath, 'test/fixtures/python-ignores', 'flask');

    fs.mkdirSync(`${sourcePath}-dir`);

    await extract({
      file: sourcePath,
      cwd: `${sourcePath}-dir`,
    });
    const extractedFiles = getAllFiles(`${sourcePath}-dir`);

    expect(extractedFiles.sort()).to.deep.equal(
      [
        'test.txt',
        'test.log',
        'local_settings.py',
        'staticfiles/test.txt',
      ].sort(),
    );
  });
});
