var checkStatus = (response) => {
    if (response.status != 204 && response.status >= 200 && response.status < 300) {
        return response
    }
    else if (response.status == 204) {
        var error = new Error("No content")
        error.response = response
        throw error
    }
    else {
        var error = new Error(response.statusText)
        error.response = response
        throw error
    }
}

var parseJSON = (response) => {
    return response.json()
}

var parseBLOB = (response) => {
    return response.blob()
}

var storeToken = (data) => {
    // Save data to sessionStorage
    sessionStorage.setItem('cel-api-token-auth', data.token)
    return data.token
}

var getToken = () => {
    // Get saved data from sessionStorage
    return sessionStorage.getItem('cel-api-token-auth')
}

var fetchCustom = (url, method, promise, token, data, promiseError=null, accept=null) => {
    if (!accept) {
        var accept = 'application/json'
    }

    var payload = {
        method: method,
        headers: {
            'Accept': accept,
            'Content-Type': 'application/json',
            'Authorization': 'Token ' + token
        }
    }

    if (method.toLowerCase() != 'get' && data != null) {
        payload.body = JSON.stringify(data)
    }

    if (!promiseError) {
        var promiseError = (err) => {
            // Error during request, or parsing NOK :(
            if (err.message != "No content") {
                console.error(url, method, promise, token, data, promiseError, err)
            }
        }
    }

    fetch(url, payload)
    .then(checkStatus)
    .then(accept == 'application/json' ? parseJSON : parseBLOB)
    .then(promise)
    .catch(promiseError)
}

var fetchGetToken = (username, password, promiseSuccess, promiseError) => {
    sessionStorage.removeItem('cel-api-token-auth')

    fetch(getAPIBaseURL + 'api-token-auth/',
    {
        method: 'post',
        body: JSON.stringify({'username': username, 'password': password}),
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
    })
    .then(checkStatus)
    .then(parseJSON)
    .then(storeToken)
    .then(promiseSuccess)
    .catch(promiseError)
}

var fetchAuth = (url, method, promise, data=null, promiseError=null, accept=null) => {
    var token = getToken()
    if (token) {
        // We have a token
        fetchCustom(url, method, promise, token, data, promiseError, accept)
    }
    else {
        // We need a token
        if (location.pathname != window.config.getLoginURL) {
            // Redirect to login page is needed
            console.error("We need a token, we redirect to login")
            console.error(window.config.getLoginURL)
            window.location.assign(window.config.getLoginURL)
        }
    }
}

var fetchNoAuth = (url, method, promise, data=null, promiseError=null) => {
    var payload = {
        method: method,
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
    }

    if (method.toLowerCase() != 'get' && data != null) {
        payload.body = JSON.stringify(data)
    }

    if (!promiseError) {
        var promiseError = (err) => {
            // Error during request, or parsing NOK :(
            if (err.message != "No content") {
                console.error(url, method, promise, token, data, promiseError, err)
            }
        }
    }

    fetch(url, payload)
    .then(checkStatus)
    .then(parseJSON)
    .then(promise)
    .catch(promiseError)
}

var getUrlParameter = (name) => {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    var results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

var isMemberIdEusko = (values, value) =>
{
    if (!value) {
        return false
    }

    if ((value.startsWith("E", 0) || value.startsWith("Z", 0)) && value.length === 6) {
        return true
    }
    else {
        return false
    }
}

var isBdcIdEusko = (values, value) =>
{
    if (!value) {
        return false
    }

    if (value.startsWith("B", 0) && value.length === 4 &&
        !isNaN(value[1]) && !isNaN(value[2]) && !isNaN(value[3])) {
        return true
    }
    else {
        return false
    }
}

var isPositiveNumeric = (values, value) =>
{
    if (!value || value == 0) {
        return false
    }

    if (value.match(/^\+?(?:\d*[.])?\d+$/))
        return true
    else
        return false
}

var titleCase = (str) => {
    if ((str===null) || (str===''))
        return false;
    else
        str = str.toString();

    return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
}

var getCurrentLang = document.documentElement.lang
var getCSRFToken = window.config.getCSRFToken
var getAPIBaseURL = window.config.getAPIBaseURL


class NavbarItems extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            classes: props.classes ? props.classes : 'nav navbar-nav',
            objects: props.objects ? props.objects : [],
        }
    }

    componentWillReceiveProps(nextProps) {
        const isObjectsChanging = nextProps.objects !== this.props.objects
        if (isObjectsChanging) {
            this.setState({objects: nextProps.objects})
        }

        const isClassesChanging = nextProps.classes !== this.props.classes
        if (isClassesChanging) {
            this.setState({classes: nextProps.classes})
        }
    }

    render() {
        var navbarData = _.map(this.state.objects, (item) => {
            if (item) {
                if (item.href) {
                    if (item.href == '/logout') {
                        return (
                            <li key={item.id} className="log-out">
                                <a href={item.href}>{item.label + ' '}
                                    <span className="glyphicon glyphicon-log-out"></span>
                                </a>
                            </li>
                        )
                    }
                    else {
                        return (
                            <li key={item.id}>
                                <a href={item.href}>{item.label}</a>
                            </li>
                        )
                    }
                }
                else if (item.data) {
                    return (
                        <li key={item.id}>
                            <a>{item.data}</a>
                        </li>
                    )
                }
                else {
                    return (
                        <li key={item.id}>
                            <a>{item.label}</a>
                        </li>
                    )
                }
            }
        })

        return (
            <ul className={this.state.classes}>
                {navbarData}
            </ul>
        )
    }
}

