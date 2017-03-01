import {
    fetchNoAuth,
    getAPIBaseURL,
    getUrlParameter,
    SelectizeUtils,
} from 'Utils'

const {
    Input,
    Row
} = FRC

import ReactSelectize from 'react-selectize'
const SimpleSelect = ReactSelectize.SimpleSelect

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
            stdFieldsAreValid: false,
            tokenError: false,
            displayCustomQuestion: false,
            customQuestion: undefined,
            selectedQuestion: '',
            predefinedQuestions: undefined,
            answer: undefined,
            password: undefined,
            confirmPassword: undefined,
            userExist:false,
        }
    }

    validateStdFields = () => {
        this.setState({stdFieldsAreValid: true}, this.enableButton)
    }

    invalidateStdFields = () => {
        this.setState({stdFieldsAreValid: false}, this.enableButton)
    }

    enableButton = () => {
        if (this.state.answer && this.state.question && this.state.stdFieldsAreValid) {
            if (this.state.displayCustomQuestion && this.state.customQuestion) {
                this.setState({canSubmit: true})
            }
            else if (!this.state.displayCustomQuestion) {
                this.setState({canSubmit: true})
            }
            else {
                this.disableButton()
            }
        }
        else {
            this.disableButton()
        }
    }

    onFormChange = (event, value) => {
        this.setState({[event]: value}, this.enableButton)
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

    componentDidMount = () => {
        if (this.props.mode == 'validate-lost-password') {
            var getSelectedQuestion = (data) => {
                this.setState({selectedQuestion: data.question})
            }

            var token = getUrlParameter('token')
            if (!token) {
                this.enableTokenError()
            }
            fetchNoAuth(getAPIBaseURL + "securityqa/me/?token=" + token, 'GET', getSelectedQuestion)
        }
        else {
            var getPredefinedQuestions = (data) => {
                data.push({"question" : "Autre", "id" : 0})
                var predefinedQuestions = _.chain(data)
                                           .map((item) => {
                                                return {label: item.question, value: item.id}
                                           })
                                           .sortBy((item) => { return -item.id })
                                           .sortBy((item) => { return item.label })
                                           .value()

                this.setState({predefinedQuestions: predefinedQuestions})
            }
            fetchNoAuth(getAPIBaseURL + "securityqa/", 'GET', getPredefinedQuestions)
        }
    }

    answerOnValueChange = (field, value) => {
        this.setState({answer: value})
    }

    enableButtonAnswer = () => {
        if (this.state.answer && this.state.question) {
            if (this.state.displayCustomQuestion && this.state.customQuestion) {
                this.setState({canSubmitAnswer: true})
            }
            else if (!this.state.displayCustomQuestion) {
                this.setState({canSubmitAnswer: true})
            }
            else {
                this.disableButton()
            }
        }
        else {
            this.disableButton()
        }
    }

    customQuestionOnValueChange = (field, value) => {
        this.setState({customQuestion: value})
    }

    answerOnValueChange = (field, value) => {
        this.setState({answer: value})
    }

    questionOnValueChange = (item) => {
        this.setState({question: item})

        try {
            if (item.value === 0) {
                this.setState({displayCustomQuestion: true, customQuestion: undefined}, this.enableButtonAnswer)
            }
            else {
                this.setState({displayCustomQuestion: false, customQuestion: undefined}, this.enableButtonAnswer)
            }
        }
        catch (e) {
            // item.value does not exist, item is undefined I guess ... disabling displayCustomQuestion
            this.setState({displayCustomQuestion: false, customQuestion: undefined}, this.enableButtonAnswer)
        }
    }

    submitForm = (data) => {
        this.disableButton()

        // We POST the token back to our API
        var token = getUrlParameter('token')
        if (!token) {
            this.enableTokenError()
        }

        var postData = {}
        postData.token = token
        postData.new_password = this.state.password
        postData.confirm_password = this.state.confirmPassword

        if (this.state.displayCustomQuestion && this.state.customQuestion) {
            postData.answer = this.state.answer
            postData.question_id = this.state.question.value
            postData.question_text = this.state.customQuestion
        }
        else if (!this.state.displayCustomQuestion) {
            postData.answer = this.state.answer
            postData.question_id = this.state.question.value
        }

        var computeForm = (res) => {
            if (res.error == "User already exist!")
            {
                this.setState({userExist: true})
            }
            else
            {
                this.refs.container.success(
                    __("L'enregistrement s'est déroulé correctement."),
                    "",
                    {
                        timeOut: 5000,
                        extendedTimeOut: 10000,
                        closeButton:true
                    }
                )
                setTimeout(() => window.location.assign("/login"), 5000)
            }
        }

        var promiseError = (err) => {
            debugger
            // Error during request, or parsing NOK :(
            console.error(this.props.postURL, err)
            this.refs.container.error(
                __("Une erreur s'est produite lors de la validation !"),
                "",
                {
                    timeOut: 5000,
                    extendedTimeOut: 10000,
                    closeButton:true
                }
            )
        }
        fetchNoAuth(this.props.postURL, 'POST', computeForm, postData, promiseError)
    }

    render = () =>
    {
        if (this.state.displayCustomQuestion) {
            var inputCustomQuestion = (
                <Input
                 name="question"
                 data-eusko="securityquestion-question"
                 value={this.state.customQuestion ? this.state.customQuestion : ""}
                 label={__("Votre question personnalisée")}
                 type="text"
                 placeholder={__("Votre question personnalisée")}
                 validations="isExisty"
                 validationErrors={{
                     isExisty: __("Question invalide."),
                 }}
                 onChange={this.customQuestionOnValueChange}
                 elementWrapperClassName={[{'col-sm-9': false}, 'col-sm-5']}
                 required
                />
            )
        }
        else {
            var inputCustomQuestion = null
        }

        if (this.state.userExist) {
            var messageData = (
                <div className="alert alert-danger">
                    {__("L'utilisateur existe déjà. Si vous avez perdu votre mot de passe, ")}
                    <a href="passe-perdu/">{__("cliquez ici.")}</a>
                </div>
            )
        }
        if (this.props.mode == 'validate-lost-password' && this.state.selectedQuestion) {
            var securityQA = (

                <div>
                    <div className="form-group row">
                        <label className="control-label col-sm-3">Votre question secrète :</label>
                        <div className="col-sm-5" style={{marginTop: "11px"}}>
                            <span>{this.state.selectedQuestion.question}</span>
                        </div>
                    </div>
                    <Input
                       name="answer"
                       data-eusko="securityquestion-answer"
                       value={this.state.answer ? this.state.answer : ""}
                       label={__("Votre réponse")}
                       type="text"
                       placeholder={__("Votre réponse")}
                       validations="isExisty"
                       validationErrors={{
                           isExisty: __("Réponse invalide."),
                       }}
                       help={__("Votre réponse n'est pas sensible à la casse.")}
                       onChange={this.answerOnValueChange}
                       elementWrapperClassName={[{'col-sm-9': false}, 'col-sm-5']}
                       required
                    />
                </div>
            )
        }
        else {
            var securityQA = (
                <fieldset>
                    <div className="form-group row">
                        <label
                            className="control-label col-sm-3"
                            data-required="true"
                            htmlFor="bank-deposit-payment_mode">
                            {__("Votre question secrète")}
                            <span className="required-symbol">&nbsp;*</span>
                        </label>
                        <div className="col-sm-5 bank-deposit" data-eusko="bank-deposit-payment_mode">
                            <SimpleSelect
                                ref="select"
                                value={this.state.question}
                                options={this.state.predefinedQuestions}
                                placeholder={__("Choisissez votre question secrète")}
                                theme="bootstrap3"
                                autocomplete="off"
                                onValueChange={this.questionOnValueChange}
                                renderValue={SelectizeUtils.selectizeRenderValue}
                                renderOption={SelectizeUtils.selectizeNewRenderOption}
                                required
                                onBlur={this.enableButton}
                                renderNoResultsFound={SelectizeUtils.selectizeNoResultsFound}
                                required
                            />
                        </div>
                    </div>
                    {inputCustomQuestion}
                    <Input
                        name="answer"
                        data-eusko="securityquestion-answer"
                        value={this.state.answer ? this.state.answer : ""}
                        label={__("Votre réponse")}
                        type="text"
                        placeholder={__("Votre réponse")}
                        validations="isExisty"
                        validationErrors={{
                            isExisty: __("Réponse invalide."),
                        }}
                        help={__("Votre réponse n'est pas sensible à la casse.")}
                        onChange={this.answerOnValueChange}
                        elementWrapperClassName={[{'col-sm-9': false}, 'col-sm-5']}
                        required
                    />
                </fieldset>
            )
        }

        return (
            <div className="row">
                <h2 style={{marginTop: 0}} className="margin-bottom">{__("Votre mot de passe")}</h2>
                <SetPasswordForm
                    onValidSubmit={this.submitForm}
                    onInvalid={this.invalidateStdFields}
                    onValid={this.validateStdFields}
                    ref="changepassword">
                    <fieldset>
                         <Input
                            name="password"
                            data-eusko="changepassword-password"
                            value={this.state.password ? this.state.password : ''}
                            label={__("Nouveau mot de passe")}
                            type="password"
                            placeholder={__("Votre nouveau mot de passe")}
                            validations="equalsField:confirmPassword,minLength:4,maxLength:12"
                            validationErrors={{
                                equalsField: __("Les mots de passe ne correspondent pas."),
                                minLength: __("Un mot de passe doit faire entre 4 et 12 caractères."),
                                maxLength: __("Un mot de passe doit faire entre 4 et 12 caractères.")
                            }}
                            onChange={this.onFormChange}
                            elementWrapperClassName={[{'col-sm-9': false}, 'col-sm-5']}
                            required
                        />
                        <Input
                            name="confirmPassword"
                            data-eusko="changepassword-confirmPassword"
                            value={this.state.confirmPassword ? this.state.confirmPassword : ''}
                            label={__("Confirmer le nouveau mot de passe")}
                            type="password"
                            placeholder={__("Confirmation de votre nouveau mot de passe")}
                            validations="equalsField:password,minLength:4,maxLength:12"
                            validationErrors={{
                                equalsField: __("Les mots de passe ne correspondent pas."),
                                minLength: __("Un mot de passe doit faire entre 4 et 12 caractères."),
                                maxLength: __("Un mot de passe doit faire entre 4 et 12 caractères.")
                            }}
                            onChange={this.onFormChange}
                            elementWrapperClassName={[{'col-sm-9': false}, 'col-sm-5']}
                            required
                        />
                        <h2 style={{marginTop: 30, marginBottom: 10}}>{__("Votre question secrète")}</h2>
                        <span className="help-block margin-bottom">
                                {__("Celle-ci vous permettra de retrouver votre mot de passe en toute sécurité.")}
                        </span>
                        {securityQA}
                    </fieldset>
                    <fieldset>
                        <Row layout="horizontal" elementWrapperClassName="margin-top-ten col-sm-5">
                            {messageData}
                        </Row>
                        <Row layout="horizontal">
                            <input
                                name="submit"
                                data-eusko="changepassword-submit"
                                type="submit"
                                defaultValue={__("Enregistrer")}
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
        )
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
document.title = pageTitle + " - " + __("Compte en ligne") + " " + document.title