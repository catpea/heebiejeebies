/**
 * Represents a record in the template processing system that manages template variables and their metadata
 * @class Record
 * @description Internal class used to manage template variables and their metadata during HTML processing.
 * Each record contains content (values, signals, etc.) and context information about how it should be processed.
 * @private
 */
export class Record {
  /**
   * Internal unique identifier for this record
   * @type {string}
   * @private
   */
  #id;

  /**
   * The actual content/payload (strings, objects, signals, DOM nodes, etc.)
   * @type {*}
   */
  content;

  /**
   * Array of unsubscribe functions to execute on cleanup
   * @type {Function[]}
   */
  unsubscribe = [];

  /**
   * Indicates this record represents a template variable
   * @type {boolean}
   */
  isTemplateVariable = true;

  /**
   * Indicates this record represents a template chunk (partial HTML)
   * @type {boolean}
   */
  isTemplateChunk = false;

  /**
   * Creates a new Record instance for managing template content
   * @param {string} id - Unique identifier for this record
   * @param {*} content - The content/payload for this record (signals, strings, objects, etc.)
   * @param {string|Object} [intelligence] - Context analysis data or attribute string for processing hints
   * @example
   * // Create a record for a signal
   * const signal = new Signal("hello");
   * const record = new Record("::1", signal, "class=");
   *
   * // Create a record with intelligence object
   * const record2 = new Record("::2", "world", {isElementDomain: true});
   */
  constructor(id, content, intelligence) {
    this.#id = id;
    this.content = content;

    // Parse intelligence parameter for context analysis
    if (typeof intelligence === "string") {
      Object.assign(this, decodeAttribute(intelligence));
    }
    if (typeof intelligence === "object" && intelligence !== null) {
      Object.assign(this, intelligence);
    }
  }

  /**
   * Gets the type name of the content stored in this record
   * @returns {string} The type name (e.g., "string", "Signal", "Array", "Object", etc.)
   * @example
   * const record1 = new Record("id", "hello");
   * console.log(record1.type); // "string"
   *
   * const record2 = new Record("id", new Signal(0));
   * console.log(record2.type); // "Signal"
   *
   * const record3 = new Record("id", [1, 2, 3]);
   * console.log(record3.type); // "Array"
   */
  get type() {
    if (this.content === null) return "null";
    if (this.content === undefined) return "undefined";

    const primitiveType = typeof this.content;

    if (primitiveType !== "object") {
      return primitiveType;
    }

    // Handle built-in objects and user-defined classes
    if (Array.isArray(this.content)) return "Array";

    // Try to get the constructor name
    if (this.content.constructor && this.content.constructor.name) {
      return this.content.constructor.name;
    }

    // Fallback for objects without a constructor
    return Object.prototype.toString.call(this.content).slice(8, -1);
  }

  /**
   * True if content is a Signal instance
   * @returns {boolean}
   * @readonly
   */
  get isSignalType() {
    return this.type === "Signal";
  }

  /**
   * True if content is a plain Object
   * @returns {boolean}
   * @readonly
   */
  get isObjectType() {
    return this.type === "Object";
  }

  /**
   * True if content is a function
   * @returns {boolean}
   * @readonly
   */
  get isFunctionType() {
    return this.type === "function";
  }

  /**
   * True if content is null
   * @returns {boolean}
   * @readonly
   */
  get isNullType() {
    return this.type === "null";
  }

  /**
   * True if content is undefined
   * @returns {boolean}
   * @readonly
   */
  get isUndefinedType() {
    return this.type === "undefined";
  }

  /**
   * True if content is a string
   * @returns {boolean}
   * @readonly
   */
  get isStringType() {
    return this.type === "string";
  }

  /**
   * True if content is a number
   * @returns {boolean}
   * @readonly
   */
  get isNumberType() {
    return this.type === "number";
  }

  /**
   * True if content is an Array
   * @returns {boolean}
   * @readonly
   */
  get isArrayType() {
    return this.type === "Array";
  }

  /**
   * True if content is a DocumentFragment
   * @returns {boolean}
   * @readonly
   */
  get isDocumentFragmentType() {
    return this.type === "DocumentFragment";
  }

  /**
   * True if content is a NodeList
   * @returns {boolean}
   * @readonly
   */
  get isNodeListType() {
    return this.content instanceof NodeList;
  }

  /**
   * True if content is an HTMLCollection
   * @returns {boolean}
   * @readonly
   */
  get isHTMLCollectionType() {
    return this.content instanceof HTMLCollection;
  }

  /**
   * True if content is a DOM Node
   * @returns {boolean}
   * @readonly
   */
  get isNodeType() {
    return this.content instanceof Node;
  }

  /**
   * True if content represents DOM elements (Node, NodeList, HTMLCollection, or DocumentFragment)
   * @returns {boolean}
   * @readonly
   */
  get isElements() {
    return this.isDocumentFragmentType || this.isNodeListType || this.isHTMLCollectionType || this.isNodeType;
  }

  /**
   * True if content is iterable (excluding strings)
   * @returns {boolean}
   * @readonly
   */
  get isContentIterable() {
    return this.content != null && typeof this.content !== "string" && typeof this.content[Symbol.iterator] === "function";
  }

  /**
   * Makes the record iterable, yielding individual items or the content itself
   * @returns {Generator} Iterator that yields content items
   * @example
   * const record = new Record("id", [1, 2, 3]);
   * for (const item of record) {
   *   console.log(item); // 1, 2, 3
   * }
   *
   * const record2 = new Record("id", "hello");
   * for (const item of record2) {
   *   console.log(item); // "hello"
   * }
   */
  *[Symbol.iterator]() {
    if (this.isContentIterable) {
      for (let item of this.content) {
        yield item;
      }
    } else {
      yield this.content;
    }
  }
}

/**
 * Decodes HTML attribute context to determine how to process template variables
 * @private
 * @param {string} htmlStr - HTML string context preceding the template variable
 * @returns {Object} Object with context flags (isAttributeValueAssignment, isAttributeDomain, isElementDomain, etc.)
 * @example
 * // Attribute value assignment
 * decodeAttribute('class="'); // {isAttributeValueAssignment: true, isClassAttribute: true, attributeName: "class"}
 *
 * // Attribute domain
 * decodeAttribute('<div '); // {isAttributeDomain: true}
 *
 * // Element domain
 * decodeAttribute('<div>'); // {isElementDomain: true}
 */
function decodeAttribute(htmlStr) {
  const normalizedCharacterTokens = htmlStr.trim().replace(/['"]$/, "").split(/\s+/).pop();
  const bracketCycle = htmlStr.trim().split(/[^<>]/).filter((token) => token);

  if (normalizedCharacterTokens.endsWith("=")) {

    // Attribute value assignment: attribute="value"
    const attributeName = normalizedCharacterTokens.substr(0, normalizedCharacterTokens.length - 1);
    const capitalizedName = String(attributeName).charAt(0).toUpperCase() + String(attributeName).slice(1);
    const isAttributeValueAssignment = true;

    return {
      attributeName,
      isAttributeValueAssignment,
      ["is" + capitalizedName + "Attribute"]: true,
    };
  } else if (bracketCycle.at(-1) === "<") {
    // Attribute domain: <element attribute
    const isAttributeDomain = true;
    return { isAttributeDomain };
  } else {
    // Element domain: <element>content

    return { isElementDomain: true };
  }
}
