import { OutputPlugin } from 'rollup';

export function optimizeJsRollupPlugin(): OutputPlugin;
export function optimizeJs(jsString: string, opts?: {sourceMap?: boolean}): string;
