import * as sinon from 'sinon'
import {expect} from '@oclif/test'
import * as inquirer from 'inquirer'

import run from '../utils/run'
import fixture from '../utils/fixture'

describe('deploy', () => {
  beforeEach(function () {
    sinon.replace(inquirer, 'prompt' as any, sinon.fake())
  })

  it('should throw an error for invalid liara.json file', async () => {
    let {stderr} = await run(['deploy', '--path', fixture('invalid-liara-json')])
    expect(stderr).to.contain('Syntax error')
  }).timeout()
})
