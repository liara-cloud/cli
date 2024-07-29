#!/usr/bin/env -S  node --no-warnings

import { execute } from '@oclif/core';

await execute({ dir: import.meta.url });
