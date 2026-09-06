import { Component } from '@angular/core';
import { RevealDirective } from '../../shared/reveal.directive';

@Component({
  selector: 'app-about',
  imports: [RevealDirective],
  templateUrl: './about.html',
  styleUrl: './about.scss',
})
export class About {
  // Set to true once you drop a `photo.jpg` (or `.webp`) into `public/`.
  // Placeholder shows a monogrammed gradient tile until then.
  readonly hasPhoto = false;
  readonly photoSrc = 'photo.jpg';
  readonly photoAlt = 'Portrait of Mohamed Shamil';
  readonly initials = 'MS';
  readonly name = 'Mohamed Shamil';
  readonly roleTag = 'Full-stack engineer · Kerala, IN';
}
