interface IPorts {
  [platform: string]: number;
}

export function getPort(platform: string): number {
  const ports: IPorts = {
    static: 80,
    react: 80,
    vue: 80,
    angular: 80,
    laravel: 80,
    wordpress: 80,
    django: 80,
    flask: 80,
    php: 80,
    next: 3000,
  };
  return ports[platform];
}

export function getDefaultPort(platform: string): number {
  const ports: IPorts = {
    netcore: 80,
  };
  return ports[platform] || 3000;
}
