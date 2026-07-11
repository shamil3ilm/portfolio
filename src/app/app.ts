import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from './components/header/header';
import { Footer } from './components/footer/footer';
import { Hero } from './components/hero/hero';
import { About } from './components/about/about';
// Experience hidden for now — re-enable this import and the imports[] entry below.
// import { Experience } from './components/experience/experience';
import { Skills } from './components/skills/skills';
import { Projects } from './components/projects/projects';
import { Contact } from './components/contact/contact';
import { MouseFollowerComponent } from './components/mouse-follower/mouse-follower.component';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    MouseFollowerComponent,
    Header,
    Footer,
    Hero,
    About,
    // Experience,
    Skills,
    Projects,
    Contact,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = signal('portfolio');
}
