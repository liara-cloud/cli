#!/usr/bin/env ts-node

import { execute } from '@oclif/core';

await execute({ development: true, dir: import.meta.url });
