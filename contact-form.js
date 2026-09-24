(() => {
  const form = document.getElementById('contact-form');
  if (!form) return;

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const formData = new FormData(form);
    const name = String(formData.get('name')).trim();
    const email = String(formData.get('email')).trim();
    const message = String(formData.get('message')).trim();
    const subject = `Portfolio collaboration inquiry from ${name}`;
    const body = `Hi Qadir,\n\n${message}\n\n— ${name}${email ? `\nReply to: ${email}` : ''}`;
    const mailto = `mailto:qadiriqbal74@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    window.location.href = mailto;
  });
})();
