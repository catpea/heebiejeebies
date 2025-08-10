// Lightweight XML/HTML Parser - Modern JavaScript
// Supports nested nodes, multiple attributes with same name, and void tags

import {Revision} from './Revision.js';
import {query} from './query.js';



class BaseNode {

  remove(){
    // insert nodes in this.parent after this one
    const myIndex = this.parent.children.indexOf(this);
    this.parent.children.splice(myIndex, 1);
  }

  after(...nodes){
    // insert nodes in this.parent after this one
    const myIndex = this.parent.children.indexOf(this);
    this.parent.children.splice(myIndex, 0, ...nodes);
  }

}

class TextNode extends BaseNode {
  constructor(content) {
    super()
    this.content = content;
    this.parent = null;
  }

}

class CommentNode extends BaseNode {
  constructor(content) {
    super()
    this.content = content;
    this.parent = null;
  }

}

const NODE_TYPES = [ TextNode, CommentNode ];

class ParseNode  extends BaseNode {

  constructor(name, attributes = [], children = [], isVoid = false) {
    super();

    this.rev = new Revision(1);

    this.name = name;
    this.attributes = attributes; // Array of {name, value} objects to support duplicates
    this.children = children;
    this.isVoid = isVoid;
    this.parent = null;
  }



  // Get first attribute value by name
  attr(name) {
    const attr = this.attributes.find(a => a.name === name);
    return attr ? attr.value : null;
  }

  // Get all attribute values by name
  attrs(name) {
    return this.attributes.filter(a => a.name === name).map(a => a.value);
  }

  // Walk tree with callback
  walk(callback) {
    callback(this);
    for (const child of this.children) {
      if (child.walk){
       child.walk(callback);
      }
    }
  }

  seek(callback) {
    callback(this);
    for (const child of this.children) {
      if (child.seek){
       child.seek(callback);
      }else{
        callback(child);
      }
    }
  }



  // Find first node by name
  find(name) {
    if (this.name === name) return this;
    for (const child of this.children) {
      if (child.find) {
        const found = child.find(name);
        if (found) return found;
      }
    }
    return null;
  }

  // Find all nodes by name
  findAll(name) {
    const results = [];
    this.walk(node => {
      if (node.name === name) results.push(node);
    });
    return results;
  }

  findType(type, fn) {
    const results = [];
    this.seek(node => {

      // if ((node instanceof NODE_TYPES[type])) results.push(node);
      if ((node instanceof NODE_TYPES[type])&&(fn?fn(node):1)) results.push(node);
    });
    return results;
  }

  // Find by attribute
  findByAttr(attrName, attrValue = null) {
    const results = [];
    this.walk(node => {
      const hasAttr = attrValue === null
        ? node.attributes.some(a => a.name === attrName)
        : node.attributes.some(a => a.name === attrName && a.value === attrValue);
      if (hasAttr) results.push(node);
    });
    return results;
  }

  query(path){
    return query(this, '$.' + path);
  }

  empty() {
     // Recursively empty all children first
     for (const child of this.children) {
       if (child.empty) {
         child.empty();
       }
       // Break parent reference
       child.parent = null;
     }

     // Clear all references
     this.children.length = 0;
     this.attributes.length = 0;
     this.parent = null;
     this.name = null;
   }

  // Convert back to XML string
  toXML(indent = 0, indentSize = 2) {
    const spaces = ' '.repeat(indent);

    // Root node - just render children
    if (this.name === 'root') {
      return this.children.map(child => {
        if (child.toXML) return child.toXML(indent, indentSize);
        if (child.content !== undefined) return child.content; // TextNode
        return '';
      }).join('');
    }

    // Build opening tag
    let xml = `${spaces}<${this.name}`;

    // Add attributes
    for (const attr of this.attributes.filter(o=>o)) {
      const v = attr.value.value||'';
      const value = String(v).includes('"') ? `'${v}'` : `"${v}"`;
      xml += ` ${attr.name}=${value}`;
    }

    // Handle void/self-closing tags
    if (this.isVoid || this.children.length === 0) {
      xml += this.isVoid ? '>' : '/>';
      return xml + '\n';
    }

    xml += '>';

    // Check if we have only text content (inline)
    const hasOnlyText = this.children.length === 1 &&
                       this.children[0].content !== undefined;

    if (hasOnlyText) {
      xml += this.children[0].content;
      xml += `</${this.name}>`;
      return xml + '\n';
    }

    // Multi-line with children
    xml += '\n';

    // Add children
    for (const child of this.children) {
      if (child.toXML) {
        xml += child.toXML(indent + indentSize, indentSize);
      } else if (child.content !== undefined) {
        // TextNode - trim and add if not empty
        const content = child.content.trim();
        if (content) {
          xml += `${' '.repeat(indent + indentSize)}${content}\n`;
        }
      }
    }

    // Closing tag
    xml += `${spaces}</${this.name}>\n`;
    return xml;
  }

}


class XMLParser {
  constructor() {
    // HTML void elements that don't have closing tags
    this.voidTags = new Set([
      'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
      'link', 'meta', 'param', 'source', 'track', 'wbr'
    ]);
  }

  parse(xml) {
    this.xml = xml.trim();
    this.pos = 0;
    this.length = this.xml.length;

    const root = new ParseNode('root');
    this.parseChildren(root);

    // Set parent references
    this.setParents(root);

    return root;
  }

