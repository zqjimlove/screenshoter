"use strict";
var client_1 = require("./client");
try {
    var client = new client_1["default"]();
}
catch (e) {
    console.error(e.message);
    phantom.exit();
}