class Navbar extends React.Component {
    constructor(props) {
        super(props);

        // The 'id' fields are mandatory!
        var navbarObjects = [{href: '/compte', label: __("Mon compte"), status: 'inactive', id: 0},
                             {href: '/virements', label: __("Mes virements"), status: 'inactive', id: 1},
                             {href: '/euskokart', label: __("Mon EuskoKart"), status: 'inactive', id: 2},
                             {href: '/profil', label: __("Mon profil"), status: 'inactive', id: 3},
                             ]

        navbarObjects = _.map(navbarObjects, (item) => {
            if (window.location.pathname.toLowerCase().indexOf(item.href.substring(1)) != -1) {
                item.status = 'active'
            }

            return item
        })

        this.state = {objects: navbarObjects}
    }

    render() {
        return (
            <div className="navbar navbar-static-top">
                <div className="container">
                    <div className="collapse navbar-collapse main-nav">
                        <NavbarItems objects={this.state.objects} classes={'nav navbar-nav'} />
                    </div>
                </div>
            </div>
        )
    }
}

class TopbarRight extends React.Component {
    constructor(props) {
        super(props);

        moment.locale(document.documentElement.lang)

        this.state = {
            memberData: '',
            objects: Array(),
            userAuth: window.config.userAuth,
        }
    }

    tick() {
        this.setState((previousState, currentProps) => {
            if (previousState.objects.length == 0) {
                var objects = currentProps.objects
            }
            else {
                var objects = previousState.objects
            }

            return {objects:
                _.map(objects, (item) => {
                    if (item) {
                        if (item.id === 0) {
                            item.data = moment().format('DD/MM/YYYY hh:mm:ss')
                            return item
                        }
                        else if (this.state.userAuth) {
                            if (item.id === 1 && this.state.memberData) {
                                item.data = window.config.userName + ' - ' + this.state.memberData
                                return item
                            }

                            return item
                        }
                    }
                })
            }
        })
    }

    componentDidMount() {
        setInterval(() => { this.tick() }, 1000)

        // Get member name
        if (this.state.userAuth)
        {
            var computeData = (data) => {
                this.setState({memberData: data})
            }
            fetchAuth(getAPIBaseURL + "member-name/", 'get', computeData)
        }
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps) {
            this.setState(newProps)
        }
    }

    render() {
        return (
            <NavbarItems objects={this.state.objects} classes={"nav navbar-nav navbar-right topbar-right"} />
        )
    }
}

class SelectizeUtils {
    // generic callback for all selectize objects
    static selectizeCreateFromSearch(options, search) {
        // Pretty much self explanatory:
        // this function is called when we start typing inside the select
        if (search)
        {
            if (search.length == 0 || (options.map(function(option)
            {
                return option.label;
            })).indexOf(search) > -1)
                return null;
            else
                return {label: search, value: search};
        }
        else
            return null;
    }

    static selectizeRenderOption (item) {
        // This is how the list itself is displayed
        return    <div className="simple-option" style={{display: "flex", alignItems: "center"}}>
                    <div className="memberaddform" style={{marginLeft: 10}}>
                        {item.label}
                    </div>
                </div>
    }

    static selectizeNewRenderOption (item) {
        // This is how the list itself is displayed
        return    <div className="simple-option" style={{display: "flex", alignItems: "center"}}>
                    <div className="memberaddform" style={{marginLeft: 10}}>
                        {!!item.newOption ? __("Ajouter") + " " + item.label + " ..." : item.label}
                    </div>
                </div>
    }

    static selectizeRenderValue (item) {
        // When we select a value, this is how we display it
        return    <div className="simple-value">
                    <span className="memberaddform" style={{marginLeft: 10, verticalAlign: "middle"}}>{item.label}</span>
                </div>
    }

    static selectizeNoResultsFound () {
        return    <div className="no-results-found" style={{fontSize: 15}}>
                    {__("Pas de résultat")}
                </div>
    }
}


module.exports = {
    checkStatus: checkStatus,
    parseJSON: parseJSON,
    fetchAuth: fetchAuth,
    fetchNoAuth: fetchNoAuth,
    fetchCustom: fetchCustom,
    fetchGetToken: fetchGetToken,
    getUrlParameter: getUrlParameter,
    isMemberIdEusko: isMemberIdEusko,
    isBdcIdEusko: isBdcIdEusko,
    isPositiveNumeric: isPositiveNumeric,
    titleCase: titleCase,
    getCurrentLang: getCurrentLang,
    getCSRFToken: getCSRFToken,
    getAPIBaseURL: getAPIBaseURL,
    Navbar: Navbar,
    NavbarItems: NavbarItems,
    TopbarRight: TopbarRight,
    SelectizeUtils: SelectizeUtils
}