  setParents(node) {
    for (const child of node.children) {
      child.parent = node;
      if (child.children) this.setParents(child);
    }
  }

  parseChildren(parent) {
    while (this.pos < this.length) {
      this.skipWhitespace();
      if (this.pos >= this.length) break;

      if (this.peek() === '<') {
        if (this.peek(1) === '!') {
          if (this.peek(2) === '-' && this.peek(3) === '-') {
            // Comment
            const comment = this.parseComment();
            if (comment) parent.children.push(comment);
          } else {
            // Skip other declarations (DOCTYPE, etc.)
            this.skipUntil('>');
            this.advance();
          }
        } else if (this.peek(1) === '/') {
          // Closing tag - return to parent
          break;
        } else {
          // Opening tag
          const element = this.parseElement();
          if (element) parent.children.push(element);
        }
      } else {
        // Text content
        const text = this.parseText();
        if (text) parent.children.push(text);
      }
    }
  }

  parseElement() {
    if (this.peek() !== '<') return null;

    this.advance(); // Skip '<'

    // Parse tag name
    const name = this.parseIdentifier();
    if (!name) return null;

    // Parse attributes
    const attributes = this.parseAttributes();

    this.skipWhitespace();

    const isVoid = this.voidTags.has(name.toLowerCase());
    let selfClosing = false;

    // Check for self-closing or closing
    if (this.peek() === '/') {
      this.advance();
      selfClosing = true;
    }

    if (this.peek() !== '>') {
      this.dump();
      throw new Error(`Expected '>' at position ${this.pos}`);
    }
    this.advance(); // Skip '>'

    const element = new ParseNode(name, attributes, [], isVoid || selfClosing);

    // Parse children if not void/self-closing
    if (!isVoid && !selfClosing) {
      this.parseChildren(element);

      // Parse closing tag
      this.skipWhitespace();
      if (this.peek() === '<' && this.peek(1) === '/') {
        this.advance(2); // Skip '</'
        const closingName = this.parseIdentifier();
        if (closingName !== name) {
          throw new Error(`Mismatched closing tag: expected ${name}, got ${closingName}`);
        }
        this.skipWhitespace();
        if (this.peek() !== '>') {
          throw new Error(`Expected '>' in closing tag at position ${this.pos}`);
        }
        this.advance(); // Skip '>'
      }
    }

    return element;
  }

  parseAttributes() {
    const attributes = [];

    while (this.pos < this.length) {
      this.skipWhitespace();
      if (this.peek() === '>' || this.peek() === '/') break;

      const name = this.parseIdentifier();
      if (!name) break;

      this.skipWhitespace();
      let value = '';

      if (this.peek() === '=') {
        this.advance(); // Skip '='
        this.skipWhitespace();
        value = this.parseAttributeValue();
      }

      attributes.push({ name, value });
    }

    return attributes;
  }

  parseAttributeValue() {
    const quote = this.peek();
    if (quote === '"' || quote === "'") {
      this.advance(); // Skip opening quote
      let value = '';
      while (this.pos < this.length && this.peek() !== quote) {
        value += this.peek();
        this.advance();
      }
      if (this.peek() === quote) {
        this.advance(); // Skip closing quote
      }
      return value;
    } else {
      // Unquoted value
      let value = '';
      while (this.pos < this.length && !/[\s>\/]/.test(this.peek())) {
        value += this.peek();
        this.advance();
      }
      return value;
    }
  }

  parseComment() {
    if (this.peek(0) !== '<' || this.peek(1) !== '!' ||
        this.peek(2) !== '-' || this.peek(3) !== '-') {
      return null;
    }

    this.advance(4); // Skip '<!--'
    let content = '';

    while (this.pos < this.length - 2) {
      if (this.peek() === '-' && this.peek(1) === '-' && this.peek(2) === '>') {
        this.advance(3); // Skip '-->'
        return new CommentNode(content);
      }
      content += this.peek();
      this.advance();
    }

    throw new Error('Unterminated comment');
  }

  parseText() {
    let text = '';
    while (this.pos < this.length && this.peek() !== '<') {
      text += this.peek();
      this.advance();
    }

    return text.trim() ? new TextNode(text) : null;
  }

  parseIdentifier() {
    let name = '';
    // Allow letters, numbers, hyphens, underscores, colons, and dots
    while (this.pos < this.length && /[a-zA-Z0-9\-_:.@]/.test(this.peek())) {
      name += this.peek();
      this.advance();
    }
    return name;
  }

  dump() {
    console.log('-'.repeat(32));
    console.log(`XML DUMP`);
    console.log(this.xml);
    console.log('-'.repeat(32));
    console.log(`View of buffer starting at [${this.pos}]`);
    console.log(this.xml.substr(this.pos));
    console.log('-'.repeat(32));
  }

  peek(offset = 0) {
    return this.xml[this.pos + offset] || '';
  }

  advance(count = 1) {
    this.pos += count;
  }

  skipWhitespace() {
    while (this.pos < this.length && /\s/.test(this.peek())) {
      this.advance();
    }
  }

  skipUntil(char) {
    while (this.pos < this.length && this.peek() !== char) {
      this.advance();
    }
  }
}

export function generateId() {
  const randomChars = (length = 8) => Array.from({ length }, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join("");
  return `${randomChars()}-${randomChars(4)}-${randomChars(4)}-${randomChars(4)}-${randomChars(12)}`;
}

export { XMLParser, ParseNode, TextNode, CommentNode };
