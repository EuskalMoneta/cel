import {
    fetchNoAuth,
    getAPIBaseURL,
    getUrlParameter,
    NavbarTitle,
} from 'Utils'

const {
    Input,
    Row
} = FRC

import classNames from 'classnames'

const {
    ToastContainer
} = ReactToastr
const ToastMessageFactory = React.createFactory(ReactToastr.ToastMessage.animation)

const SetPasswordForm = React.createClass({

    mixins: [FRC.ParentContextMixin],

    propTypes: {
        children: React.PropTypes.node
    },

    render() {
        return (
            <Formsy.Form
                className={this.getLayoutClassName()}
                {...this.props}
                ref="changepassword"
            >
                {this.props.children}
            </Formsy.Form>
        );
    }
});

class SetPasswordPage extends React.Component {

    constructor(props) {
        super(props);

        // Default state
        this.state = {
            canSubmit: false,
            tokenError: false,
        }
    }

    enableButton = () => {
        this.setState({canSubmit: true})
    }

    disableButton = () => {
        this.setState({canSubmit: false})
    }

    enableTokenError = () => {
        this.setState({tokenError: true})
    }

    disableTokenError = () => {
        this.setState({tokenError: false})
    }

    submitForm = (data) => {
        this.disableButton()

        // We POST the token back to our API
        var token = getUrlParameter('token')
        if (!token) {
            this.enableTokenError()
        }
        data.token = token

        var computeForm = (data) => {
            this.refs.container.success(
                __("L'enregistrement s'est déroulé correctement."),
                "",
                {
                    timeOut: 5000,
                    extendedTimeOut: 10000,
                    closeButton:true
                }
            )

            // setTimeout(() => window.location.assign("/login"), 3000)
        }

        var promiseError = (err) => {
            // Error during request, or parsing NOK :(
            console.error(this.props.url, err)
            this.refs.container.error(
                __("Une erreur s'est produite lors de l'enregistrement !"),
                "",
                {
                    timeOut: 5000,
                    extendedTimeOut: 10000,
                    closeButton:true
                }
            )
        }
        fetchNoAuth(this.props.postURL, 'POST', computeForm, data, promiseError)
    }

    render = () =>
    {
        return (
            <div className="row">
                <SetPasswordForm
                    onValidSubmit={this.submitForm}
                    onInvalid={this.disableButton}
                    onValid={this.enableButton}
                    ref="changepassword">
                    <fieldset>
                         <Input
                            name="new_password"
                            data-eusko="changepassword-new_password"
                            value=""
                            label={__("Nouveau mot de passe")}
                            type="password"
                            placeholder={__("Votre nouveau mot de passe")}
                            validations="equalsField:confirm_password,minLength:4,maxLength:12"
                            validationErrors={{
                                equalsField: __("Les mots de passe ne correspondent pas."),
                                minLength: __("Un mot de passe doit faire entre 4 et 12 caractères."),
                                maxLength: __("Un mot de passe doit faire entre 4 et 12 caractères.")
                            }}
                            elementWrapperClassName={[{'col-sm-9': false}, 'col-sm-5']}
                            required
                        />
                        <Input
                            name="confirm_password"
                            data-eusko="changepassword-confirm_password"
                            value=""
                            label={__("Confirmer le nouveau mot de passe")}
                            type="password"
                            placeholder={__("Confirmation de votre nouveau mot de passe")}
                            validations="equalsField:new_password,minLength:4,maxLength:12"
                            validationErrors={{
                                equalsField: __("Les mots de passe ne correspondent pas."),
                                minLength: __("Un mot de passe doit faire entre 4 et 12 caractères."),
                                maxLength: __("Un mot de passe doit faire entre 4 et 12 caractères.")
                            }}
                            elementWrapperClassName={[{'col-sm-9': false}, 'col-sm-5']}
                            required
                        />
                    </fieldset>
                    <fieldset>
                        <Row layout="horizontal">
                            <input
                                name="submit"
                                data-eusko="changepassword-submit"
                                type="submit"
                                defaultValue={__("Enregistrer le mot de passe")}
                                className="btn btn-success"
                                formNoValidate={true}
                                disabled={!this.state.canSubmit}
                            />
                        </Row>
                    </fieldset>
                </SetPasswordForm>
                <ToastContainer ref="container"
                                toastMessageFactory={ToastMessageFactory}
                                className="toast-top-right toast-top-right-navbar" />
            </div>
        );
    }
}

if (window.location.pathname.toLowerCase().indexOf("valide-passe-perdu") != -1)
{
    var pageTitle = __("J'ai perdu mon mot de passe")
    var mode = 'validate-lost-password'
}
else if (window.location.pathname.toLowerCase().indexOf("valide-premiere-connexion") != -1) {
    var pageTitle = __("Première connexion")
    var mode = 'validate-first-connection'
}

ReactDOM.render(
    <SetPasswordPage
        postURL={getAPIBaseURL + mode + "/"}
        mode={mode}
    />,
    document.getElementById('valid-token')
)

ReactDOM.render(
    <NavbarTitle title={pageTitle} />,
    document.getElementById('navbar-title')
)