"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getParamAsString = getParamAsString;
function getParamAsString(param) {
    if (!param)
        return null;
    return Array.isArray(param) ? param[0] : param;
}
