import fs from 'node:fs';
import {componentLibrary} from '../src/component-library.mjs';
fs.writeFileSync(new URL('../templates/tkflow-components.excalidrawlib',import.meta.url),JSON.stringify(componentLibrary(),null,2)+'\n');
