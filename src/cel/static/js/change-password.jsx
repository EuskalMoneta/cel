import {
    fetchAuth,
    getAPIBaseURL,
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

const MemberChangePasswordForm = React.createClass({

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

const MemberSecurityQuestionForm = React.createClass({

    mixins: [FRC.ParentContextMixin],

    propTypes: {
        children: React.PropTypes.node
    },

    render() {
        return (
            <Formsy.Form
                className={this.getLayoutClassName()}
                {...this.props}
                ref="securityquestion"
            >
                {this.props.children}
            </Formsy.Form>
        );
    }
});

class MemberChangePasswordPage extends React.Component {

    constructor(props) {
        super(props);

        // Default state
        this.state = {
            canSubmit: false,
            question: false,
            answer: false,
            canSubmitAnswer: false,
            displayCustomQuestion: false,
            customQuestion: undefined,
            selectedQuestion: undefined,
            predefinedQuestions: undefined,
        }
    }

    enableButton = () => {
        this.setState({canSubmit: true})
    }

    disableButton = () => {
        this.setState({canSubmit: false})
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
                this.disableButtonAnswer()
            }
        }
        else {
            this.disableButtonAnswer()
        }
    }

    disableButtonAnswer = () => {
        this.setState({canSubmitAnswer: false})
    }

    componentDidMount = () => {
        var getSelectedQuestion = (data) => {
            var selectedQuestion = undefined
            if (!_.isEmpty(data)) {
                var selectedQuestion = {label: data.question, value: data.id}
            }

            this.setState({selectedQuestion: selectedQuestion})
        }
        fetchAuth(getAPIBaseURL + "securityqa/me/", 'GET', getSelectedQuestion)

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
        fetchAuth(getAPIBaseURL + "securityqa/", 'GET', getPredefinedQuestions)
    }

    submitForm = (data) => {
        this.disableButton()
        data.cyclos_mode = 'cel'

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

            setTimeout(() => window.location.assign("/logout"), 3000)
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
        fetchAuth(this.props.url, this.props.method, computeForm, data, promiseError)
    }

    submitFormAnswer = (data) => {
        if (this.state.displayCustomQuestion && this.state.customQuestion) {
            var data = {answer: this.state.answer,
                        question_id: this.state.question.value,
                        question_text: this.state.customQuestion}
        }
        else if (!this.state.displayCustomQuestion) {
            var data = {answer: this.state.answer,
                        question_id: this.state.question.value}
        }

        this.disableButtonAnswer()

        var computeForm = (data) => {
            this.refs.container.success(
                __("L'enregistrement de la question secrète s'est déroulé correctement."),
                "",
                {
                    timeOut: 5000,
                    extendedTimeOut: 10000,
                    closeButton:true
                }
            )

            var getSelectedQuestion = (data) => {
                var selectedQuestion = undefined
                if (!_.isEmpty(data)) {
                    var selectedQuestion = {label: data.question, value: data.id}
                }

                this.setState({selectedQuestion: selectedQuestion})
            }
            fetchAuth(getAPIBaseURL + "securityqa/me/", 'GET', getSelectedQuestion)
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
        fetchAuth(getAPIBaseURL + "securityqa/", "POST", computeForm, data, promiseError)
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

    render = () =>
    {
        if (this.state.displayCustomQuestion) {
            var inputCustomQuestion = (
                <Input
                 name="question"
                 data-eusko="securityquestion-question"
                 value={this.state.customQuestion ? this.state.customQuestion : ""}
                 label={__("Votre question")}
                 type="text"
                 placeholder={__("Votre question")}
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

        if (this.state.selectedQuestion) {
            var questionForm = (
                <div>
                    <h2 className="margin-top-ten margin-bottom">{__("Votre question secrète")}</h2>
                    <p>
                        <span className="glyphicon glyphicon-ok member-status-ok"></span>
                        {__("Vous avez déjà enregistré votre question secrète.")}
                    </p>
                </div>
            )
        }
        else {
            var questionForm = (
                <div>
                    <h2 className="margin-top-ten margin-bottom">{__("Votre question secrète")}</h2>
                    <MemberSecurityQuestionForm
                        onValidSubmit={this.submitFormAnswer}
                        onInvalid={this.disableButtonAnswer}
                        onValid={this.enableButtonAnswer}
                        ref="securityquestion">
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
                                        placeholder={__("Votre question secrète")}
                                        theme="bootstrap3"
                                        autocomplete="off"
                                        onValueChange={this.questionOnValueChange}
                                        renderValue={SelectizeUtils.selectizeRenderValue}
                                        renderOption={SelectizeUtils.selectizeNewRenderOption}
                                        required
                                        onBlur={this.enableButtonAnswer}
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
                        <fieldset>
                            <Row layout="horizontal">
                                <input
                                    name="securityquestion-submit"
                                    data-eusko="securityquestion-submit"
                                    type="submit"
                                    defaultValue={__("Enregistrer la question secrète")}
                                    className="btn btn-success"
                                    formNoValidate={true}
                                    disabled={!this.state.canSubmitAnswer}
                                />
                            </Row>
                        </fieldset>
                    </MemberSecurityQuestionForm>
                </div>
            )
        }

        return (
            <div className="row">
                <h2 className="margin-top-ten margin-bottom">{__("Votre mot de passe")}</h2>
                <MemberChangePasswordForm
                    onValidSubmit={this.submitForm}
                    onInvalid={this.disableButton}
                    onValid={this.enableButton}
                    ref="changepassword">
                    <fieldset>
                         <Input
                            name="old_password"
                            data-eusko="changepassword-old_password"
                            value=""
                            label={__("Mot de passe actuel")}
                            type="password"
                            placeholder={__("Votre mot de passe")}
                            validations="isExisty"
                            validationErrors={{
                                isExisty: __("Mot de passe invalide."),
                            }}
                            elementWrapperClassName={[{'col-sm-9': false}, 'col-sm-5']}
                            required
                        />
                         <Input
                            name="new_password"
                            data-eusko="changepassword-new_password"
                            value=""
                            label={__("Nouveau mot de passe")}
                            type="password"
                            placeholder={__("Votre nouveau mot de passe")}
                            validations={{
                                equalsField: "confirm_password",
                                minLength: 4,
                                maxLength: 12,
                                matchRegexp: /^[a-zA-Z0-9!@#\$%\\"^\&*\)\(`"'()*+,-.\/:;<=>?[\]_{}~+=_]+$/
                            }}
                            validationErrors={{
                                equalsField: __("Les mots de passe ne correspondent pas."),
                                minLength: __("Un mot de passe doit faire entre 4 et 12 caractères."),
                                maxLength: __("Un mot de passe doit faire entre 4 et 12 caractères."),
                                matchRegexp: __("Votre mot de passe contient un caractère interdit.")
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
                            validations={{
                                equalsField: "new_password",
                                minLength: 4,
                                maxLength: 12,
                                matchRegexp: /^[a-zA-Z0-9!@#\$%\\"^\&*\)\(`"'()*+,-.\/:;<=>?[\]_{}~+=_]+$/
                            }}
                            validationErrors={{
                                equalsField: __("Les mots de passe ne correspondent pas."),
                                minLength: __("Un mot de passe doit faire entre 4 et 12 caractères."),
                                maxLength: __("Un mot de passe doit faire entre 4 et 12 caractères."),
                                matchRegexp: __("Votre mot de passe contient un caractère interdit.")
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
                </MemberChangePasswordForm>

                {questionForm}

                <ToastContainer ref="container"
                                toastMessageFactory={ToastMessageFactory}
                                className="toast-top-right toast-top-right-navbar" />
            </div>
        );
    }
}


ReactDOM.render(
    <MemberChangePasswordPage url={getAPIBaseURL + "change-password/"} method="POST" />,
    document.getElementById('change-password')
)
document.title = __("Mon profil") + ": " + __("Mot de passe") + " - " + __("Compte en ligne") + " " + document.title