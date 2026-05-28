window.__SUPABASE_URL__ = 'https://ilbneblzkvzebuklyzgn.supabase.co';
window.__SUPABASE_ANON_KEY__ = 'sb_publishable_UIrAwPGGHGwPavXFV23FwQ_Z1ywfnAg';

// Optional: default admin email used when someone types "admin" on the login form.
// Set this to the exact email in Supabase Auth for the admin account.
window.__ADMIN_DEFAULT_EMAIL__ = 'jethroadmin@gmail.com';

window.__checkSupabaseConnection__ = async function timeoutCheck(timeoutMs = 4000) {
	const url = window.__SUPABASE_URL__;
	const key = window.__SUPABASE_ANON_KEY__;
	if (!url || !key) return { ok: false, reason: 'missing_config' };

	const headers = {
		apikey: key,
		Authorization: `Bearer ${key}`,
		'Content-Type': 'application/json',
	};

	const controller = new AbortController();
	const id = setTimeout(() => controller.abort(), timeoutMs);

	try {
		const resp = await fetch(`${url}/rest/v1/admins?select=id&limit=1`, { headers, signal: controller.signal });
		clearTimeout(id);
		if (!resp.ok) return { ok: false, status: resp.status, reason: 'rest_error' };
		return { ok: true, status: resp.status };
	} catch (err) {
		clearTimeout(id);
		return { ok: false, reason: err.name === 'AbortError' ? 'timeout' : 'network_error', message: err.message };
	}
};

// Optional: set this to your Supabase Edge Function URL that performs secure admin login.
// Example: window.__ADMIN_LOGIN_FN__ = 'https://<project>.functions.supabase.co/admin-login';
// Edge Function URL for secure admin login (replace <project> with your Supabase project id)
// Leave empty to use direct Supabase client auth flow. Set this to your Edge Function URL
// only if you have deployed the function and want server-side verification.
window.__ADMIN_LOGIN_FN__ = '';
