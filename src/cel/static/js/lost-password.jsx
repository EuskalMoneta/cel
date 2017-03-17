import {
    fetchNoAuth,
    getAPIBaseURL,
    isMemberIdEusko,
} from 'Utils'

const {
    Input,
    Select,
    Row
} = FRC

Formsy.addValidationRule('isMemberIdEusko', isMemberIdEusko)


import classNames from 'classnames'

import ReactSpinner from 'react-spinjs'

const {
    ToastContainer
} = ReactToastr
const ToastMessageFactory = React.createFactory(ReactToastr.ToastMessage.animation)

const LostPasswordForm = React.createClass({

    mixins: [FRC.ParentContextMixin],

    propTypes: {
        children: React.PropTypes.node
    },

    render() {
        return (
            <Formsy.Form
                className={this.getLayoutClassName()}
                {...this.props}
                ref="lost-password"
            >
                {this.props.children}
            </Formsy.Form>
        );
    }
});

class LostPasswordPage extends React.Component {

    constructor(props) {
        super(props);

        // Default state
        this.state = {
            canSubmit: false,
            validFields: false,
            login: undefined,
            email: undefined,
            invalidData: false,
            validData: false,
            displaySpinner: false,
            spinnerConfig: {
                lines: 13, // The number of lines to draw
                length: 28, // The length of each line
                width: 14, // The line thickness
                radius: 42, // The radius of the inner circle
                scale: 0.5, // Scales overall size of the spinner
                corners: 1, // Corner roundness (0..1)
                color: '#000', // #rgb or #rrggbb or array of colors
                opacity: 0.25, // Opacity of the lines
                rotate: 0, // The rotation offset
                direction: 1, // 1: clockwise, -1: counterclockwise
                speed: 1, // Rounds per second
                trail: 60, // Afterglow percentage
                fps: 20, // Frames per second when using setTimeout() as a fallback for CSS
                zIndex: 2e9, // The z-index (defaults to 2000000000)
                className: 'spinner', // The CSS class to assign to the spinner
                top: '62%', // Top position relative to parent
                left: '50%', // Left position relative to parent
                shadow: false, // Whether to render a shadow
                hwaccel: false, // Whether to use hardware acceleration
                position: 'absolute' // Element positioning
            },
        }
    }

    onFieldChange = (event, value) => {
        if (event == "login") {
            this.setState({[event]: value.toUpperCase(), invalidData: false})
        }
        else {
            this.setState({[event]: value, invalidData: false})
        }
    }

    enableButton = () => {
        this.setState({canSubmit: true})
    }

    disableButton = () => {
        this.setState({canSubmit: false})
    }

    submitForm = (data) => {
        // Trigger <ReactSpinner /> to disable login form
        this.setState({displaySpinner: true, canSubmit: false})

        var computeForm = (data) => {
            this.setState({displaySpinner: false, canSubmit: false})

            if (data.member === null) {
                // We got an error!
                this.setState({invalidData: true, validData: false})
            }
            else {
                // Everything is ok!
                this.setState({validData: true, invalidData: false})   
            }
        }

        var promiseError = (err) => {
            // Highlight login/password fields !
            this.setState({invalidData: true, displaySpinner: false, canSubmit: false})
        }
        fetchNoAuth(this.props.url, this.props.method, computeForm, data, promiseError)
    }

    render = () => {
        var parentDivClasses = classNames({
            'has-spinner': this.state.displaySpinner,
        })

        var divClasses = classNames({
            'has-error': this.state.invalidData,
        })

        if (this.state.invalidData) {
            var messageData = (
                <div className="alert alert-danger">
                    {__("Il n'y a pas d'adhérent-e correspondant à ce numéro et cette adresse email. Veuillez nous contacter.")}
                </div>
            )
            var returnToLogin = (
                <Row layout="horizontal" elementWrapperClassName="margin-top">
                    <a href="/contact">{__("Formulaire de contact")}</a>
                </Row>
            )
        }
        else {
            if (this.state.validData) {
                var messageData = (
                    <div className="alert alert-success">
                        {__("Veuillez vérifier vos emails.")}
                        <br />
                        <br />
                        {__("Vous allez recevoir un message qui vous donnera accès à un formulaire où vous pourrez choisir votre mot de passe.")}
                    </div>
                )
            }
            else
                var messageData = null
        }

        if (this.state.displaySpinner)
            var spinner = <ReactSpinner config={this.state.spinnerConfig} />
        else
            var spinner = null

        return (
            <div className={parentDivClasses}>
                {spinner}
                <div className={divClasses}>
                    <h2 className="margin-top-zero margin-bottom">{__("Mot de passe perdu")}</h2>
                    <LostPasswordForm
                        onValidSubmit={this.submitForm}
                        onInvalid={this.disableButton}
                        onValid={this.enableButton}
                        ref="lost-password">
                        <fieldset>
                            <Input
                                name="login"
                                data-eusko="lost-password-login"
                                value={this.state.login ? this.state.login : ""}
                                label={__("N° adhérent")}
                                type="text"
                                placeholder={__("N° adhérent")}
                                help={__("Format: E12345")}
                                onChange={this.onFieldChange}
                                validations="isMemberIdEusko"
                                validationErrors={{
                                    isMemberIdEusko: __("Ceci n'est pas un N° adhérent Eusko valide.")
                                }}
                                elementWrapperClassName={[{'col-sm-9': false}, 'col-sm-5']}
                                required
                            />
                            <Input
                                name="email"
                                data-eusko="lost-password-email"
                                value=""
                                label={__("Email")}
                                type="email"
                                placeholder={__("Email de l'adhérent")}
                                onChange={this.onFieldChange}
                                validations="isEmail"
                                validationErrors={{
                                    isEmail: __("Adresse email non valide")
                                }}
                                elementWrapperClassName={[{'col-sm-9': false}, 'col-sm-5']}
                                required
                            />

                            <Row layout="horizontal" elementWrapperClassName="margin-top-ten col-sm-5">
                                {messageData}
                            </Row>
                            
                            <Row layout="horizontal">
                                <input
                                    name="submit"
                                    data-eusko="lost-password-submit"
                                    type="submit"
                                    defaultValue={__("Valider")}
                                    className="btn btn-success"
                                    formNoValidate={true}
                                    disabled={!this.state.canSubmit}
                                />
                            </Row>
                        </fieldset>
                    </LostPasswordForm>
            </div>
            </div>
        );
    }
}


ReactDOM.render(
    <LostPasswordPage url={getAPIBaseURL + "lost-password/"} method="POST" />,
    document.getElementById('lost-password')
)
document.title = __("Mot de passe perdu") +  " - " + __("Compte en ligne") + " " + document.title