"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsePositiveInt = parsePositiveInt;
function parsePositiveInt(value) {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}
