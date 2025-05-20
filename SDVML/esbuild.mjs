//@ts-check
import * as esbuild from 'esbuild';
import { copy } from 'esbuild-plugin-copy'

const watch = process.argv.includes('--watch');
const minify = process.argv.includes('--minify');

const success = watch ? 'Watch build succeeded' : 'Build succeeded';



function getTime() {
    const date = new Date();
    return `[${`${padZeroes(date.getHours())}:${padZeroes(date.getMinutes())}:${padZeroes(date.getSeconds())}`}] `;
}

function padZeroes(i) {
    return i.toString().padStart(2, '0');
}

const plugins = [
    {
        name: 'watch-plugin',
        setup(build) {
            build.onEnd((result) => {
                if (result.errors.length === 0) {
                    console.log(getTime() + success);
                }
            });
        },
    },
];

const ctx = await esbuild.context({
    // Entry points for the vscode extension and the language server
    entryPoints: ['src/extension/main.ts', 'src/language/main.ts'],
    outdir: 'out',
    bundle: true,
    target: 'ES2017',
    // VSCode's extension host is still using cjs, so we need to transform the code
    format: 'cjs',
    // To prevent confusing node, we explicitly use the `.cjs` extension
    outExtension: {
        '.js': '.cjs',
    },
    loader: { '.ts': 'ts',
            '.ttf': 'file' // 👈 Ajoute le support pour les fichiers .ttf
     },
    external: ['vscode'],
    platform: 'node',
    sourcemap: !minify,
    minify,
    plugins,
});
const diagramWebviewCtx = await esbuild.context({
	entryPoints: ['src/webview/main.ts'],
	outfile: 'out/webview.js',
	bundle: true,
	target: 'ES2021',
	loader: { '.ts': 'ts', '.css': 'css', '.ttf': 'dataurl' },
	platform: 'browser',
	sourcemap: !minify,
	minify: minify,
	plugins: [
		...plugins,
		copy({
			resolveFrom: 'cwd',
			assets: [{
				from: ['./node_modules/@vscode/codicons/dist/*.css', './node_modules/@vscode/codicons/dist/*.ttf'],
				to: ['./out'],
			},
            {
                from: ['./node_modules/@vscode/codicons/dist/*.css','./node_modules/@vscode/codicons/dist/codicon.ttf'],
                to: './dist/assets/' // 👈 Copie le fichier dans le dossier de sortie
            }
        ]
		}),
	],
})

if (watch) {
	await ctx.watch()
    await diagramWebviewCtx.watch()
} else {
	await ctx.rebuild()
    await diagramWebviewCtx.rebuild()
	ctx.dispose()
    diagramWebviewCtx.dispose()
}
