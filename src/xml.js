import { Record } from './Record.js';
import { XMLParser } from "./XMLParser.js";

let id = 1;
function generateId() {
  // const randomChars = (length = 8) => Array.from({ length }, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join("");
  // return `${randomChars()}-${randomChars(4)}-${randomChars(4)}-${randomChars(4)}-${randomChars(12)}`;
  return 'id'+id++;
}

const parser = new XMLParser();
export function xml({ raw: strings }, ...values) {

  const context = new Map();
  const stream = createStream(context, strings, values);

  const xml = createIntermediateHtml(stream, context); // PHASE 2: Create Intermediate HTML
  const root = parser.parse(xml); // Create tree with ::1 <!-- ::2 --> Markers

  interpolateAttributes(root, context); // PHASE 3: Upgrade Intermediate Attributes - Live Attributes
  // interpolateNodes(root, context); // PHASE 4: Upgrade Intermediate Nodes (Comment Nodes) - Node Import




  const unsubscribe = () =>
    [...database.values()]
      .filter((record) => record.isTemplateVariable)
      .filter((record) => record.unsubscribe.length > 0)
      .map((record) => record.unsubscribe)
      .flat()
      .forEach((unsubscribeFn) => unsubscribeFn());

  return {root, unsubscribe};
}






/**
 * Creates a processing stream and database from template strings and values
 * @private
 * @param {Map} context - Records database for looking up referenced content
 * @param {TemplateStringsArray} strings - Template literal strings
 * @param {Array} values - Interpolated values from the template
 * @returns {Array} Returns an array containing [stream, database] where stream is an Array and database is a Map
 * @example
 * // Internal usage in html function
 * const strings = ["<div>", "</div>"];
 * const values = ["Hello"];
 * const [stream, database] = createStream(strings, values);
 */
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


/**
 * Creates intermediate HTML string with markers for later processing
 * @private
 * @param {Array} stream - Processing stream containing template chunks and references
 * @param {Map} context - Records database for looking up referenced content
 * @returns {string} HTML string with markers that will be replaced during interpolation
 * @example
 * // Creates HTML like: <div class="::1"><!--::2--></div>
 * // Where ::1 and ::2 are markers for later replacement
 */
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

export class Signal {
  #id;
  #value;
  v;
  #subscribers;
  #disposables;

