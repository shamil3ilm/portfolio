import { Component, signal } from '@angular/core';
import { RevealDirective } from '../../shared/reveal.directive';

type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error';

@Component({
  selector: 'app-contact',
  imports: [RevealDirective],
  templateUrl: './contact.html',
  styleUrl: './contact.scss',
})
export class Contact {
  readonly email = 'mhmdshamil03@gmail.com';

  // === CONTACT FORM CONFIGURATION ===
  // The form falls back to `mailto:` while both fields below are empty.
  // To wire a real submit (no email client required for the visitor):
  //
  //   Option A — Web3Forms (recommended, free, no signup for basic use):
  //     https://web3forms.com → paste your Access Key into `formAccessKey`
  //
  //   Option B — Formspree:
  //     https://formspree.io → paste your form URL into `formEndpoint`
  readonly formAccessKey = '';
  readonly formEndpoint = '';

  readonly status = signal<SubmitStatus>('idle');
  readonly errorMessage = signal<string>('');

  async onSubmit(event: Event, name: string, senderEmail: string, message: string): Promise<void> {
    event.preventDefault();

    const trimmedName = name.trim();
    const trimmedEmail = senderEmail.trim();
    const trimmedMessage = message.trim();

    if (!trimmedName || !trimmedEmail || !trimmedMessage) {
      this.status.set('error');
      this.errorMessage.set('Please fill in every field before sending.');
      return;
    }

    if (!this.formAccessKey && !this.formEndpoint) {
      this.openMailto(trimmedName, trimmedEmail, trimmedMessage);
      return;
    }

    this.status.set('submitting');
    this.errorMessage.set('');

    try {
      const response = await this.postForm(trimmedName, trimmedEmail, trimmedMessage);
      if (response.ok) {
        this.status.set('success');
        (event.target as HTMLFormElement).reset();
        return;
      }
      this.status.set('error');
      this.errorMessage.set(
        "Couldn't send just now. Please email me directly at " + this.email + '.',
      );
    } catch {
      this.status.set('error');
      this.errorMessage.set(
        'Network error. Please email me directly at ' + this.email + '.',
      );
    }
  }

  private postForm(name: string, senderEmail: string, message: string): Promise<Response> {
    if (this.formAccessKey) {
      return fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: this.formAccessKey,
          name,
          email: senderEmail,
          message,
          subject: `Portfolio enquiry from ${name}`,
          from_name: 'Portfolio contact form',
        }),
      });
    }

    return fetch(this.formEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ name, email: senderEmail, message }),
    });
  }

  private openMailto(name: string, senderEmail: string, message: string): void {
    const subject = encodeURIComponent(`Portfolio enquiry from ${name}`);
    const body = encodeURIComponent(`Name: ${name}\nEmail: ${senderEmail}\n\n${message}`);
    window.location.href = `mailto:${this.email}?subject=${subject}&body=${body}`;
  }
}
