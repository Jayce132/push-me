import {Howl} from 'howler';
import punchUrl from './assets/sfx/punch.wav';
import deathUrl from './assets/sfx/death.wav';
import wallHitUrl from './assets/sfx/wall_hit.wav';
import burnUrl from './assets/sfx/burn.wav';
import extinguishUrl from './assets/sfx/extinguish.wav';
import musicUrl from './assets/sfx/music.wav';

export const sounds = {
    punch: new Howl({src: [punchUrl], html5: true, volume: 0.5}),
    death: new Howl({src: [deathUrl], html5: true, volume: 0.5}),
    wallHit: new Howl({src: [wallHitUrl], html5: true, volume: 0.5}),
    burn: new Howl({src: [burnUrl], html5: true, volume: 0.5}),
    extinguish: new Howl({src: [extinguishUrl], html5: true, volume: 0.5}),
    music: new Howl({src: [musicUrl], loop: true, volume: 1}),
};
