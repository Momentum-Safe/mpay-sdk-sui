import { Env, getConfig } from '@/common/env';
import { Globals } from '@/common/globals';

export const UnitGlobals = new Globals(getConfig(Env.unit));
