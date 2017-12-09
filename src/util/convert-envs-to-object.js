
/**
 * Convert an array of environment variables to an object (key/value pairs)
 * 
 * @param {array} envs Array of enironment variables, like: [ 'FOO=bar', 'JOHN=doe' ]
 */
export default function convertEnvsToOject(envs) {
  if( ! Array.isArray(envs)) {
    throw new TypeError('The `envs` argument must be an array.');
  }

  return envs.reduce((accu, env) => {
    if( ! env.match(/^[A-Za-z0-9_]+=.*$/)) {
      throw new TypeError(`Environment variables must be in the \`FOO=bar\` format, but you passed: ${env}`);
    }

    const [, key, value] = env.match(/^([A-Za-z0-9_]+)=(.*)$/);

    return {
      ...accu,
      [key]: value,
    };
  }, {});
}