  constructor(value, {id, label}={label:'unlabeled'}) {
    this.#id = id??generateId();
    this.#value = value;
    this.v = value;
    this.#subscribers = new Set();
    this.#disposables = new Set();
    // graph.add(this.#id, this, label + ':' + this.#id);
  }
  get id(){ return this.#id}
  get value() {
    return this.#value;
  }

  set value(newValue) {
    if (newValue == this.#value) return; // IMPORTANT FEATURE: if value is the same, exit early, don't disturb if you don't need to
    this.#value = newValue;
    this.notify(); // all observers
  }

  subscribe(subscriber) {
    if (this.#value != null) subscriber(this.#value); // IMPORTANT FEATURE: instant notification (initialization on subscribe), but don't notify on null/undefined, predicate functions will look simpler, less error prone
    this.#subscribers.add(subscriber);
    return () => this.#subscribers.delete(subscriber); // IMPORTANT FEATURE: return unsubscribe function, execute this to stop getting notifications.
  }

  notify() {
    for (const subscriber of this.#subscribers) subscriber(this.#value);
  }

  clear() {
    // shutdown procedure
    this.#subscribers.clear(); // destroy subscribers
    this.#disposables.forEach((disposable) => disposable());
    this.#disposables.clear(); // execute and clear disposables
    graph.remove(this.#id);
  }

  // add related trash that makes sense to clean when the signal is shutdown
  collect(...input) {
    [input].flat(Infinity).forEach((disposable) => this.#disposables.add(disposable));
  }

  [Symbol.toPrimitive](hint) {
    if (hint === "string") {
      return this.#id;
    } else if (hint === "number") {
      return 0;
    }
    return this.#id; // default case
  }
}

function interpolateAttributes(root, database) {
  root.walk(node => {
    for (const [index, attribute] of node.attributes.entries()) {

      const isObject = attribute.name.startsWith("::");

       if (!isObject){
        //WARN: ALL ATTRIBUTES ARE SIGNALS NOW!!!!!!!!!!!!
        // convert to signal
        // node.setAttribute(attributeName, String(record.content));
        node.attributes[index] = new Signal(attribute.value)
      }

      // TODO: add <foo ${{}}/> object support
      if (attribute.name.startsWith("::")) {
        const packet = database.get(attribute.name);
        if (packet && packet.isObjectType) {
          // Apply Object To Node
          // this is a convenience methos for converting raw objects into properties
        }
      } // if quad


      } // for
    }) // walk
}


/**
 * Processes and upgrades HTML attributes with reactive bindings
 * @private
 * @param {DocumentFragment} root - Root node to process
 * @param {Map} database - Records database containing attribute data
 * @description This function handles various types of attribute bindings:
 * - Reactive attributes from signals
 * - Object spreading for multiple attributes
 * - Event handler assignments
 * - Style object processing
 * - Class array processing
 */
function interpolateAttributes2(root, database) {

  root.walk(node => {

    const attributesToProcess = [];

    // Collect all attributes that need processing
    // for (const attribute of node.attributes) {
    node.attributes.forEach((attribute, i)=>{

      // Handle object attribute spreads (::4="")
      if (attribute.name.startsWith("::")) {

        const packet = database.get(attribute.name);

        if (packet && packet.isObjectType) {
          for (const [attributeName, content] of Object.entries(packet.content)) {
            const capitalizedName = String(attributeName).charAt(0).toUpperCase() + String(attributeName).slice(1);
            const recordId = attribute.name + "-" + attributeName;
            const intelligence = {
              isAttributeValueAssignment: true,
              attributeName,
              ["is" + capitalizedName + "Attribute"]: true
            };
            const attributePayload = new Record(recordId, content, intelligence);
            database.set(recordId, attributePayload);
            attributesToProcess.push({ attributeName, attributePayload });
          }
        }
        delete node.attributes[ node.attributes.indexOf(attribute) ];


      } // if quad

      // Handle direct attribute value assignments (color="::6")
      if (attribute.value.startsWith("::")) {
        const attributeName = attribute.name;
        const recordId = attribute.value;
        const attributePayload = database.get(recordId);
        if (!attributePayload) {
          throw new Error(`Record id "${recordId}" was not found in the database.`);
        }

        attributesToProcess.push({ attributeName, attributePayload });
        delete node.attributes[ node.attributes.indexOf(attribute) ];

      }

    });






    // Process all collected attributes
    for (const { attributeName, attributePayload: record } of attributesToProcess) {

      if (record.isSignalType && record.isStyleAttribute) {
        // Handle reactive style objects
        const signal = record.content;
        const unsubscribe = signal.subscribe((styleObj) => {
          if (styleObj && typeof styleObj === 'object') {
            for (const [cssProperty, cssValue] of Object.entries(styleObj)) {
              if (cssValue && typeof cssValue === 'object' && cssValue.subscribe) {
                // Handle nested signals in style objects
                const nestedUnsubscribe = cssValue.subscribe((value) => {
                  node.style[cssProperty] = value;
                });
                record.unsubscribe.push(nestedUnsubscribe);
              } else {
                node.style[cssProperty] = cssValue;
              }
            }
          }
        });
        record.unsubscribe.push(unsubscribe);
      } else if (record.isClassAttribute && record.isArrayType) {
        // Handle reactive class arrays
        node.user_currentState = new Set();
        for (const item of record) {
          if (item && typeof item === 'object' && item.subscribe) {
            const unsubscribe = item.subscribe((value) => {
              const expectedState = classes(value);
              const currentState = node.user_currentState;
              const toRemove = currentState.difference ? currentState.difference(expectedState) : new Set([...currentState].filter(x => !expectedState.has(x)));
              const toAdd = expectedState.difference ? expectedState.difference(currentState) : new Set([...expectedState].filter(x => !currentState.has(x)));

              node.classList.remove(...toRemove);
              node.classList.add(...toAdd);
              node.user_currentState = expectedState;
            });
            record.unsubscribe.push(unsubscribe);
          } else {
            node.classList.add(String(item));
          }
        }
      } else if (record.isSignalType) {
        // Handle reactive attributes
        const signal = record.content;
        const unsubscribe = signal.subscribe((value) => {
          if (value != null) {
            node.setAttribute(attributeName, String(value));
          } else {
            node.removeAttribute(attributeName);
          }
        });
        record.unsubscribe.push(unsubscribe);
      } else if (record.isObjectType && record.isStyleAttribute) {
        // Handle static style objects
        for (const [cssProperty, cssValue] of Object.entries(record.content)) {
          node.style[cssProperty] = cssValue;
        }
      } else if (record.isObjectType) {
        // Handle event handlers and other object properties
        for (const [eventName, eventHandler] of Object.entries(record.content)) {
          if (typeof eventHandler === "function") {
            node[eventName] = eventHandler;
          }
        }
      } else if (record.isFunctionType) {
        // Handle function attributes
        node[attributeName] = record.content;
      } else if (record.isStringType || record.isNumberType) {
        // Handle primitive attributes
        node.setAttribute(attributeName, String(record.content));
      } else if (record.content != null) {
        // Handle other types with coercion
        node.setAttribute(attributeName, String(record.content));
      }

    }




  }) // walk

}


function interpolateAttributesPlainProcessor(attributesToProcess){
}

function interpolateAttributesDomlikeProcessor(attributesToProcess){

}











/**
 * Processes and upgrades comment node markers with actual content
 * @private
 * @param {DocumentFragment} root - Root node to process
 * @param {Map} database - Records database containing node content
 * @description Replaces comment markers (<!--::1-->) with actual DOM content based on the record type
 */
function interpolateNodes(root, database) {
  const commentWalker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_COMMENT,
    {
      acceptNode: (node) => (node.data.startsWith("::") ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP)
    }
  );

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
