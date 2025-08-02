#!/usr/bin/env node

import { Signal } from "../Signal.js";
import tokenBasedStrategy from "./token-based.js";


// Test the implementation
console.log('=== Token-Based Strategy Tests ===\n');

// Test 1: Self-closing tag with attributes
console.log('Test 1: Self-Closing Tag');
const src = new Signal("image.jpg");
const alt = new Signal("Image description");
const attrs = new Signal({loading: "lazy", width: "100"});

const context1 = new Map();
const strings1 = ['<img src="', '" alt="', '" ', '/>'];
const values1 = [src, alt, attrs];

const result1 = tokenBasedStrategy(context1, strings1, values1);
console.log('Input: <img src="${src}" alt="${alt}" ${attrs}/>');
console.log('Output:', result1);
console.log('Context entries:', Array.from(context1.entries()).length);
console.log('');

// Test 2: Complex nested structure
console.log('Test 2: Complex Structure');
const className = new Signal("container");
const style = new Signal("color: red");
const dynamicAttrs = new Signal({id: "main", role: "button"});
const content = new Signal("Click me");

const context2 = new Map();
const strings2 = ['<div class="', '" style="', '" ', '>', '</div>'];
const values2 = [className, style, dynamicAttrs, content];

const result2 = tokenBasedStrategy(context2, strings2, values2);
console.log('Input: <div class="${className}" style="${style}" ${dynamicAttrs}>${content}</div>');
console.log('Output:', result2);
console.log('');

// Test 3: Text interpolation only
console.log('Test 3: Text Interpolation');
const title = new Signal("Welcome");
const message = new Signal("Hello World");

const context3 = new Map();
const strings3 = ['<h1>', '</h1><p>', '</p>'];
const values3 = [title, message];

const result3 = tokenBasedStrategy(context3, strings3, values3);
console.log('Input: <h1>${title}</h1><p>${message}</p>');
console.log('Output:', result3);
console.log('');

// Test 4: Mixed attribute types
console.log('Test 4: Mixed Attributes');
const width = new Signal(200);
const customData = new Signal({"data-test": "value", onclick: "alert('hi')"});

const context4 = new Map();
const strings4 = ['<Panel width="', '" ', '>Content</Panel>'];
const values4 = [width, customData];

const result4 = tokenBasedStrategy(context4, strings4, values4);
console.log('Input: <Panel width="${width}" ${customData}>Content</Panel>');
console.log('Output:', result4);
console.log('');

// Test 5: Comments and special cases
console.log('Test 5: Comments');
const comment = new Signal("Debug info");
const value = new Signal("test");

const context5 = new Map();
const strings5 = ['<!-- ', ' --><div>', '</div>'];
const values5 = [comment, value];

const result5 = tokenBasedStrategy(context5, strings5, values5);
console.log('Input: <!-- ${comment} --><div>${value}</div>');
console.log('Output:', result5);
console.log('');

console.log('=== Token-Based Strategy Benefits ===');
console.log('✅ Accurate context detection through full parsing');
console.log('✅ Handles complex attribute scenarios');
console.log('✅ Preserves token boundaries');
console.log('✅ Two-phase processing ensures correctness');
console.log('✅ Extensible token types for future features');
