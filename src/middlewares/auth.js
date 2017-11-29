import login from '../commands/login';

export default function auth(fn) {
  return async function (args, config) {
    if( ! config.api_token) {
      console.log(`> No existing credentials found. Please log in:`);
      if( ! await login(args, config)) {
        return;
      }
    }
    return await fn(args, config);
  };
}