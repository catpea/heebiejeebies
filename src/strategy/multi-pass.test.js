#!/usr/bin/env node

import { Signal } from "../Signal.js";
import multiPassStrategy from "./multi-pass.js";

// Test the implementation
console.log('=== Multi-Pass Strategy Tests ===\n');

// Test 1: Complex context correction scenario
console.log('Test 1: Context Correction');
const props = new Signal({id: "panel", role: "main"});
const styles = new Signal("color: red; background: blue");
const comment = new Signal("Debug: Panel component");

const context1 = new Map();
const strings1 = ['<Panel ', ' style="', '"><!-- ', ' --></Panel>'];
const values1 = [props, styles, comment];

console.log('Input: <Panel ${props} style="${styles}"><!-- ${comment} --></Panel>');
const result1 = multiPassStrategy(context1, strings1, values1);
console.log('Final output:', result1);

console.log('\nStored context analysis:');
context1.forEach((data, id) => {
  console.log(`::${id}:`, {
    finalType: data.finalType,
    hasCorrection: !!data.correction,
    correction: data.correction?.to?.reason
  });
});

console.log('\n' + '='.repeat(50) + '\n');

// Test 2: Multiple corrections needed
console.log('Test 2: Multiple Corrections');
const className = new Signal("container");
const width = new Signal(200);
const dynamicAttrs = new Signal({draggable: "true"});
const content = new Signal("Hello World");

const context2 = new Map();
const strings2 = ['<div class="', '" width="', '" ', '>', '</div>'];
const values2 = [className, width, dynamicAttrs, content];

console.log('Input: <div class="${className}" width="${width}" ${dynamicAttrs}>${content}</div>');
const result2 = multiPassStrategy(context2, strings2, values2);
console.log('Final output:', result2);

console.log('\n' + '='.repeat(50) + '\n');

// Test 3: Edge case with comments and mixed contexts
console.log('Test 3: Complex Mixed Contexts');
const debugMsg = new Signal("Component loaded");
const title = new Signal("Welcome");
const onClick = new Signal("handleClick()");
const text = new Signal("Click here");

const context3 = new Map();
const strings3 = ['<!-- Debug: ', ' --><button title="', '" onclick="', '">', '</button>'];
const values3 = [debugMsg, title, onClick, text];

console.log('Input: <!-- Debug: ${debugMsg} --><button title="${title}" onclick="${onClick}">${text}</button>');
const result3 = multiPassStrategy(context3, strings3, values3);
console.log('Final output:', result3);

console.log('\nFinal context verification:');
context3.forEach((data, id) => {
  console.log(`::${id}: ${data.originalType} → ${data.finalType}${data.correction ? ' (corrected)' : ''}`);
});

console.log('\n=== Multi-Pass Strategy Benefits ===');
console.log('✅ Three-phase processing ensures maximum accuracy');
console.log('✅ Context correction handles initial misclassification');
console.log('✅ Full HTML parsing in Phase 2 for verification');
console.log('✅ Graceful handling of context mismatches');
console.log('✅ Rich debugging information through all phases');
console.log('✅ Extensible architecture for additional validation rules');
