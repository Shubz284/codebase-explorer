import { Parser, Language } from "web-tree-sitter";

type ParseResult = {
  imports: string[];
  exports: string[];
  functionCount: number;
};


const sourceCode = `
import { db } from "./db";
import { foo } from "./utils";

export function login() {
    return db.findUser();
}

function helper() {}
`;

async function parseCode(sourceCode: string): Promise<ParseResult> {
  // create parser

  await Parser.init();

  const parser = new Parser();

  const JavaScript = await Language.load(
    "./node_modules/tree-sitter-javascript/tree-sitter-javascript.wasm",
  );

  parser.setLanguage(JavaScript);
  // parse sourceCode

  const tree = parser.parse(sourceCode);
  // get rootNode

  const imports: string[] = [];
  const exports: string[] = [];
  let functionCount = 0;

  function walk(node: any) {
    if (node.type === "import_statement") {
      const source = node.childForFieldName("source");

      if (source) {
          imports.push(source.text.replace(/['"]/g, ""));
      }
    }

    if (node.type === "export_statement") {
      const declaration = node.childForFieldName("declaration");

      const name = declaration?.childForFieldName("name");
      if (name) {
            exports.push(name.text);
        }
    }

    if (node.type === "function_declaration") {
      functionCount++;
    }

    for (const child of node.namedChildren) {
      walk(child);
    }
  }

  walk(tree!.rootNode);

  return {
    imports,
    exports,
    functionCount,
  };
}

async function main() {
  const data = await parseCode(sourceCode);
  console.log(data);
}

main();