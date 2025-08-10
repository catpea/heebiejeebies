import { Signal } from "./Signal.js";
import { XMLParser } from "./XMLParser.js";

// Pick One:
// import parsingStrategy from "./strategy/state-machine.js"; // 4.338ms, 4.545ms This gives you a solid foundation for the XMLParser to process the markers and convert them into reactive DOM updates!
import parsingStrategy from "./strategy/quote-bracket.js"; // 4.607ms, 4.902ms This approach is ideal when you need **absolute accuracy** and **comprehensive context information**, especially for complex templates with mixed quote types and escaped sequences!
// import parsingStrategy from "./strategy/regex-based.js";   // 4.666ms, 4.938ms This approach gives you excellent performance for the 90% case while still being robust enough for production use!
// import parsingStrategy from "./strategy/token-based.js";   // 5.197ms, 5.248ms This approach gives you the best balance of accuracy and maintainability, making it ideal for production template systems where correctness is paramount!
// import parsingStrategy from "./strategy/multi-pass.js";    // 5.462ms, 5.57ms, This is the most sophisticated approach that provides maximum accuracy through systematic verification. This multi-pass strategy represents the **gold standard** for template parsing - when you absolutely need to get the context right every time, regardless of template complexity!

const parser = new XMLParser();

export function xtree({ raw: strings }, ...values) {
  const context = new Map();
  const xml = parsingStrategy(context, strings, values);
  const nodeTree = parser.parse(xml); // Create tree with :: markers (attr="::0", ::1="", <!-- ::5 -->) Markers
  interpolateAttributes(nodeTree, context); // PHASE 3: Upgrade Intermediate Attributes - Live Attributes
  const destructibles = new Set();
  interpolateNodes(nodeTree, context, destructibles); // PHASE 4: Upgrade Intermediate Nodes (Comment Nodes) - Node Import
  const signalListeners = () =>
    [...database.values()]
      .filter((record) => record.isTemplateVariable)
      .filter((record) => record.unsubscribe.length > 0)
      .map((record) => record.unsubscribe)
      .flat()
      .forEach((unsubscribeFn) => unsubscribeFn());
  destructibles.add(signalListeners);
  const unsubscribe = () => destructibles.forEach((destructible) => destructible());

  const electedRoot = nodeTree.children.length==1?nodeTree.children[0]:nodeTree;
  return { tree: electedRoot, unsubscribe, appendInto: htmlElement=>appendInto(electedRoot, htmlElement)};
}

// for: interpolateAttributes
function parseElementAttributeValue(value) {
  if (typeof value === "string") {
    if (value.includes("%")) {
      return { value: parseFloat(value), unit: "%" };
    }
    if (!isNaN(value)) {
      return parseFloat(value);
    }
  }
  return value;
}

function interpolateAttributes(root, database) {
  root.walk((node) => {
    const newAttributes = [];

    for (const [index, attribute] of node.attributes.entries()) {
      // UNUSED: const isReferenceToValue = attribute.name.startsWith("::");
      const isPrimitiveAttribute = !attribute.name.startsWith("::") && !attribute.value.startsWith("::"); // <---- THIS IS OPTIMIZED THIS: const isPlainAttribute = /^[a-zA-Z]/.test(attribute.name)
      const isAttributeReference = !attribute.name.startsWith("::") && attribute.value.startsWith("::");
      const isSpreadReference = attribute.name.startsWith("::") && attribute.value == "";

      if (isPrimitiveAttribute) {
        // upgrade plain to Signal height="120"
        const parsedValue = parseElementAttributeValue(attribute.value);
        delete attribute.value;

        attribute.signal = new Signal(parsedValue);
        // NOTE: do not add new signals to database, we are in the tree now, add to tree directly
      }

      if (isAttributeReference) {
        // upgrade height="::3" from reference to signal
        const id = parseInt(attribute.value.substr(2));
        delete attribute.value;
        attribute.signal = database.get(id).value;
      }

      // Spread Objects
      if (isSpreadReference) {
        const id = parseInt(attribute.name.substr(2));
        const packet = database.get(id);
        if (packet) {
          // UPGRADE OBJECT TO NEW PROPERTIES
          for (const [attributeName, content] of Object.entries(packet.value.value)) {
            // This may need to be converted to signal:
            const signal = new Signal(content);
            const capitalizedName = String(attributeName).charAt(0).toUpperCase() + String(attributeName).slice(1);
            const recordId = attribute.name + "-" + attributeName;
            const intelligence = { isAttributeValueAssignment: true, attributeName, ["is" + capitalizedName + "Attribute"]: true };
            newAttributes.push({ originalIndex: index, name: attributeName, signal });
          } // for
        }
        delete node.attributes[index];
      } // if quad
    } // for

    // Place everything correctly
    let newAdditionCounter = 1;
    for (const { originalIndex, name, signal } of newAttributes) {
      node.attributes.splice(originalIndex + newAdditionCounter++, 0, { name, signal });
    }
    // and then clean up the sparsearray
    node.attributes = node.attributes.filter((item) => item !== undefined);
  }); // walk
}

function interpolateNodes(root, context, destructibles) {
  const nodesToRemove = [];
  const commentNodes = root.findType(1, (node) => node.content.trim().startsWith("::"));
  // console.log(commentNodes)
  if (!commentNodes.length) return;

  for (const commentNode of commentNodes) {
    nodesToRemove.push(commentNode);
    const nodesToImport = [];
    const id = parseInt(commentNode.content.trim().substr(2));
    const record = context.get(id);

    if (record) {
      const { tree, unsubscribe } = record.value;
      // chain memory
      destructibles.add(unsubscribe);
      destructibles.add(() => tree.empty());
      nodesToImport.push(...tree.children);
    }
    // Insert accumulated nodes after the comment marker
    if (nodesToImport.length > 0) {
      commentNode.after(...nodesToImport);
    } else {
      console.warn(`Warning: no new nodes were added for ${commentNode.data}`);
    }
  }

  // Remove comment markers after processing
  for (const node of nodesToRemove) {
    node.remove();
  }
}

function appendInto(sourceNode, targetNode){


  if (sourceNode.content && typeof sourceNode.content === 'string') {
     const textNode = document.createTextNode(sourceNode.content);
     if (targetNode) {
       targetNode.appendChild(textNode);
     }
     return textNode;
   }


  const element = document.createElement(sourceNode.name);

  // Set attributes if they exist
  if (sourceNode.attributes && Array.isArray(sourceNode.attributes)) {
    sourceNode.attributes.forEach(attr => attr.signal.subscribe(v=>element.setAttribute(attr.name, v)) );
  }

  // Recursively process children if they exist
  if (sourceNode.children && Array.isArray(sourceNode.children)) {
    sourceNode.children.forEach(child => {
      appendInto(child, element);
    });
  }

  // Append to target node if provided
  if (targetNode) {
    targetNode.appendChild(element);
  }

  return element;
}
