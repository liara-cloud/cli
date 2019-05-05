interface IPorts {
  [platform: string]: number,
}

export default function getPort(platform: string): number {
  const ports: IPorts = {
    static: 80,
    laravel: 80,
    angular: 80,
    wordpress: 80,
  }
  return ports[platform]
}
