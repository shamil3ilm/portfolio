import { Component, signal } from '@angular/core';
import { Header } from './components/header/header';
import { Footer } from './components/footer/footer';
import { Hero } from './components/hero/hero';
import { About } from './components/about/about';
// Experience hidden for now — re-enable this import and the imports[] entry below.
// import { Experience } from './components/experience/experience';
import { Services } from './components/services/services';
import { Skills } from './components/skills/skills';
import { Projects } from './components/projects/projects';
import { Testimonials } from './components/testimonials/testimonials';
import { Contact } from './components/contact/contact';

@Component({
  selector: 'app-root',
  imports: [
    Header,
    Footer,
    Hero,
    Services,
    About,
    // Experience,
    Skills,
    Projects,
    Testimonials,
    Contact,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = signal('portfolio');
}
