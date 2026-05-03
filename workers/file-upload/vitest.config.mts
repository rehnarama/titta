import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
	test: {
		poolOptions: {
			workers: {
				wrangler: { configPath: './wrangler.jsonc' },
				miniflare: {
					bindings: {
						R2_ACCESS_KEY_ID: 'test-access-key',
						R2_SECRET_ACCESS_KEY: 'test-secret-key',
						ACCOUNT_ID: 'test-account-id',
					},
				},
			},
		},
	},
});
