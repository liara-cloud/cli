import klaw from 'klaw';
import hash from './hash';
import { queue } from 'async';
import through2 from 'through2';
import { relative } from 'path';
import { readFile } from 'fs-extra';

const excludeDir = through2.obj(function (item, enc, next) {
  if ( ! item.stats.isDirectory()) this.push(item);
  next();
});

export default async function getFiles(projectPath) {
  const mapHashesToFiles = new Map;
  
  await new Promise(resolve => {
    const hashesQueue = queue(async ({ path, stats }, callback) => {
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

      callback();
    }, 15);

    hashesQueue.drain = () => resolve(mapHashesToFiles);

    klaw(projectPath)
      .pipe(excludeDir)
      .on('data', hashesQueue.push);
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