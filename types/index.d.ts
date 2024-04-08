export interface OptimizeJsOptions {
    sourceMap?: boolean;
    ecmaVersion?: 3 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 2015 | 2016 | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 | 2024 | 'latest';
    handleFunctionDeclarations?: 'none' | 'safe' | 'unsafe';
}

export function optimizeJs(jsString: string, opts?: OptimizeJsOptions): string;
