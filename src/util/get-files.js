import klaw from 'klaw';
import hash from './hash';
import through2 from 'through2';
import { relative, join } from 'path';
import { readFile, readFileSync, existsSync } from 'fs-extra';
import ignore from 'ignore';

const defaultIgnores = [
  '.git',
  '.*',
  '*.*~',
  'node_modules',
  'bower_components'
];

const filterFiles = () => through2.obj(function (item, enc, next) {
  if (item.stats.isFile()) this.push(item);
  next();
});

const ignoreFiles = function (projectPath) {
  const ig = ignore();

  const liaragnorePath = join(projectPath, '.liaraignore');
  const gitignorePath = join(projectPath, '.gitignore');

  if(existsSync(liaragnorePath)) {
    ig.add(defaultIgnores);
    ig.add(readFileSync(liaragnorePath).toString());

  } else if (existsSync(gitignorePath)) {
    ig.add(readFileSync(gitignorePath).toString());
    ig.add(defaultIgnores);
  }

  return through2.obj(function (item, enc, next) {
    if( ! ig.ignores(relative(projectPath, item.path))) {
      this.push(item);
    }
    return next();
  });
};

export default async function getFiles(projectPath) {
  const mapHashesToFiles = new Map;

  await new Promise(resolve => {
    const files = [];

    klaw(projectPath)
      .pipe(filterFiles())
      .pipe(ignoreFiles(projectPath))
      .on('data', file => files.push(file))
      .on('end', async () => {
        await Promise.all(files.map(async ({ path, stats }) => {
          const data = await readFile(path);
          const checksum = hash(data);

          const file = {
            checksum,
            path: relative(projectPath, path),
            mode: stats.mode,
            size: stats.size,
          };

          if(mapHashesToFiles.has(checksum)) {
            const { files } = mapHashesToFiles.get(checksum);
            mapHashesToFiles.set(checksum, {
              data,
              files: [...files, file],
            });
          } else {
            mapHashesToFiles.set(checksum, {
              data,
              files: [file],
            });
          }
        }));
        resolve();
      });
  });
  
  // flatten files
  const files = Array
    .from(mapHashesToFiles)
    .reduce((prevFiles, [ checksum, { files } ]) => {
    return [
      ...prevFiles,
      ...files,
    ];
  }, []);

  return { files, mapHashesToFiles };
}