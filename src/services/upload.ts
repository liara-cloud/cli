import fs from 'fs-extra'
import { Got } from 'got';
import FormData from 'form-data'


async function upload (project: string, httpClient: Got, sourcePath: string, onProgress: any) {
  const body = new FormData();
  body.append('file', fs.createReadStream(sourcePath))

  try {
    // @ts-ignore
    const response = await httpClient.post(`v2/projects/${project}/sources`, { body })
      .on('uploadProgress', onProgress)
      .json<{ sourceID: string }>()

    return response
  } finally {
    // cleanup
    fs.unlink(sourcePath).catch(() => {})
  }
}

export default upload