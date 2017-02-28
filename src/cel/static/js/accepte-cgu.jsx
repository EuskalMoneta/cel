import {
    fetchAuth,
    getAPIBaseURL,
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
        debugger
        this.disableButton()

        var computeForm = (data) => {
            // TODO
        }

        var promiseError = (err) => {
            // TODO
        }
        fetchAuth(this.props.url, this.props.method, computeForm, data, promiseError)
    }

    render = () => {
        return (
            <div>
                <h2 style={{marginTop: 60}} className="margin-bottom">{__("Conditions générales d'utilisation de l'Eusko numérique")}</h2>                         
                <div className="row margin-bottom">
                    {__("Pour utiliser l'Eusko numérique et accéder à votre compte, vous devez accepter les Conditions générales d'utilisation de l'Eusko numérique, que vous pouvez télécharger ci-dessous.")}
                    <br />
                    <a href="">{__("Télécharger les Conditions générales d'utilisation")}.</a>
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
                            name="deny"
                            data-eusko="accept-cgu-deny"
                            type="submit"
                            onClick={() => this.submitForm('deny')}
                            defaultValue={__("Je refuse")}
                            className="btn btn-danger"
                            disabled={!this.state.canSubmit}
                        />
                    </div>
                </div>
            </div>
        );
    }
}


ReactDOM.render(
    <AccepteCGUPage url={getAPIBaseURL + "accept-cgu/"} method="POST" />,
    document.getElementById('accept-cgu')
)
document.title = __("Conditions générales d'utilisation") + " - " + __("Compte en ligne") + " " + document.title