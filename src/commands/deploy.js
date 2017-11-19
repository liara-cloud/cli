import bytes from 'bytes';
import getFiles from '../util/get-files'

export default async function deploy({ path, debug }, config) {
  const projectPath = path ? path : process.cwd();
  console.log(`Deploying: ${projectPath}`)

  debug && console.time('[debug] making hashes')

  const { files } = await getFiles(projectPath);
  debug && console.log('[debug] files count:', files.length);

  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  console.log('Project size:', bytes(totalBytes, {unitSeparator: ' '}));

  debug && console.timeEnd('[debug] making hashes');
};