import { Parser, Language } from "web-tree-sitter";
import path from "path";

export type ParseResult = {
  imports: string[];
  exports: string[];
  functionCount: number;
};

type Grammar = "javascript" | "typescript" | "tsx";

function pickGrammar(filePath: string): Grammar {
  if (filePath.endsWith(".tsx")) return "tsx";
  if (filePath.endsWith(".ts")) return "typescript";
  return "javascript";
}

const WASM_PATHS: Record<Grammar, string> = {
  javascript: "node_modules/tree-sitter-javascript/tree-sitter-javascript.wasm",
  typescript: "node_modules/tree-sitter-typescript/tree-sitter-typescript.wasm",
  tsx: "node_modules/tree-sitter-typescript/tree-sitter-tsx.wasm",
};

let initPromise: Promise<void> | null = null;
function ensureInit() {
  if (!initPromise) initPromise = Parser.init();
  return initPromise;
}

const parserCache = new Map<Grammar, Parser>();

async function getParser(grammar: Grammar): Promise<Parser> {
  if (parserCache.has(grammar)) return parserCache.get(grammar)!;
  await ensureInit();
  const lang = await Language.load(path.join(process.cwd(), WASM_PATHS[grammar]));
  const parser = new Parser();
  parser.setLanguage(lang);
  parserCache.set(grammar, parser);
  return parser;
}

export async function getTree(sourceCode: string, filePath: string) {
  const parser = await getParser(pickGrammar(filePath));
  return parser.parse(sourceCode);
}

export async function parseFile(sourceCode: string, filePath: string): Promise<ParseResult> {
  const parser = await getParser(pickGrammar(filePath));
  const tree = parser.parse(sourceCode);

  const imports: string[] = [];
  const exports: string[] = [];
  let functionCount = 0;

   function walk(node: any) {
    // ES module imports: import x from "./y"
    if (node.type === "import_statement") {
      const source = node.childForFieldName("source");
      if (source) imports.push(source.text.replace(/['"]/g, ""));
    }

    // CommonJS: require("./y")
    if (node.type === "call_expression") {
      const fn = node.childForFieldName("function");
      if (fn?.type === "identifier" && fn.text === "require") {
        const args = node.childForFieldName("arguments");
        const source = args?.namedChildren[0];
        if (source?.type === "string") {
          imports.push(source.text.replace(/['"]/g, ""));
        }
      }
    }

    // ES module exports: export function/class X, export const X = ..., export default X
    if (node.type === "export_statement") {
      const declaration = node.childForFieldName("declaration");

      if (declaration) {
        const name = declaration.childForFieldName("name");
        if (name) exports.push(name.text);

        // export const x = () => {...}  /  export const x = 5
        if (
          declaration.type === "lexical_declaration" ||
          declaration.type === "variable_declaration"
        ) {
          for (const declarator of declaration.namedChildren) {
            const declaratorName = declarator.childForFieldName("name");
            if (declaratorName) exports.push(declaratorName.text);
          }
        }
      }

      // export default someVariable;  (bare identifier, no declaration)
      for (const child of node.namedChildren) {
        if (child.type === "identifier") {
          exports.push(child.text);
        }
      }

      // export { a, b }
      for (const child of node.namedChildren) {
        if (child.type === "export_clause") {
          for (const specifier of child.namedChildren) {
            if (specifier.type === "export_specifier") {
              const name = specifier.childForFieldName("name");
              if (name) exports.push(name.text);
            }
          }
        }
      }
    }

    // CommonJS exports — three shapes handled separately below
    if (node.type === "assignment_expression") {
      const left = node.childForFieldName("left");
      const right = node.childForFieldName("right");

      // Shape 1: module.exports = { a, b: fn }  or  module.exports = someDefault
      if (left?.text === "module.exports") {
        if (right?.type === "object") {
          for (const property of right.namedChildren) {
            if (property.type === "shorthand_property_identifier_pattern") {
              exports.push(property.text);
            }
            if (property.type === "pair") {
              const key = property.childForFieldName("key");
              if (key) exports.push(key.text);
            }
          }
        } else {
          exports.push("default");
        }
      }

      // Shape 2 (new): single-property form —
      // exports.foo = ...  /  module.exports.bar = ...
      if (left?.type === "member_expression") {
        const obj = left.childForFieldName("object");
        const prop = left.childForFieldName("property");

        if (obj && prop && (obj.text === "module.exports" || obj.text === "exports")) {
          exports.push(prop.text);

          // the exported value is often a function written inline —
          // e.g. exports.foo = () => {} — count it here since it's not
          // a variable_declarator and the check below won't catch it
          if (right?.type === "arrow_function" || right?.type === "function_expression") {
            functionCount++;
          }
        }
      }
    }

    // function foo() {}
    if (node.type === "function_declaration") {
      functionCount++;
    }

    // const foo = () => {}  /  const foo = function() {}
    if (node.type === "variable_declarator") {
      const valueNode = node.childForFieldName("value");
      if (
        valueNode &&
        (valueNode.type === "arrow_function" || valueNode.type === "function_expression")
      ) {
        functionCount++;
      }
    }

    for (const child of node.namedChildren) walk(child);
  }

  walk(tree!.rootNode);
  return { imports, exports, functionCount };
}