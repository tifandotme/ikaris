import type {
  ConditionalExpression,
  Identifier,
  JSXAttribute,
  JSXExpressionContainer,
  JSXOpeningElement,
  Module,
  Node,
  StringLiteral,
} from "@swc/core";

// deno-lint-ignore no-explicit-any
function isNode(value: any): value is Node {
  return value && typeof value === "object" && "type" in value;
}

function isJSXOpeningElement(node: Node): node is JSXOpeningElement {
  return node.type === "JSXOpeningElement";
}

function isIdentifier(node: Node): node is Identifier {
  return node.type === "Identifier";
}

function isIconElement(element: JSXOpeningElement): boolean {
  return isIdentifier(element.name) && element.name.value === "Icon";
}

function isJSXAttribute(node: Node): node is JSXAttribute {
  return node.type === "JSXAttribute";
}

function isStringLiteral(node: Node): node is StringLiteral {
  return node.type === "StringLiteral";
}

function isJSXExpressionContainer(node: Node): node is JSXExpressionContainer {
  return node.type === "JSXExpressionContainer";
}

function isConditionalExpression(node: Node): node is ConditionalExpression {
  return node.type === "ConditionalExpression";
}

interface ExtendedNode extends Node {
  // deno-lint-ignore no-explicit-any
  [key: string]: any;
}

export function collectIconIds(module: Module): string[] {
  const ids = new Set<string>();

  const findIdAttribute = (
    element: JSXOpeningElement,
  ): JSXAttribute | undefined =>
    element.attributes?.find((attr): attr is JSXAttribute =>
      isJSXAttribute(attr) &&
      isIdentifier(attr.name) &&
      attr.name.value === "id"
    );

  const handleIdAttribute = (attr: JSXAttribute) => {
    if (!attr.value) return;

    if (isStringLiteral(attr.value)) {
      ids.add(attr.value.value);
    } else if (isJSXExpressionContainer(attr.value)) {
      const expr = attr.value.expression;

      if (isConditionalExpression(expr)) {
        if (isStringLiteral(expr.consequent)) {
          ids.add(expr.consequent.value);
        }
        if (isStringLiteral(expr.alternate)) {
          ids.add(expr.alternate.value);
        }
      }
    }
  };

  const traverse = (node: ExtendedNode) => {
    if (!node || typeof node !== "object") return;

    if (isJSXOpeningElement(node)) {
      if (isIconElement(node)) {
        const idAttr = findIdAttribute(node);
        if (idAttr) {
          handleIdAttribute(idAttr);
        }
      }
    }

    for (const key in node) {
      if (Array.isArray(node[key])) {
        node[key].forEach((item: Node) => traverse(item));
      } else if (isNode(node[key])) {
        traverse(node[key]);
      }
    }
  };

  module.body.forEach(traverse);

  return Array.from(ids);
}

// function collectIconIds(module: Module): Set<string> {
//   const ids = new Set<string>();

//   function traverse(node: any) {
//     if (!node || typeof node !== "object") return;

//     if (
//       node.type === "JSXOpeningElement" &&
//       node.name?.type === "Identifier" &&
//       node.name.value === "Icon"
//     ) {
//       const idAttr = node.attributes?.find((attr) =>
//         attr.type === "JSXAttribute" &&
//         attr.name?.value === "id"
//       );

//       if (idAttr?.value) {
//         // Handle string literal
//         if (idAttr.value.type === "StringLiteral") {
//           ids.add(idAttr.value.value);
//         } // Handle JSX expression container with conditional
//         else if (idAttr.value.type === "JSXExpressionContainer") {
//           const expr = idAttr.value.expression;

//           // Handle ternary/conditional expression
//           if (expr.type === "ConditionalExpression") {
//             if (expr.consequent.type === "StringLiteral") {
//               ids.add(expr.consequent.value);
//             }
//             if (expr.alternate.type === "StringLiteral") {
//               ids.add(expr.alternate.value);
//             }
//           }
//         }
//       }
//     }

//     // Recursively traverse all properties
//     for (const key in node) {
//       if (Array.isArray(node[key])) {
//         node[key].forEach(traverse);
//       } else {
//         traverse(node[key]);
//       }
//     }
//   }

//   module.body.forEach(traverse);

//   return ids;
// }
