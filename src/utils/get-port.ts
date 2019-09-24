interface IPorts {
  [platform: string]: number,
}

export default function getPort(platform: string): number {
  const ports: IPorts = {
    static: 80,
    react: 80,
    vue: 80,
    angular: 80,
    laravel: 80,
    wordpress: 80,
    django: 8000,
    php: 80,
  }
  return ports[platform]
}
