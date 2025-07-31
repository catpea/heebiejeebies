#!/usr/bin/env node
import util from 'node:util';

import { xml } from "./src/xml.js";
import { XMLParser } from "./src/XMLParser.js";


const foo = xml`
<Panel ${{color:'red'}} caption="Foo" width="${200}" height=${200} gap="5" gap="10">
  <VGroup left="10" top="10" bottom="10" gap="5" ${"checked"}>
    ${xml`<Text id="123" content="" width="180"></Text>`}
  </VGroup>
</Panel>
`;
console.log(util.inspect(foo, { showHidden: true, depth: null }));
process.exit();


// Usage example:
const parser = new XMLParser();

const xml1 = `
<Panel caption="Foo" width="200" height="200" gap="5">
    <VGroup left="10" top="10" bottom="10" gap="5">
      <Text id="123" content="" width="180"></Text>
    </VGroup>
</Panel>
`;

const xml2 = `
<main class="foo" class="foo2">
  <div class="alert alert-info" class:alert="true" role="alert">...</div>
  <br> <!-- support comments and keep a void tag list populated with HTML void tags -->
</main>
`;

// Parse and demonstrate usage
const tree1 = parser.parse(xml1);
const tree2 = parser.parse(xml2);

console.log('=== Tree 1 ===');
console.log('Panel caption:', tree1.find('Panel')?.attr('caption'));
console.log('Text element:', tree1.find('Text'));

console.log('\n=== Tree 2 ===');
console.log('Main classes:', tree2.find('main')?.attrs('class'));
console.log('Div with alert class:', tree2.findByAttr('class', 'alert'));

console.log('\n=== Walking Tree 2 ===');
tree2.walk(node => {
  if (node.name && node.name !== 'root') {
    console.log(`Found: ${node.name}`);
  }
});
