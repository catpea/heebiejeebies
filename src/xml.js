import { Signal } from "./Signal.js";
import { Record } from "./Record.js";
import { XMLParser } from "./XMLParser.js";

const parser = new XMLParser();
export function xml({ raw: strings }, ...values) {
  const context = new Map();
  const stream = createStream(context, strings, values);
  // console.log(stream)

  const xml = createIntermediateHtml(stream, context); // PHASE 2: Create Intermediate HTML
  const root = parser.parse(xml); // Create tree with ::1 <!-- ::2 --> Markers

  interpolateAttributes(root, context); // PHASE 3: Upgrade Intermediate Attributes - Live Attributes
  interpolateNodes(root, context); // PHASE 4: Upgrade Intermediate Nodes (Comment Nodes) - Node Import

  const unsubscribe = () =>
    [...database.values()]
      .filter((record) => record.isTemplateVariable)
      .filter((record) => record.unsubscribe.length > 0)
      .map((record) => record.unsubscribe)
      .flat()
      .forEach((unsubscribeFn) => unsubscribeFn());

  return { root, unsubscribe, context };
}

function createStream(context, strings, values) {
  const stream = [];

  for (const [index, string] of strings.entries()) {

    const content = values[index];
    stream.push({ isTemplateChunk: true, content: string }); // Add raw string to stream
    if (content === undefined) continue;
    const recordId = "::" + index;
    context.set(recordId, new Record(recordId, content, string)); // Store record in database for subscription management
    stream.push({ isReference: true, id: recordId }); // Keep record reference in stream
  }


  return stream;
}


function createIntermediateHtml(stream, context) {
  const result = [];

  for (const entry of stream) {
    // Dereference stream entries
    const fragment = entry.isReference ? context.get(entry.id) : entry;

    const { isTemplateChunk, isTemplateVariable } = fragment;
    const { isAttributeValueAssignment, isAttributeDomain, isElementDomain } = fragment;


    if (isTemplateChunk) {
      // Output raw HTML
      result.push(fragment.content);
    } else if (isTemplateVariable && isAttributeValueAssignment) {
      // Marker for attribute value
      result.push(entry.id);
    } else if (isTemplateVariable && isAttributeDomain) {
      // Marker for attribute domain
      result.push(entry.id + '=""');
    } else if (isTemplateVariable && isElementDomain) {
      // Marker for element content
      result.push("<!--" + entry.id + "-->");
    }
  }

  return result.join("");
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
      const isPlainAttribute = !attribute.name.startsWith("::"); // <---- THIS IS OPTIMIZED THIS: const isPlainAttribute = /^[a-zA-Z]/.test(attribute.name)
      const isSpreadReference = attribute.name.startsWith("::");

      if (isPlainAttribute) {
        // upgrade plain to Signal
        const value = parseElementAttributeValue(attribute.value);
        const signal = new Signal(value);
        node.attributes[index].value = signal;
        database.set(signal.id, new Record(signal.id, signal));
      }

      // TODO: add <foo ${{}}/> object support
      if (isSpreadReference) {
        const packet = database.get(attribute.name);
        if (packet && packet.isObjectType) {
          // UPGRADE OBJECT TO NEW PROPERTIES
          let localIndex = 1; // 1 inserts after empty item
          for (const [attributeName, content] of Object.entries(packet.content)) {

            // This may need to be converted to signal:
            const signal = new Signal(content);
            // const recordId = signal.id;

            const capitalizedName = String(attributeName).charAt(0).toUpperCase() + String(attributeName).slice(1);
            const recordId = attribute.name + "-" + attributeName;
            const intelligence = { isAttributeValueAssignment: true, attributeName, ["is" + capitalizedName + "Attribute"]: true, };
            const attributePayload = new Record(recordId, content, intelligence);

            database.set(recordId, attributePayload);
            newAttributes.push({ after:index+localIndex++, name: attributeName, value: signal })
          } // for
        }
        delete node.attributes[index];
      } // if quad







    } // for

    for(const { after, name, value } of newAttributes){
        node.attributes.splice(after, 0, {name, value})
      }


  }); // walk
}




function interpolateNodes(root, database) {

  const nodesToRemove = [];
  const commentNodes = root.findType(1, node=>node.content.startsWith('::'));
  if(!commentNodes.length) return;

  console.log('commentNodes'.repeat(3))
  console.log(commentNodes)
  console.log('commentNodes'.repeat(3))

  for(const commentNode of commentNodes){
    nodesToRemove.push(commentNode);

    const nodesToImport = [];
    const record = database.get(commentNode.content);

    if (record) {
      // nodeImporter(nodesToImport, record);

      const {root, unsubscribe, context:remoteContext} = record.content;
      remoteContext.forEach((value, key) => database.set(key, value) );
      remoteContext.clear();
      nodesToImport.push(...root.children)




    }
    // Insert accumulated nodes after the comment marker
    if (nodesToImport.length > 0) {
      commentNode.after(...nodesToImport);
    } else {
      console.warn(`Warning: no new nodes were added for ${commentNode.data}`);
    }

    // commentNodes
  }


  // Remove comment markers after processing
  for (const node of nodesToRemove) {
    node.remove();
  }





}

function interpolateNodes3(root, database) {

  const commentWalker = document.createTreeWalker(root, NodeFilter.SHOW_COMMENT, {
    acceptNode: (node) => (node.data.startsWith("::") ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP),
  });

  const nodesToRemove = [];

  while (commentWalker.nextNode()) {
    const currentNode = commentWalker.currentNode;
    nodesToRemove.push(currentNode);

    const nodesToImport = [];
    const record = database.get(currentNode.data);

    if (record) {
      nodeImporter(nodesToImport, record);
    }

    // Insert accumulated nodes after the comment marker
    if (nodesToImport.length > 0) {
      currentNode.after(...nodesToImport);
    } else {
      console.warn(`Warning: no new nodes were added for ${currentNode.data}`);
    }
  }

  // Remove comment markers after processing
  for (const node of nodesToRemove) {
    node.remove();
  }
}
