import path from 'node:path';
import { fileURLToPath } from 'node:url';
import HtmlWebpackPlugin from 'html-webpack-plugin';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
    mode: 'production',
    entry: './src/main.ts',
    output: {
        path: path.resolve(__dirname, 'dist/webpack'),
        filename: 'main.js',
    },
    resolve: {
        extensions: ['.ts', '.js'],
        extensionAlias: {
            '.js': ['.ts', '.js'],
        },
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                use: [
                    { loader: 'esbuild-loader', options: { target: 'es2022' } },
                    { loader: 'yaw-transformer/webpackLoader' },
                ],
            },
        ],
    },
    plugins: [
        new HtmlWebpackPlugin({ template: './index.html' }),
    ],
};
