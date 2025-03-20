import { walk } from "estree-walker";
import { parse } from "meriyah";
import { match, P } from "ts-pattern";
import { generate } from "astring";

const contents = await Bun.file("./elm-before.js").text();
const tree = parse(contents);

walk(tree, {
	leave(node, parent) {
		match(node)
			.with(
				{
					type: "Program",
					body: [
						{
							type: "ExpressionStatement",
							expression: {
								type: "CallExpression",
								callee: {
									type: "FunctionExpression",
									body: {
										type: "BlockStatement",
										body: P.select(),
									},
								},
							},
						},
					],
				},
				(innerBody) => {
					node.body = innerBody;
				},
			)
			.with(
				{
					type: "ExpressionStatement",
					expression: {
						type: "CallExpression",
						callee: { name: "_Platform_export" },
						arguments: [
							{
								type: "ObjectExpression",
								properties: P.select(),
							},
						],
					},
				},
				(properties) => {
					this.remove();
					for (const { key, value } of properties) {
						parent.body.push({
							type: "ExportNamedDeclaration",
							specifiers: [],
							source: null,
							declaration: {
								type: "VariableDeclaration",
								kind: "const",
								declarations: [
									{
										id: {
											type: "Identifier",
											name: key.name,
										},
										init: value,
									},
								],
							},
						});
					}
				},
			)
			.otherwise(() => {});
	},
});

Bun.write("./elm-after.js", generate(tree));
