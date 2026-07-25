"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const storage_js_1 = require("./config/storage.js");
async function bootstrap() {
    // Keep local/test boot simple, but pull prod secrets before any env validation runs.
    if (process.env.NODE_ENV === 'production') {
        const { getSsmBootstrapSummary, loadSecretsFromSsm } = await import('./config/ssm.js');
        const summary = getSsmBootstrapSummary();
        console.log(`Loading production secrets from SSM${summary.region ? ` in ${summary.region}` : ''}${summary.prefix ? ` using ${summary.prefix}` : ''}`);
        await loadSecretsFromSsm();
    }
    const app = (await import('./app.js')).default;
    const { env } = await import('./config/env.js');
    (0, storage_js_1.ensureStorageDirectories)();
    app.listen(env.port, () => {
        console.log(`Server running at http://localhost:${env.port}`);
    });
}
bootstrap().catch((error) => {
    console.error('Server bootstrap failed:', error);
    process.exit(1);
});
