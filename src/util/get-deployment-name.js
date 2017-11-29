import { readFileSync } from 'fs-extra';
import { join } from 'path';

function getDeploymentName(deploymentType, path) {
  let name;

  if(deploymentType === 'node') {
    try {
      const pkg = JSON.parse(readFileSync(join(path, 'package.json')));
      name = pkg.name;
    } catch(err) {
      // ignore
    }
  }

  if( ! name) {
    const splittedPath = path.replace(/^\/+|\/+$/g, '').split('/');
    name = splittedPath[splittedPath.length - 1];
  }

  return name;
}

export default getDeploymentName;