interface IBuildArgs {
  [key: string]: string;
}

export default function parseBuildArgs(args: string[]): IBuildArgs {
  const buildArgs: IBuildArgs = {};

  for (const arg of args) {
    const [key, value] = arg.split('=');
    buildArgs[key] = value;
  }

  return buildArgs;
}
