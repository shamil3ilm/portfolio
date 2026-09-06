import { Component } from '@angular/core';
import { RevealDirective } from '../../shared/reveal.directive';

@Component({
  selector: 'app-footer',
  imports: [RevealDirective],
  templateUrl: './footer.html',
  styleUrl: './footer.scss',
})
export class Footer {
  readonly year = new Date().getFullYear();
  readonly email = 'mhmdshamil03@gmail.com';
}
