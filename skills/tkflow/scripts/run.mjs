#!/usr/bin/env node
import { main, reportError } from '../../../src/cli.mjs';
main().catch(reportError);
