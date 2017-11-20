import klaw from 'klaw';
import hash from './hash';
import through2 from 'through2';
import { relative } from 'path';
import { readFile } from 'fs-extra';

const filterFiles = through2.obj(function (item, enc, next) {
  if (item.stats.isFile()) this.push(item);
  next();
});

export default async function getFiles(projectPath) {
  const mapHashesToFiles = new Map;
  
  await new Promise(resolve => {
    const files = [];

    klaw(projectPath)
      .pipe(filterFiles)
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