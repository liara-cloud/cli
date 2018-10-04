import { resolve } from "path";
import { expect } from 'chai';
import getFiles from '../src/util/get-files';
import detectDeploymentType from '../src/util/detect-deployment-type';
import ensureAppHasDockerfile from '../src/util/ensure-has-dockerfile';
import getDeploymentName from '../src/util/get-deployment-name';
import convertEnvsToOject from '../src/util/convert-envs-to-object';

const project = name => resolve(__dirname, 'fixtures/projects', name);

describe('Deployment', () => {
  it('should get files from a simple static project', async () => {
    const { files } = await getFiles(project('static-hello-world'));

    expect(files).to.have.lengthOf(1);
    expect(files[0]).to.have.property('path', 'index.html');
    expect(files[0]).to.have.property('size', 259);

    const checksum = '899f25fe18ca2aae83be2b407c785f7bf2ab3cf6c087afb734da2277beb6c515';
    expect(files[0]).to.have.property('checksum', checksum);

    const mode = files[0].mode & parseInt("0777", 8);
    expect(mode).to.be.equal(parseInt("0664", 8) & parseInt("0777", 8));
  });

  it('should detect static projects', () => {
    let deploymentType;

    deploymentType = detectDeploymentType({ static: true }, project('static-hello-world'));
    expect(deploymentType).to.be.equal('static');

    deploymentType = detectDeploymentType({}, project('static-hello-world'));
    expect(deploymentType).to.be.equal('static');

    deploymentType = detectDeploymentType({}, project('static-with-package-json'));
    expect(deploymentType).to.be.not.equal('static');

    deploymentType = detectDeploymentType({}, project('static-with-dockerfile'));
    expect(deploymentType).to.be.not.equal('static');

    deploymentType = detectDeploymentType({}, project('static-with-assets'));
    expect(deploymentType).to.be.equal('static');
  });

  it('should throw an error when detects multiple deployment types', () => {
    let deploymentType;

    deploymentType = () => detectDeploymentType({ static: true, docker: true }, '');
    expect(deploymentType).to.throw(`You can not specify multiple deployment types.`);

    deploymentType = () => detectDeploymentType({ docker: true, node: true }, '');
    expect(deploymentType).to.throw(`You can not specify multiple deployment types.`);

    deploymentType = () => detectDeploymentType({ node: true, static: true }, '');
    expect(deploymentType).to.throw(`You can not specify multiple deployment types.`);

    deploymentType = () => detectDeploymentType({ node: true, docker: true, static: true }, '');
    expect(deploymentType).to.throw(`You can not specify multiple deployment types.`);

    deploymentType = () => detectDeploymentType({}, project('package-json-and-dockerfile'));
    expect(deploymentType).to.throw(`The project contains both of the \`package.json\` and \`Dockerfile\` files.
Please specify your deployment type with --node or --docker.`);
  });

  it('should throw an error when project is empty', () => {
    const deploymentType = () => detectDeploymentType({ node: true }, project('empty-project'));
    expect(deploymentType).to.throw(/Project is empty!/);
  });

  it('should throw an error when the project doesn\'t have the required files', () => {
    let deploymentType;

    deploymentType = () => detectDeploymentType({ node: true }, project('static-hello-world'));
    expect(deploymentType).to.throw(/file doesn't exists./);

    deploymentType = () => detectDeploymentType({ docker: true }, project('static-hello-world'));
    expect(deploymentType).to.throw(/file doesn't exists./);
  });

  it('should ensure app has a Dockerfile', () => {
    let files, map;

    const filterDockerfiles = files => files.filter(file => file.path === 'Dockerfile');

    files = [{ path: 'Dockerfile' }, { path: 'woof/Dockerfile' }, { path: 'index.php' }];
    map = new Map;
    var { filesWithDockerfile } = ensureAppHasDockerfile('docker', files, map);
    expect(filterDockerfiles(filesWithDockerfile)).to.have.lengthOf(1);

    // This app doesn't have a dockerfile in the root
    files = [{ path: 'woof/Dockerfile' }, { path: 'index.html' }];
    map = new Map;
    var { filesWithDockerfile } = ensureAppHasDockerfile('static', files, map);
    expect(filterDockerfiles(filesWithDockerfile)).to.have.lengthOf(1);
  });

  it('should return a name for deployment', () => {
    let name;

    name = getDeploymentName('node', project('npm-package-name'));
    expect(name).to.be.equal('app-name');

    name = getDeploymentName('node', project('npm-package-without-name'));
    expect(name).to.be.equal('npm-package-without-name');

    name = getDeploymentName('docker', '/home/user/projects/my-project');
    expect(name).to.be.equal('my-project');

    // package.json doesn't exists
    name = getDeploymentName('node', '/home/user/projects/my-project');
    expect(name).to.be.equal('my-project');

    name = getDeploymentName('static', '//home/user/its-my-project//');
    expect(name).to.be.equal('its-my-project');
  });

  it('should ignore files that are listed in .gitignore', async () => {
    const { files } = await getFiles(project('gitignore'));

    expect(files).to.have.lengthOf(1);
    expect(files[0]).to.have.property('path', 'keep-me.js');
  });

  it('should ignore files that are listed in .liaraignore', async () => {
    const { files } = await getFiles(project('liaraignore'));

    expect(files).to.have.lengthOf(1);
    expect(files[0]).to.have.property('path', 'folder/keep.png');

    // .liaraignore and .gitignore at the same folder
    const { files: files2 } = await getFiles(project('liaraignore-gitignore'));
    expect(files2).to.have.lengthOf(1);
    expect(files2[0]).to.have.property('path', 'dist/bundle.js');
  });

  it('should ignore files that are listed in nested gitignores', async () => {
    const { files } = await getFiles(project('nested-ignore-files'));
    expect(files).to.have.lengthOf(1);
    expect(files[0]).to.have.property('path', 'package.json');
  });

  it('should skip nested gitignores when .liaraignore exists', async () => {
    let { files } = await getFiles(project('liaraignore-overrides-nested-ignore-files'));
    expect(files).to.have.lengthOf(2);

    // extract pathes
    files = files.map(({ path }) => ({ path }));
    expect(files).to.deep.include({ path: 'package.json' });
    expect(files).to.deep.include({ path: 'folder/app.js' });
  });

  it('should override default ignores', async () => {
    const { files } = await getFiles(project('with-dot-file'));

    expect(files).to.have.lengthOf(1);
    expect(files[0]).to.have.property('path', '.dotfile');
  });

  it('should convert an array of environment variables to an object (key/value pairs)', () => {
    let envsObject;

    envsObject = convertEnvsToOject([ 'FOO=bar', 'BAZ=baz' ]);

    expect(Object.keys(envsObject)).to.have.lengthOf(2);
    expect(envsObject).to.have.property('FOO', 'bar');
    expect(envsObject).to.have.property('BAZ', 'baz');

    envsObject = convertEnvsToOject([ 'BOO=', 'ba12=23a:sdf', 'foo=baaaz', 'boo=value' ]);

    expect(Object.keys(envsObject)).to.have.lengthOf(4);
    expect(envsObject).to.have.property('BOO', '');
    expect(envsObject).to.have.property('boo', 'value');
    expect(envsObject).to.have.property('ba12', '23a:sdf');
    expect(envsObject).to.have.property('foo', 'baaaz');

    envsObject = () => convertEnvsToOject([ 'FOO', 'BAZ=baz' ]);

    expect(envsObject).to.throw(/Environment variables must be in the \`FOO=bar\` format/);
  });
});