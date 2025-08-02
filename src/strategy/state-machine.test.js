#!/usr/bin/env node

import { Signal } from "../Signal.js";
import stateMachineStrategy from "./state-machine.js";


// Test the implementation
const signal1 = new Signal("my-class");
const signal2 = new Signal({id: "test", "data-value": "123"});
const signal3 = new Signal("Hello World");

const context = new Map();
const strings = ['<div class="', '" ', '>', '</div>'];
const values = [signal1, signal2, signal3];

const result = stateMachineStrategy(context, strings, values);

console.log('Result:', result);
console.log('Context:', Array.from(context.entries()));

// Expected output:
// Result: <div class="::0" ::1="">::2<!--</div>
// Context: [[0, Signal], [1, Signal], [2, Signal]]

// More comprehensive test
console.log('\n--- Comprehensive Test ---');
const context2 = new Map();
const strings2 = ['<Panel width="', '" height="', '" ', ' class="', '">', '</Panel>'];
const values2 = [
  new Signal(200),
  new Signal(150),
  new Signal({id: "panel"}),
  new Signal("container"),
  new Signal("Content here")
];

const result2 = stateMachineStrategy(context2, strings2, values2);
console.log('Complex Result:', result2);
console.log('Complex Context:', Array.from(context2.entries()));

// Test with nested quotes
console.log('\n--- Quote Test ---');
const context3 = new Map();
const strings3 = ['<div title="Say \\"', '\\"" ', '>', '</div>'];
const values3 = [new Signal("hello"), new Signal({onclick: "test()"}), new Signal("text")];

const result3 = stateMachineStrategy(context3, strings3, values3);
console.log('Quote Result:', result3);
console.log('Quote Context:', Array.from(context3.entries()));
