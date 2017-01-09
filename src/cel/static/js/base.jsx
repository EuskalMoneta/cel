// Load here global React objects like a navbar, i18n flags clicks, etc...
// We can load our Sass stylesheets which will be included in the bundle using Webpack,
// thus we can also setup JavaScript things ... all of those will be used everywhere in our app

import {
    NavbarTitle,
    NavbarItems,
    NavbarRight,
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
Raven.config('http://02c622eee5004e9fa9b661395e6ca409@localhost:8081/3').install()


ReactDOM.render(
    <NavbarTitle />,
    document.getElementById('navbar-title')
)

// The 'id' field is mandatory!
const navbarObjects = [{href: '/mon-compte', label: __("Mon compte"), id: 0},
                       ]

ReactDOM.render(
    <NavbarItems objects={navbarObjects} />,
    document.getElementById('navbar-content')
)

ReactDOM.render(
    <NavbarRight />,
    document.getElementById('navbar-right')
)
