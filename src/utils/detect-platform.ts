import path from 'node:path';
import { globbySync } from 'globby';
import fs from 'fs-extra';

const { readJSONSync, existsSync, readFileSync } = fs;

import addNullBetweenChars from './add-null-between-chars.js';

export default function detectPlatform(projectPath: string) {
  const pipfilePath = path.join(projectPath, 'Pipfile');
  const indexPHPFilePath = path.join(projectPath, 'index.php');
  const packageJsonFilePath = path.join(projectPath, 'package.json');
  const composeJsonFilePath = path.join(projectPath, 'composer.json');
  const requirementsTxtFilePath = path.join(projectPath, 'requirements.txt');

  const [programCSFilePath] = globbySync('**/{Startup.cs,Program.cs}', {
    cwd: projectPath,
    gitignore: true,
    deep: 5,
  });

  const hasPipfilePathFile = existsSync(pipfilePath);
  const hasIndexPHPFile = existsSync(indexPHPFilePath);
  const hasPackageFile = existsSync(packageJsonFilePath);
  const hasComposerJsonFile = existsSync(composeJsonFilePath);
  const hasRequirementsTxtFile = existsSync(requirementsTxtFilePath);
  const hasDockerFile = existsSync(path.join(projectPath, 'Dockerfile'));
  const hasWPContent = existsSync(path.join(projectPath, 'wp-content'));

  const hasCSProjFile =
    programCSFilePath &&
    globbySync('*.csproj', {
      gitignore: true,
      cwd: path.join(projectPath, path.dirname(programCSFilePath)),
    }).length > 0;

  if (hasCSProjFile && hasDockerFile) {
    throw new Error(`The project contains both of the \`*.csproj\` and \`Dockerfile\` files.
Please specify your platform with --platform=netcore or docker.`);
  }

  if (hasCSProjFile) {
    return 'netcore';
  }

  if (hasComposerJsonFile && hasDockerFile) {
    throw new Error(`The project contains both of the \`composer.json\` and \`Dockerfile\` files.
Please specify your platform with --platform=laravel or docker.`);
  }

  if (hasComposerJsonFile) {
    const composerJson = readJSONSync(composeJsonFilePath);

    if (composerJson.require && composerJson.require['laravel/framework']) {
      return 'laravel';
    }

    if (
      composerJson.require &&
      composerJson.require['laravel/lumen-framework']
    ) {
      return 'laravel';
    }

    return 'php';
  }

  if (hasIndexPHPFile) {
    return 'php';
  }

  if (hasRequirementsTxtFile) {
    const requirementsTxt = readFileSync(requirementsTxtFilePath);

    if (
      requirementsTxt.includes('Django') ||
      requirementsTxt.includes('django') ||
      requirementsTxt.includes(addNullBetweenChars('Django')) ||
      requirementsTxt.includes(addNullBetweenChars('django'))
    ) {
      return 'django';
    }

    if (
      requirementsTxt.includes('Flask') ||
      requirementsTxt.includes('flask') ||
      requirementsTxt.includes(addNullBetweenChars('Flask')) ||
      requirementsTxt.includes(addNullBetweenChars('flask'))
    ) {
      return 'flask';
    }
  }

  if (hasPipfilePathFile) {
    const pipfile = readFileSync(pipfilePath);

    if (pipfile.includes('Django') || pipfile.includes('django')) {
      return 'django';
    }

    if (pipfile.includes('Flask') || pipfile.includes('flask')) {
      return 'flask';
    }
  }

  if (hasPackageFile && hasDockerFile) {
    throw new Error(`The project contains both of the \`package.json\` and \`Dockerfile\` files.
Please specify your platform with --platform=node or docker.`);
  }

  if (hasPackageFile) {
    const packageJson = readJSONSync(packageJsonFilePath);

    if (packageJson?.dependencies?.next) {
      return 'next';
    }

    if (packageJson.dependencies && packageJson.dependencies['@angular/core']) {
      return 'angular';
    }

    if (
      (packageJson.devDependencies &&
        packageJson.devDependencies['@vue/cli-service']) ||
      (packageJson.dependencies?.vue && packageJson.devDependencies?.vite)
    ) {
      return 'vue';
    }

    if (
      (packageJson.dependencies && packageJson.dependencies['react-scripts']) ||
      (packageJson.devDependencies?.vite && packageJson.dependencies?.react) ||
      packageJson.dependencies?.preact
    ) {
      return 'react';
    }

    return 'node';
  }

  if (hasWPContent && hasDockerFile) {
    throw new Error(`The project contains a \`Dockerfile\`.
Please specify your platform with --platform=wordpress or docker.`);
  }

  if (hasWPContent) {
    return 'wordpress';
  }

  if (hasDockerFile) {
    return 'docker';
  }

  return 'static';
}
