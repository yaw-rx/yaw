import * as vscode from 'vscode';
import { getLanguageService as getHtmlLS } from 'vscode-html-languageservice';
import { getCSSLanguageService as getCssLS } from 'vscode-css-languageservice';
import { TextDocument } from 'vscode-languageserver-textdocument';

interface EmbeddedRegion {
    lang: 'html' | 'css';
    start: number;
    end: number;
    content: string;
}

const TEMPLATE_RE = /(?:template\s*:\s*|(?<=\b)html\s*)`/g;
const STYLES_RE = /(?:styles\s*:\s*|(?<=\b)css\s*)`/g;

function findTemplateLiteralEnd(text: string, openIndex: number): number {
    let depth = 0;
    for (let i = openIndex; i < text.length; i++) {
        const ch = text[i];
        if (ch === '\\') { i++; continue; }
        if (ch === '$' && text[i + 1] === '{') { depth++; i++; continue; }
        if (ch === '`' && depth > 0) {
            const nested = findTemplateLiteralEnd(text, i + 1);
            if (nested === -1) return -1;
            i = nested;
            continue;
        }
        if (ch === '}' && depth > 0) { depth--; continue; }
        if (ch === '`' && depth === 0) return i;
    }
    return -1;
}

function extractContent(text: string, start: number, end: number): string {
    let result = '';
    let i = start;
    while (i < end) {
        if (text[i] === '\\') {
            result += text[i + 1] ?? '';
            i += 2;
            continue;
        }
        if (text[i] === '$' && text[i + 1] === '{') {
            let depth = 1;
            let j = i + 2;
            while (j < end && depth > 0) {
                if (text[j] === '\\') { j += 2; continue; }
                if (text[j] === '`') {
                    const nested = findTemplateLiteralEnd(text, j + 1);
                    if (nested !== -1) { j = nested + 1; continue; }
                }
                if (text[j] === '{') depth++;
                else if (text[j] === '}') depth--;
                j++;
            }
            const placeholderLen = j - i;
            result += ' '.repeat(placeholderLen);
            i = j;
            continue;
        }
        result += text[i];
        i++;
    }
    return result;
}

function findRegions(text: string): EmbeddedRegion[] {
    const regions: EmbeddedRegion[] = [];
    for (const [re, lang] of [[TEMPLATE_RE, 'html'], [STYLES_RE, 'css']] as const) {
        re.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = re.exec(text)) !== null) {
            const contentStart = m.index + m[0].length;
            const contentEnd = findTemplateLiteralEnd(text, contentStart);
            if (contentEnd === -1) continue;
            regions.push({ lang, start: contentStart, end: contentEnd, content: extractContent(text, contentStart, contentEnd) });
        }
    }
    return regions;
}

function regionAt(regions: EmbeddedRegion[], offset: number): EmbeddedRegion | undefined {
    return regions.find(r => offset >= r.start && offset <= r.end);
}

const htmlLS = getHtmlLS();
const cssLS = getCssLS();

function virtualDoc(region: EmbeddedRegion): TextDocument {
    return TextDocument.create(`embedded:///${region.lang}`, region.lang, 1, region.content);
}

export function activate(ctx: vscode.ExtensionContext): void {
    const selector: vscode.DocumentSelector = [
        { language: 'typescript', scheme: 'file' },
        { language: 'typescriptreact', scheme: 'file' },
    ];

    ctx.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(selector, {
            provideCompletionItems(doc, pos) {
                const text = doc.getText();
                const offset = doc.offsetAt(pos);
                const regions = findRegions(text);
                const region = regionAt(regions, offset);
                if (!region) return;

                const localOffset = offset - region.start;
                const vDoc = virtualDoc(region);
                const vPos = vDoc.positionAt(localOffset);

                if (region.lang === 'html') {
                    const htmlDoc = htmlLS.parseHTMLDocument(vDoc);
                    const items = htmlLS.doComplete(vDoc, vPos, htmlDoc);
                    return items.items.map(i => {
                        const item = new vscode.CompletionItem(i.label as string, vscode.CompletionItemKind.Property);
                        if (i.insertText) item.insertText = i.insertText;
                        if (i.documentation) item.documentation = typeof i.documentation === 'string' ? i.documentation : i.documentation.value;
                        return item;
                    });
                } else {
                    const sheet = cssLS.parseStylesheet(vDoc);
                    const items = cssLS.doComplete(vDoc, vPos, sheet);
                    return items.items.map(i => {
                        const item = new vscode.CompletionItem(i.label, vscode.CompletionItemKind.Property);
                        if (i.insertText) item.insertText = i.insertText;
                        if (i.documentation) item.documentation = typeof i.documentation === 'string' ? i.documentation : i.documentation.value;
                        return item;
                    });
                }
            }
        }, '<', '/', '.', ':', '-', ' '),

        vscode.languages.registerHoverProvider(selector, {
            provideHover(doc, pos) {
                const text = doc.getText();
                const offset = doc.offsetAt(pos);
                const regions = findRegions(text);
                const region = regionAt(regions, offset);
                if (!region) return;

                const localOffset = offset - region.start;
                const vDoc = virtualDoc(region);
                const vPos = vDoc.positionAt(localOffset);

                let hover;
                if (region.lang === 'html') {
                    const htmlDoc = htmlLS.parseHTMLDocument(vDoc);
                    hover = htmlLS.doHover(vDoc, vPos, htmlDoc);
                } else {
                    const sheet = cssLS.parseStylesheet(vDoc);
                    hover = cssLS.doHover(vDoc, vPos, sheet);
                }
                if (!hover) return;
                const contents = typeof hover.contents === 'string'
                    ? hover.contents
                    : 'value' in hover.contents
                        ? hover.contents.value
                        : hover.contents.map(c => typeof c === 'string' ? c : c.value).join('\n');
                return new vscode.Hover(new vscode.MarkdownString(contents));
            }
        }),
    );
}

export function deactivate(): void {}
