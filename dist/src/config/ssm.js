"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadSecretsFromSsm = loadSecretsFromSsm;
exports.getSsmBootstrapSummary = getSsmBootstrapSummary;
const client_ssm_1 = require("@aws-sdk/client-ssm");
function requireRuntimeSetting(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required runtime setting: ${name}`);
    }
    return value;
}
function normalizePrefix(prefix) {
    const trimmed = prefix.trim().replace(/\/+$/, '');
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}
async function loadParameter(client, name) {
    // Fetch one required secret at a time so failures point to the exact parameter.
    const response = await client.send(new client_ssm_1.GetParameterCommand({
        Name: name,
        WithDecryption: true,
    }));
    const value = response.Parameter?.Value;
    if (!value) {
        throw new Error(`SSM parameter returned no value: ${name}`);
    }
    return value;
}
async function loadSecretsFromSsm() {
    const region = process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? null;
    const prefix = process.env.SSM_PARAMETER_PREFIX ?? process.env.SSM_PARAMETER_PATH;
    if (!region) {
        throw new Error('Missing required runtime setting: AWS_REGION');
    }
    if (!prefix) {
        throw new Error('Missing required runtime setting: SSM_PARAMETER_PREFIX');
    }
    const normalizedPrefix = normalizePrefix(prefix);
    const client = new client_ssm_1.SSMClient({ region });
    // Only bootstrap the secrets the app cannot start without.
    const [databaseUrl, encryptionKey] = await Promise.all([
        loadParameter(client, `${normalizedPrefix}/DATABASE_URL`),
        loadParameter(client, `${normalizedPrefix}/ENCRYPTION_KEY`),
    ]);
    process.env.DATABASE_URL = databaseUrl;
    process.env.ENCRYPTION_KEY = encryptionKey;
    return {
        prefix: normalizedPrefix,
    };
}
function getSsmBootstrapSummary() {
    return {
        region: process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? null,
        prefix: process.env.SSM_PARAMETER_PREFIX ?? process.env.SSM_PARAMETER_PATH ?? null,
    };
}
