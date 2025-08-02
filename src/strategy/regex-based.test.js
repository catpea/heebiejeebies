#!/usr/bin/env node

import { Signal } from "../Signal.js";
import regexBasedStrategy from "./regex-based.js";

// Test the implementation
console.log('=== Regex-Based Context Detection Tests ===\n');

// Test 1: Basic attribute and text interpolation
console.log('Test 1: Basic Patterns');
const width = new Signal(200);
const dynamicAttr = new Signal({id: "panel", role: "button"});
const text = new Signal("Content here");

const context1 = new Map();
const strings1 = ['<Panel width="', '" ', '>Content ', '</Panel>'];
const values1 = [width, dynamicAttr, text];

const result1 = regexBasedStrategy(context1, strings1, values1);
console.log('Input: <Panel width="${width}" ${dynamicAttr}>Content ${text}</Panel>');
console.log('Output:', result1);
console.log('Context entries:', Array.from(context1.entries()).length);
console.log('');

// Test 2: Complex attribute scenarios
console.log('Test 2: Complex Attributes');
const className = new Signal("my-class");
const style = new Signal("color: red; background: blue");
const dataAttr = new Signal({"data-test": "value"});
const content = new Signal("Hello World");

const context2 = new Map();
const strings2 = ['<div class="', '" style="', '" ', '>', '</div>'];
const values2 = [className, style, dataAttr, content];

const result2 = regexBasedStrategy(context2, strings2, values2);
console.log('Input: <div class="${className}" style="${style}" ${dataAttr}>${content}</div>');
console.log('Output:', result2);
console.log('Expected contexts: ATTR_VALUE, ATTR_VALUE, ATTR_NAME, TEXT');
console.log('');

// Test 3: Edge cases and malformed HTML
console.log('Test 3: Edge Cases');
const edgeValue1 = new Signal("test");
const edgeValue2 = new Signal("more");

const context3 = new Map();
const strings3 = ['<div ', ' class="broken', '>', '</div>'];
const values3 = [edgeValue1, edgeValue2];

const result3 = regexBasedStrategy(context3, strings3, values3);
console.log('Input: <div ${edgeValue1} class="broken${edgeValue2}></div>');
console.log('Output:', result3);
console.log('Note: Defensive handling should prevent errors');
console.log('');

// Test 4: Nested quotes and escapes
console.log('Test 4: Quote Handling');
const quotedValue = new Signal("Say \"hello\"");
const attrValue = new Signal({onclick: "alert('test')"});

const context4 = new Map();
const strings4 = ['<div title="', '" ', '>', '</div>'];
const values4 = [quotedValue, attrValue];

const result4 = regexBasedStrategy(context4, strings4, values4);
console.log('Input: <div title="${quotedValue}" ${attrValue}></div>');
console.log('Output:', result4);
console.log('');

// Test 5: Self-closing tags
console.log('Test 5: Self-Closing Tags');
const src = new Signal("image.jpg");
const alt = new Signal("description");
const imgAttrs = new Signal({loading: "lazy", width: "100"});

const context5 = new Map();
const strings5 = ['<img src="', '" alt="', '" ', '/>'];
const values5 = [src, alt, imgAttrs];

const result5 = regexBasedStrategy(context5, strings5, values5);
console.log('Input: <img src="${src}" alt="${alt}" ${imgAttrs}/>');
console.log('Output:', result5);
console.log('');

// Performance comparison indicator
console.log('=== Performance Notes ===');
console.log('Regex-based parsing is generally faster than state machines');
console.log('Trade-off: Speed vs. accuracy for complex edge cases');
console.log('Best for: Templates with predictable, well-formed structure');
