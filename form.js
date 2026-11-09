// Before/after slider and preview request form, shared by all pages.

document.querySelectorAll('.screen').forEach(screen => {
  const range = screen.querySelector('input[type=range]');
  if (range) range.addEventListener('input', () => screen.style.setProperty('--split', range.value + '%'));
});

// TODO: connect to a form service (e.g. Formspree) once the email address is set up.
document.querySelectorAll('form.preview-form').forEach(form => {
  const status = form.querySelector('.form-status');
  form.addEventListener('submit', e => {
    e.preventDefault();
    const invalid = [...form.querySelectorAll('[required]')].find(el => !el.checkValidity());
    if (invalid) {
      status.className = 'form-status err';
      status.textContent = invalid.type === 'checkbox'
        ? 'Vink het vakje aan, zodat ik je de preview mag mailen.'
        : invalid.type === 'email'
          ? 'Vul een geldig e-mailadres in, bijvoorbeeld naam@jouwzaak.nl.'
          : 'Vul alle verplichte velden in.';
      invalid.focus();
      return;
    }
    status.className = 'form-status ok';
    status.textContent = 'Bedankt! Je aanvraag is binnen. Binnen een paar werkdagen krijg je de preview in je mailbox.';
    form.reset();
  });
});
