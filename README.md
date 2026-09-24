# Qadir Eqbal Portfolio

A static portfolio site with an animated space background, a shuttle duel, and a page-wide gravity simulation. It uses plain HTML, CSS, and JavaScript; there is no build step or package installation.

## Files to edit

- `index.html` contains the portfolio sections, links, résumé path, and contact form fields.
- `style.css` contains the layout, theme colors, typography, responsive rules, and animation styles. The color tokens are at the top of the file.
- `space-bg.js` draws the stars, nebulae, and touch-deflected asteroids.
- `spaceship-game.js` runs the hero shuttle duel, health display, and restart controls.
- `gravity-game.js` runs the gravity simulation outside the hero section.
- `navigation.js` controls the navigation bar while scrolling.
- `contact-form.js` turns the contact form into an email draft.
- `favicon.svg` is the small orbital mark used in the browser tab.
- `QadirEqbal_resume.pdf` is linked from the navigation bar.

## Preview

Open `index.html` in a browser. If the browser restricts local scripts or fonts, serve this folder from a local web server and open its address instead.

## Main interactions

- In the hero shuttle duel, move with WASD or the arrow keys; on touch screens, drag to steer. Lasers fire automatically.
- Outside the hero, press and hold an empty area to create a body. Drag while holding to give it momentum; nearby bodies attract one another.
- The contact form opens a prepared email in the visitor’s mail application.
