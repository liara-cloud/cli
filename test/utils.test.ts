import {expect} from '@oclif/test'

import fixture from './utils/fixture'
import getFiles from '../src/utils/get-files'
import validatePort from '../src/utils/validate-port'

describe('utils', () => {
  it('should throw an error for invalid liara.json file', async () => {
    expect(validatePort('asdf')).to.contain('number')
    expect(validatePort('3.2')).to.contain('integer')
    expect(validatePort('-3.2')).to.contain('integer')
    expect(validatePort('-80')).to.contain('integer')
    expect(validatePort('80')).to.be.eq(true)
    expect(validatePort('5000')).to.be.eq(true)
    expect(validatePort(5000)).to.be.eq(true)
    expect(validatePort(80)).to.be.eq(true)
  })

  it('should respect .gitignore', async () => {
    const {files} = await getFiles(fixture('simple-gitignore'))
    expect(files).to.have.length(1)
  })

  it('should respect nested ignore files', async () => {
    const {files} = await getFiles(fixture('nested-ignore-files'))
    expect(files).to.have.length(2)
  })

  it('should respect ignore files\' priority', async () => {
    const {files} = await getFiles(fixture('ignore-files-priority'))
    expect(files).to.have.length(2)
  })

  it('should ignore default ignore patterns', async () => {
    const {files} = await getFiles(fixture('default-ignores'))
    expect(files).to.have.length(1)
  })

  it('should override default ignore patterns', async () => {
    const {files} = await getFiles(fixture('override-default-ignores'))
    expect(files).to.have.length(2)
  })

  it('case sensitive ignore', async () => {
    const {files} = await getFiles(fixture('ignore-case-sensitive'))
    expect(files).to.have.length(1)
  })

  it('should ignore absolute patterns', async () => {
    const {files} = await getFiles(fixture('ignore-absolute-patterns'))
    expect(files).to.have.length(1)
  })
})
