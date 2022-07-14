import fs from 'fs-extra'
import { Got } from 'got';
import FormData from 'form-data'


function upload (project: string, httpClient: Got, sourcePath: string) {
  const body = new FormData();
  body.append('file', fs.createReadStream(sourcePath))
  return httpClient.post(`v2/projects/${project}/sources`, { 
    body,
    timeout: {
      request: undefined
    }
  })
}

export default upload
