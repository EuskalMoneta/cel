import {
    fetchAuth,
    checkStatus,
    getAPIBaseURL,
    getCSRFToken,
    parseJSON,
} from 'Utils'

const {
    ToastContainer
} = ReactToastr
const ToastMessageFactory = React.createFactory(ReactToastr.ToastMessage.animation)


class AccepteCGUPage extends React.Component {

    constructor(props) {
        super(props);

        // Default state
        this.state = {
            canSubmit: true,
        }
    }

    enableButton = () => {
        this.setState({canSubmit: true})
    }

    disableButton = () => {
        this.setState({canSubmit: false})
    }

    submitForm = (mode) => {
        if (mode == "valid")
            var url = getAPIBaseURL + "accept-cgu/"
        else
            var url = getAPIBaseURL + "refuse-cgu/"

        this.disableButton()

        var computeForm = () => {
            if (mode == "valid") {
                // Get Session data from API & update session data via Django front
                fetch('/update-session/',
                {
                    method: 'put',
                    credentials: 'same-origin',
                    body: JSON.stringify({'token': sessionStorage.getItem('cel-api-token-auth')}),
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCSRFToken,
                    }
                })
                .then(checkStatus)
                .then(parseJSON)
                .then((data) => {
                    // Redirect to profile page
                    window.location.assign('/compte/synthese/')
                })
                .catch((err) => {
                    // Error during request, or parsing NOK :(
                    console.error(err)

                    // toast
                    this.refs.container.error(
                        __("Une erreur est survenue lors de l'enregistrement vers le serveur !"),
                        "",
                        {
                            timeOut: 5000,
                            extendedTimeOut: 10000,
                            closeButton:true
                        }
                    )
                })
            }
            else {
                // logout user
                window.location.assign('/logout/')
            }
        }

        var promiseError = (err) => {
            // toast
            this.refs.container.error(
                __("Une erreur est survenue lors de l'enregistrement vers le serveur !"),
                "",
                {
                    timeOut: 5000,
                    extendedTimeOut: 10000,
                    closeButton:true
                }
            )
        }
        fetchAuth(url, 'POST', computeForm, null, promiseError)
    }

    render = () => {
        // TODO: Update links in Django CEL settings
        if (window.config.profile.member_type == "Particulier")
            var link = window.config.cguParticuliersURL
        else
            var link = window.config.cguPrestatairesURL

        return (
            <div>
                <h2 style={{marginTop: 60}} className="margin-bottom">{__("Conditions Générales d'Utilisation de l'Eusko numérique")}</h2>                         
                <div className="row margin-bottom">
                    {__("Pour utiliser l'Eusko numérique et accéder à votre compte, vous devez accepter les Conditions Générales d'Utilisation de l'Eusko numérique, que vous pouvez télécharger ci-dessous.")}
                    <br />
                    <a href={link}>
                        {__("Télécharger les Conditions Générales d'Utilisation")} <i className="glyphicon glyphicon-download-alt"></i>
                    </a>
                    <br />
                    <br />
                    {__("Si vous refusez les CGU, le compte Eusko numérique ouvert à votre nom sera fermé.")}
                </div>
                <div className="row">
                    <div className="col-md-3 col-md-offset-1">
                        <input
                            name="valid"
                            data-eusko="accept-cgu-valid"
                            type="submit"
                            onClick={() => this.submitForm('valid')}
                            defaultValue={__("J'accepte")}
                            className="btn btn-success"
                            disabled={!this.state.canSubmit}
                        />
                    </div>
                    <div className="col-md-3 col-md-offset-1">
                        <input
                            name="refuse"
                            data-eusko="accept-cgu-refuse"
                            type="submit"
                            onClick={() => this.submitForm('refuse')}
                            defaultValue={__("Je refuse")}
                            className="btn btn-danger"
                            disabled={!this.state.canSubmit}
                        />
                    </div>
                </div>
                <ToastContainer ref="container"
                    toastMessageFactory={ToastMessageFactory}
                    className="toast-top-right toast-top-right-navbar"
                />
            </div>
        );
    }
}


ReactDOM.render(
    <AccepteCGUPage />,
    document.getElementById('accept-cgu')
)
document.title = __("Conditions Générales d'Utilisation") + " - " + __("Compte en ligne") + " " + document.title