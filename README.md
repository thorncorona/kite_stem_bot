# Clobotics Website

## Getting Started
1. Install Node 8
2. Open terminal in repo
3. `npm install`
4. `gulp` to start dev environment
5. Dev server runs on port 3000 (http://localhost:3000)

## Structure

### CSS
Written in SASS.

`css` - scss/css source files
`css/libs` - lib folder, these are not compiled
`css/fonts` - fonts folder, not compiled
`css/pages` - begin with a `_`, correspond to each page
`partials` - these are pieces that may apply to every page
`fonts.scss` - compiled to a separate css file so they can load at the end
`mixins.scss` - functions as CSS

### DIST

`dist` - all post-process css/img/js is located here

### IMG
`img` - images in this folder are automaticatically shrunk to web-size, with quality unimpacted

### JS 
`js` - js is all minified to a `.min.js` extension, also creates a `.map` extension for easy debugging
`js/libs` - assumes you've minified everything already, just copies to `dist`

### VIEWS
All view code is coded using the Handlebars library and served up via the `express-handlebars` library.
Pages do not auto-compile to HTML  - they must be linked to a URL within the `server.js` file.

`views` - everything here that is a `.hbs` extension is compiled upon run, 
`views/admin` - admin templates with folders/pages, names self-explanatory
`views/layouts` - global layouts which can be applied to any page with a `layout: ${layout}` config to express

App is configured to default to `layout`, so not using the layout parameter is the same as setting `layout` to `main`

Example: 
```javascript
app.get('/', cache(3600 * 24), function (req, res) {
  res.render('index', {
    layout: 'main'
    title: 'Clobotics: Machine Learning for Your Business',
    page: 'index-page'
  });
});

app.get('/', cache(3600 * 24), function (req, res) {
  res.render('index', {
    title: 'Clobotics: Machine Learning for Your Business',
    page: 'index-page'
  });
});
```

`views/partials` - small templates that can be reused provided the `{{  $param   }}` params are filled in

### DB.JSON
This is a sample `db.json` file, written in JSON. Everything in there can be altered via the admin panel, accessible at `/admin/dashboard`.

### GULPFILE.JS
Build script/run script. Only 2 commands relevant:
`gulp` - creates a dev environment with browsersync, runs on port 3000 
**FOR PRODUCTION PLEASE JUST USE THE `node server.js` COMMAND AND ENABLE SSL THROUGH AN APACHE PROXY**
`gulp prod-prep` - preps everything by compiling and minifying everything possible. 

### SERVER.JS
Runs the server.

## Server

Server runs on `express` and `express-handlebars` templating engine. See above mentioned docs for usage guides.

`lowdb` handles database.

