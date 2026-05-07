import { auth, request } from './api.js';

const form = document.getElementById('settings-form');
const feedback = document.getElementById('feedback');

const user = auth.user;
if (user) {
  form.name.value = user.name;
  form.email.value = user.email;
}

function show(text, type = 'error') {
  feedback.className = `notice ${type}`;
  feedback.textContent = text;
}

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(form).entries());

  if (!data.password) delete data.password;

  try {
    await request('/admin/settings/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });

    auth.setSession(auth.token, { ...user, name: data.name, email: data.email });
    show('Profile updated.', 'success');
  } catch (error) {
    show(error.message, 'error');
  }
});
