import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';

export default (): string => {
  const tmpDir = path.join(os.tmpdir(), '/liara-cli');
  const sourcePath = path.join(tmpDir, `${Date.now()}.tar.gz`);
  fs.emptyDirSync(tmpDir);

  return sourcePath;
};
