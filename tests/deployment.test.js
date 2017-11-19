import { resolve } from "path";
import { expect } from 'chai';
import getFiles from '../src/util/get-files';

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
});