"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSessionToken = generateSessionToken;
exports.hashSessionToken = hashSessionToken;
const crypto_1 = __importDefault(require("crypto"));
function generateSessionToken() {
    return crypto_1.default.randomBytes(48).toString('hex');
}
function hashSessionToken(token) {
    return crypto_1.default.createHash('sha256').update(token).digest('hex');
}
