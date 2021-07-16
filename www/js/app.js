// Dom7
let $$ = Dom7;

// Framework7 App main instance
let app = new Framework7({
  root: '#app', // App root element
  id: 'io.framework7.testapp', // App bundle ID
  name: 'Framework7', // App name
  theme: 'auto', // Automatic theme detection
  // App root data
  data: function () {
    return {
    };
  },
  // App root methods
  methods: {

  },
  // App routes
  routes: routes
});

// Init/Create main view
let mainView = app.views.create('.view-main', {
  url: '/'
});
