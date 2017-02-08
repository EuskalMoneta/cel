// Load here global React objects like navbars etc...
// We can load our Sass stylesheets which will be included in the bundle using Webpack,
// thus we can also setup JavaScript things ... all of those will be used everywhere in our app

import {
    TopbarRight
} from 'Utils'

// Load the CSS stylesheets for our dependencies
import '../css/bootstrap.min.css'
import '../css/animate.min.css'
import '../css/toastr.min.css'
import 'node_modules/react-selectize/themes/index.css'

// Load our base Sass stylesheet
import '../scss/style.scss'

// Setup momentjs
moment.locale(document.documentElement.lang)
moment().utcOffset("+01:00")

// Setup raven (Sentry client)
// Raven.config('http://02c622eee5004e9fa9b661395e6ca409@localhost:8081/3').install()

// The 'id' field is mandatory!
const navbarObjects = [{data: '', id: 0},
                       {href: '/logout', label: __("Déconnexion"), id: 1},
                       ]

ReactDOM.render(
    <TopbarRight objects={navbarObjects} />,
    document.getElementById('topbar-right')
)
