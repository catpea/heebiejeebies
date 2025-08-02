import util from 'node:util';
import { xml } from "./src/xml.js";
import { Signal } from "./src/Signal.js";

// Standard test case for all implementations
const width = new Signal(200);
const height = new Signal(150);
const className = new Signal("panel");
const dynamicAttr1 = new Signal({AAAA: "test-a", "data-AAAA": "aaa"});
const dynamicAttr2 = new Signal({BBBB: "test-b", "data-BBBB": "bbb"});
const content = new Signal("Hello World");

console.time("Execution Time");

const result = xml`
  <Panel
    class="${className}"
    ${dynamicAttr1}
    width="${width}"
    height="${height}"
    gap="5"
    ${dynamicAttr2}
    >
    <VGroup left="10" top="10" bottom="10" gap="5">

      ${xml`<Text id="123" content="" width="180"></Text>`}

    </VGroup>
  </Panel>
`;

console.timeEnd("Execution Time");
console.log(util.inspect(result, { showHidden: false, depth: null, colors:1 }));
