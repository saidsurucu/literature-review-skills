const { JSDOM } = require("jsdom");
const dom = new JSDOM("");
global.DOMParser = dom.window.DOMParser;
