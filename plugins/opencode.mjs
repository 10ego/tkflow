import { Plugin } from '@opencode/plugin';
import { setupOpenCode } from './shared.mjs';
export default Plugin.define({id:'tkflow',async setup(ctx){await setupOpenCode(ctx);}});
