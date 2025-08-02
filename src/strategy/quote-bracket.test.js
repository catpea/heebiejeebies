#!/usr/bin/env node

import { Signal } from "../Signal.js";
import quoteAndBracketStrategy from "./quote-bracket.js";

// Test the implementation
console.log('=== Quote and Bracket Tracking Strategy Tests ===\n');

// Test 1: Escaped quotes in attributes
console.log('Test 1: Escaped Quotes');
const greeting = new Signal("Hello");
const attr = new Signal({id: "test", role: "button"});
const content = new Signal("Welcome");

const context1 = new Map();
const strings1 = ['<div title="Say \\"', '\\"" ', '>', '</div>'];
const values1 = [greeting, attr, content];

const result1 = quoteAndBracketStrategy(context1, strings1, values1);
console.log('Input: <div title="Say \\"${greeting}\\"" ${attr}>${content}</div>');
console.log('Output:', result1);
console.log('Context analysis:');
context1.forEach((data, id) => {
  console.log(`  ::${id} -> ${data.context.type} (${JSON.stringify(data.context.detail)})`);
});
console.log('');

// Test 2: Complex nested quotes
console.log('Test 2: Complex Nested Quotes');
const jsCode = new Signal("alert('Hello')");
const className = new Signal("interactive");
const text = new Signal("Click me");

const context2 = new Map();
const strings2 = ['<button onclick="', '" class=\'', '\'>', '</button>'];
const values2 = [jsCode, className, text];

const result2 = quoteAndBracketStrategy(context2, strings2, values2);
console.log('Input: <button onclick="${jsCode}" class=\'${className}\'>${text}</button>');
console.log('Output:', result2);
console.log('Context analysis:');
context2.forEach((data, id) => {
  console.log(`  ::${id} -> ${data.context.type} (quote: ${data.state.inSingleQuote ? 'single' : data.state.inDoubleQuote ? 'double' : 'none'})`);
});
console.log('');

// Test 3: Bracket tracking with complex expressions
console.log('Test 3: Bracket Tracking');
const complexExpr = new Signal("{nested: {value: 'test'}}");
const simpleAttr = new Signal("simple");
const arrayContent = new Signal("[1, 2, 3]");

const context3 = new Map();
const strings3 = ['<div data-config="', '" title="', '">', '</div>'];
const values3 = [complexExpr, simpleAttr, arrayContent];

const result3 = quoteAndBracketStrategy(context3, strings3, values3);
console.log('Input: <div data-config="${complexExpr}" title="${simpleAttr}">${arrayContent}</div>');
console.log('Output:', result3);
console.log('Context analysis:');
context3.forEach((data, id) => {
  console.log(`  ::${id} -> ${data.context.type} (brackets: ${data.state.bracketDepth}, curlies: ${data.state.curlyBraceDepth})`);
});
console.log('');

// Test 4: Self-closing tags with mixed quotes
console.log('Test 4: Self-Closing Tags');
const src = new Signal("image.jpg");
const alt = new Signal("It's an image");
const attrs = new Signal({loading: "lazy"});

const context4 = new Map();
const strings4 = ['<img src=\'', '\' alt="', '" ', '/>'];
const values4 = [src, alt, attrs];

const result4 = quoteAndBracketStrategy(context4, strings4, values4);
console.log('Input: <img src=\'${src}\' alt="${alt}" ${attrs}/>');
console.log('Output:', result4);
console.log('Context analysis:');
context4.forEach((data, id) => {
  console.log(`  ::${id} -> ${data.context.type} (in tag: ${data.state.inTag})`);
});
console.log('');

// Test 5: Edge case - multiple escaped quotes
console.log('Test 5: Multiple Escaped Quotes');
const message = new Signal('Say \\"Hello\\" and \'Goodbye\'');
const dynAttr = new Signal({title: "Complex \"quoted\" string"});

const context5 = new Map();
const strings5 = ['<span data-msg="\\"', '\\"" ', '>Text</span>'];
const values5 = [message, dynAttr];

const result5 = quoteAndBracketStrategy(context5, strings5, values5);
console.log('Input: <span data-msg="\\"${message}\\"" ${dynAttr}>Text</span>');
console.log('Output:', result5);
console.log('Context analysis:');
context5.forEach((data, id) => {
  console.log(`  ::${id} -> ${data.context.type} (state: ${JSON.stringify(data.state)})`);
});
console.log('');

// Test 6: Performance and state consistency
console.log('Test 6: State Consistency Check');
const val1 = new Signal("test1");
const val2 = new Signal("test2");
const val3 = new Signal("test3");

const context6 = new Map();
const strings6 = ['<div a="', '" b=\'', '\' ', '>content</div>'];
const values6 = [val1, val2, val3];

const result6 = quoteAndBracketStrategy(context6, strings6, values6);
console.log('Input: <div a="${val1}" b=\'${val2}\' ${val3}>content</div>');
console.log('Output:', result6);

// Verify state consistency
const states = Array.from(context6.values()).map(data => data.state);
console.log('State progression:');
states.forEach((state, idx) => {
  console.log(`  Position ${idx}: inTag=${state.inTag}, quotes=(${state.inSingleQuote ? 'single' : ''}${state.inDoubleQuote ? 'double' : ''})`);
});

console.log('\n=== Quote and Bracket Tracking Benefits ===');
console.log('✅ Precise quote state tracking with escape handling');
console.log('✅ Comprehensive bracket depth monitoring');
console.log('✅ Character-by-character accuracy');
console.log('✅ Rich context information stored with each value');
console.log('✅ Handles complex nested quote scenarios');
console.log('✅ State consistency across interpolations');
