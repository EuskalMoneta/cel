import {
    fetchAuth,
    getAPIBaseURL,
    NavbarTitle,
    isMemberIdEusko
} from 'Utils'

const {
    Input,
    Select,
    Row
} = FRC

Formsy.addValidationRule('isMemberIdEusko', isMemberIdEusko)


import classNames from 'classnames'

const {
    ToastContainer
} = ReactToastr
const ToastMessageFactory = React.createFactory(ReactToastr.ToastMessage.animation)

const FirstTimeForm = React.createClass({

    mixins: [FRC.ParentContextMixin],

    propTypes: {
        children: React.PropTypes.node
    },

    render() {
        return (
            <Formsy.Form
                className={this.getLayoutClassName()}
                {...this.props}
                ref="first-time"
            >
                {this.props.children}
            </Formsy.Form>
        );
    }
});

class FirstTimePage extends React.Component {

    constructor(props) {
        super(props);

        // Default state
        this.state = {
            canSubmit: false,
            validFields: false,
        }
    }

    enableButton = () => {
        this.setState({canSubmit: true})
    }

    disableButton = () => {
        this.setState({canSubmit: false})
    }

    validFields = () => {
        this.setState({validFields: true})
    }

    submitForm = (data) => {
        this.disableButton()

        data.member_login = this.state.member.login
        data.payment_mode = this.state.paymentMode.cyclos_id
        data.payment_mode_name = this.state.paymentMode.label

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

            setTimeout(() => window.location.assign("/members/" + document.getElementById("member_id").value), 3000)
        }

        var promiseError = (err) => {
            // Error during request, or parsing NOK :(
            this.enableButton()

            console.error(this.props.url, err)
            this.refs.container.error(
                __("Une erreur s'est produite lors de l'enregistrement, vérifiez si le solde est bien disponible !"),
                "",
                {
                    timeOut: 5000,
                    extendedTimeOut: 10000,
                    closeButton:true
                }
            )
        }
        fetchAuth(this.props.url, this.props.method, computeForm, data, promiseError)
    }

    render = () => {
        var divAmountClass = classNames({
            'form-group row': true,
            'has-error has-feedback': this.state.amountInvalid,
        })

        return (
            <div className="row">
                <FirstTimeForm
                    onValidSubmit={this.submitForm}
                    onInvalid={this.disableButton}
                    onValid={this.validFields}
                    ref="first-time">
                    <fieldset>
                        <Input
                            name="amount"
                            data-eusko="first-time-amount"
                            value=""
                            label={__("Montant")}
                            type="number"
                            placeholder={__("Montant du change")}
                            validations="isMemberIdEusko"
                            validationErrors={{
                                isMemberIdEusko: __("Montant invalide.")
                            }}
                            elementWrapperClassName={[{'col-sm-9': false}, 'col-sm-5']}
                            required
                        />
                    </fieldset>
                    <fieldset>
                        <Row layout="horizontal">
                            <input
                                name="submit"
                                data-eusko="first-time-submit"
                                type="submit"
                                defaultValue={__("Valider")}
                                className="btn btn-success"
                                formNoValidate={true}
                                disabled={!this.state.canSubmit}
                            />
                        </Row>
                    </fieldset>
                </FirstTimeForm>
                <ToastContainer ref="container"
                                toastMessageFactory={ToastMessageFactory}
                                className="toast-top-right toast-top-right-navbar" />
            </div>
        );
    }
}


ReactDOM.render(
    <FirstTimePage url={getAPIBaseURL + "change-euro-eusko/"} method="POST" />,
    document.getElementById('first-time')
)

ReactDOM.render(
    <NavbarTitle title={__("Première connexion")} />,
    document.getElementById('navbar-title')
)