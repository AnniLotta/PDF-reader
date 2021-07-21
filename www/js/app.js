// Dom7
let $$ = Dom7;

// Framework7 App main instance
let app = new Framework7({
  el: '#app', // App root element
  name: 'PDF reader', // App name
  id: 'PDFreader',
  // App root data
  statusbar: {
    enabled: false,
  },
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
let mainView = app.views.create('.view-main');
