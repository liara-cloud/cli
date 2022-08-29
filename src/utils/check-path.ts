import os from 'os'
import path from 'path'

const checkPath = (dir: string) => {
  if (!dir) {
    return
  }

  const home = os.homedir()
  let location = ''
  dir = dir.replace(/\/+$/, '') // trim end slashes

  const paths: {[key: string]: string} = {
    home,
    desktop: path.join(home, 'Desktop'),
    downloads: path.join(home, 'Downloads')
  }

  for (const locationPath of Object.keys(paths)) {
    if (dir === paths[locationPath]) {
      location = locationPath
    }
  }

  if (!location) {
    return
  }

  let locationName: string

  switch (location) {
  case 'home':
    locationName = 'user directory'
    break
  case 'downloads':
    locationName = 'downloads directory'
    break
  default:
    locationName = location
  }

  throw new Error(`You're trying to deploy your ${locationName}.`)
}

export default checkPath
