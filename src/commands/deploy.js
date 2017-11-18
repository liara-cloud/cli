import klaw from 'klaw';
import through2 from 'through2';
import crypto from 'crypto';
import { readFile } from 'fs-extra';
import { queue } from 'async';
import bytes from 'bytes';
import { relative } from 'path';

const excludeDir = through2.obj(function (item, enc, next) {
  if ( ! item.stats.isDirectory()) this.push(item);
  next();
});

const hash = buf => crypto.createHash('sha256').update(buf).digest('hex');

export default async function deploy({ path, debug }, config) {
  const projectPath = path ? path : process.cwd();

  console.log(`Deploying: ${projectPath}`)

  const mapHashesToFiles = new Map;

  debug && console.time('[debug] making hashes')

  let totalBytes = 0;

  await new Promise(resolve => {
    const hashesQueue = queue(async ({ path, stats }) => {
      const data = await readFile(path);
      const checksum = hash(data);

      const file = {
        checksum,
        path: relative(projectPath, path),
        mode: stats.mode,
        size: stats.size,
      };

      totalBytes += file.size;

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

  debug && console.log('[debug] files count:', files.length);
  console.log('Project size:', bytes(totalBytes, {unitSeparator: ' '}));

  debug && console.timeEnd('[debug] making hashes');
};