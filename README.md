# heebiejeebies
The Worlds Most Beautiful Simplified XML Parser and Matching Tagged Template Literal

```JavaScript

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

```

## RESULT

```JavaScript

<Text id="123" content="" width="180"></Text>

  <Panel
    class="::0"
    ::1=""
    width="::2"
    height="::3"
    gap="5"
    ::4=""
    >
    <VGroup left="10" top="10" bottom="10" gap="5">

      <!-- ::5 -->

    </VGroup>
  </Panel>

Execution Time: 6.677ms
{
  tree: <ref *3> ParseNode {
    name: 'root',
    attributes: [],
    children: [
      <ref *2> ParseNode {
        name: 'Panel',
        attributes: [
          { name: 'class', value: Signal { v: 'panel' } },
          { name: 'AAAA', value: Signal { v: 'test-a' } },
          { name: 'data-AAAA', value: Signal { v: 'aaa' } },
          { name: 'width', value: Signal { v: 200 } },
          { name: 'height', value: Signal { v: 150 } },
          { name: 'gap', value: Signal { v: 5 } },
          { name: 'BBBB', value: Signal { v: 'test-b' } },
          { name: 'data-BBBB', value: Signal { v: 'bbb' } }
        ],
        children: [
          ParseNode {
            name: 'VGroup',
            attributes: [
              { name: 'left', value: Signal { v: 10 } },
              { name: 'top', value: Signal { v: 10 } },
              { name: 'bottom', value: Signal { v: 10 } },
              { name: 'gap', value: Signal { v: 5 } }
            ],
            children: [
              <ref *1> ParseNode {
                name: 'Text',
                attributes: [
                  { name: 'id', value: Signal { v: 123 } },
                  { name: 'content', value: Signal { v: NaN } },
                  { name: 'width', value: Signal { v: 180 } }
                ],
                children: [],
                isVoid: false,
                parent: ParseNode {
                  name: 'root',
                  attributes: [],
                  children: [ [Circular *1] ],
                  isVoid: false,
                  parent: null
                }
              }
            ],
            isVoid: false,
            parent: [Circular *2]
          }
        ],
        isVoid: false,
        parent: [Circular *3]
      }
    ],
    isVoid: false,
    parent: null
  },
  unsubscribe: [Function: unsubscribe]


```
