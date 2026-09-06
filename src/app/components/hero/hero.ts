import { Component } from '@angular/core';
import { RevealDirective } from '../../shared/reveal.directive';

@Component({
  selector: 'app-hero',
  imports: [RevealDirective],
  templateUrl: './hero.html',
  styleUrl: './hero.scss',
})
export class Hero {}
