import path from 'path';
import fs from 'fs-extra';

export default function getAllFiles(
  dir: string,
  baseDir: string = dir,
  filePaths: string[] = [],
): string[] {
  const items = fs.readdirSync(dir);
  items.forEach((item) => {
    const itemPath = path.join(dir, item);
    if (fs.statSync(itemPath).isDirectory()) {
      getAllFiles(itemPath, baseDir, filePaths);
    } else {
      const relativePath = path.relative(baseDir, itemPath);
      filePaths.push(relativePath);
    }
  });
  return filePaths;
}
