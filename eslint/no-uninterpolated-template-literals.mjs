const rule = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Disallow backticks when the template has no interpolation",
    },
    fixable: "code",
    schema: [],
    messages: {
      preferQuotes: "Use quotes when the string has no interpolation.",
    },
  },
  create(context) {
    return {
      TemplateLiteral(node) {
        if (node.parent?.type === "TaggedTemplateExpression") return;
        if (node.expressions.length > 0) return;

        const cooked = node.quasis.map((quasi) => quasi.value.cooked);
        if (cooked.some((value) => value == null)) return;

        const text = cooked.join("");
        if (text.includes("\n") || text.includes("\r")) return;

        context.report({
          node,
          messageId: "preferQuotes",
          fix(fixer) {
            const quote = text.includes('"') && !text.includes("'") ? "'" : '"';
            const body = text
              .replaceAll("\\", "\\\\")
              .replaceAll("\u2028", "\\u2028")
              .replaceAll("\u2029", "\\u2029")
              .replaceAll(quote, `\\${quote}`);
            const quoted = `${quote}${body}${quote}`;
            const container = node.parent;
            if (
              container?.type === "JSXExpressionContainer" &&
              container.parent?.type === "JSXAttribute"
            ) {
              return fixer.replaceText(container, quoted);
            }
            return fixer.replaceText(node, quoted);
          },
        });
      },
    };
  },
};

const plugin = {
  meta: { name: "local" },
  rules: { "no-uninterpolated-template-literals": rule },
};

export default plugin;
