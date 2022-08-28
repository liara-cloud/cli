import globby from 'globby';

async function findFile(projectPath: string, fileName: string): Promise<string> {
  const [path] = await globby(fileName, {
    cwd: projectPath,
    gitignore: true,
    deep: 5,
    onlyFiles: true,
    absolute: true,
  });

  return path;
}

export default findFile;