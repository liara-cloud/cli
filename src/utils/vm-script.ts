import path from 'node:path';
import fs from 'fs-extra';

import { IVMInitScript, VMInitScriptType } from '../types/vm.js';
import { INIT_SCRIPT_TYPES, getScriptTypeByFileName } from './vm.js';

export function describeScript(script: IVMInitScript) {
  return `${script.name} (${script.type})`;
}

export interface IScriptInput {
  file?: string;
  content?: string;
  type?: string;
}

export interface IResolvedScript {
  content?: string;
  type?: VMInitScriptType;
}

// Reads the script body from --file or --content. The type comes from --type,
// or from the extension of --file (.sh or .ps1).
export async function resolveScriptInput(
  input: IScriptInput,
): Promise<IResolvedScript> {
  if (input.file && input.content !== undefined) {
    throw new Error('Use either --file or --content, not both.');
  }

  let type = input.type as VMInitScriptType | undefined;
  let content = input.content;

  if (input.file) {
    const fileType = getScriptTypeByFileName(path.basename(input.file));
    if (!fileType) {
      throw new Error(
        'Only files with the .sh or .ps1 extension are accepted as scripts.',
      );
    }

    if (!(await fs.pathExists(input.file))) {
      throw new Error(`The file "${input.file}" does not exist.`);
    }

    content = await fs.readFile(input.file, 'utf8');
    type = type || fileType;
  }

  if (type && !INIT_SCRIPT_TYPES.includes(type)) {
    throw new Error(
      `The script type must be one of: ${INIT_SCRIPT_TYPES.join(', ')}.`,
    );
  }

  if (content !== undefined && !content.trim()) {
    throw new Error('The script content cannot be empty.');
  }

  return { content, type };
}
