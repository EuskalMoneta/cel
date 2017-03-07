import {
    fetchAuth,
    getAPIBaseURL,
    getCurrentLang,
    SelectizeUtils,
} from 'Utils'

const {
    Input,
    RadioGroup,
} = FRC

import ReactSelectize from 'react-selectize'
const SimpleSelect = ReactSelectize.SimpleSelect

const {
    ToastContainer
} = ReactToastr
const ToastMessageFactory = React.createFactory(ReactToastr.ToastMessage.animation)

const OptionsForm = React.createClass({

    mixins: [FRC.ParentContextMixin],

    propTypes: {
        children: React.PropTypes.node
    },

    render() {
        return (
            <Formsy.Form
                className={this.getLayoutClassName()}
                {...this.props}
                ref="profil-form"
            >
                {this.props.children}
            </Formsy.Form>
        );
    }
})

const Options = React.createClass({

    getInitialState() {
        return {
            memberLogin: window.config.userName,
            member: null,
            canSubmit: false,
            validFields: false,
            options_recevoir_actus: false,
            options_langue: 'fr',
            langs: [{label: 'Français', value: 'fr'}, {label: 'Euskara', value: 'eu'}],
        }
    },

    enableButton() {
        this.setState({canSubmit: true})
    },

    disableButton() {
        this.setState({canSubmit: false})
    },

    validateForm() {
        if (this.state.options_langue &&
            this.state.options_recevoir_actus &&
            (this.state.options_recevoir_actus == "0" || this.state.options_recevoir_actus == "1"))
        {
            this.enableButton()
        }
        else
            this.disableButton()
    },

    langOnValueChange(item) {
        this.setState({options_langue: item}, this.validateForm)
    },

    recevoirActusOnValueChange(item, value) {
        this.setState({options_recevoir_actus: value}, this.validateForm)
    },

    componentDidMount() {
        // Get member data
        var computeMemberData = (member) => {
            var options_langue = _.findWhere(this.state.langs, {value: member[0].array_options.options_langue})
            if (!options_langue) {
                var options_langue = {label: 'Français', value: 'fr'}
            }

            this.setState({member: member[0],
                           options_recevoir_actus: member[0].array_options.options_recevoir_actus == '1' ? '1' : '0',
                           options_langue: options_langue,
                          }, this.validateForm)

        }
        fetchAuth(this.props.url + this.state.memberLogin, 'get', computeMemberData)
    },

    submitForm() {
        this.disableButton()
        // We push fields into the data object that will be passed to the server
        var data = {}
        data.options_recevoir_actus = this.state.options_recevoir_actus
        data.options_langue = this.state.options_langue.value

        var computeForm = (data) => {
            this.refs.container.success(
                __("Les changement de vos Options ont bien été pris en compte."),
                "",
                {
                    timeOut: 3000,
                    extendedTimeOut: 10000,
                    closeButton:true
                }
            )
        }

        var promiseError = (err) => {
            // Error during request, or parsing NOK :(
            this.enableButton()

            console.log(this.props.url, err)
            this.refs.container.error(
                __("Une erreur s'est produite lors de la modification de vos options !"),
                "",
                {
                    timeOut: 3000,
                    extendedTimeOut: 10000,
                    closeButton:true
                }
            )
        }
        fetchAuth(getAPIBaseURL + "members/" + this.state.member.id + "/", 'PATCH', computeForm, data, promiseError)
    },


    render() {
        return (
                <div className="row">
                    <OptionsForm ref="profil-form">
                        <fieldset>
                            <RadioGroup
                                name="options_recevoir_actus"
                                data-eusko="options-recevoir-actus"
                                type="inline"
                                value={this.state.options_recevoir_actus}
                                label={__("Souhaite être informé des actualités liées à l'eusko")}
                                help={__("Vous recevrez un à deux mails par semaine.")}
                                options={[{value: '1', label: __('Oui')},
                                          {value: '0', label: __('Non')}
                                ]}
                                onChange={this.recevoirActusOnValueChange}
                                elementWrapperClassName={[{'col-sm-9': false}, 'col-sm-4']}
                                required
                            />
                            <div className="form-group row">
                                <label
                                    className="control-label col-sm-3"
                                    data-required="true"
                                    htmlFor="options-lang">
                                    {__("Langue")}
                                    <span className="required-symbol">&nbsp;*</span>
                                </label>
                                <div className="col-sm-5 options" data-eusko="options-lang">
                                    <SimpleSelect
                                        ref="select"
                                        value={this.state.options_langue}
                                        options={this.state.langs}
                                        placeholder={__("Langue")}
                                        autocomplete="off"
                                        theme="bootstrap3"
                                        onValueChange={this.langOnValueChange}
                                        renderOption={SelectizeUtils.selectizeNewRenderOption}
                                        renderValue={SelectizeUtils.selectizeRenderValue}
                                        onBlur={this.validateForm}
                                        renderNoResultsFound={SelectizeUtils.selectizeNoResultsFound}
                                        required
                                    />
                                </div>
                            </div>
                        </fieldset>
                        <div className="row profil-div-margin-left margin-top">
                            <input
                                name="submit"
                                data-eusko="options-submit"
                                type="submit"
                                defaultValue={__("Enregistrer")}
                                className="btn btn-success col-sm-offset-5"
                                formNoValidate={true}
                                onClick={() => this.submitForm()}
                                disabled={!this.state.canSubmit}
                            />
                        </div>
                    </OptionsForm>
                    <ToastContainer ref="container"
                        toastMessageFactory={ToastMessageFactory}
                        className="toast-top-right toast-top-right-navbar"
                    />
                </div>
            )
        }
    }
)

ReactDOM.render(
    <Options url={getAPIBaseURL + "members/?login="} postUrl={getAPIBaseURL + "members/"} />,
    document.getElementById('change-automatique')
)
document.title = __("Mon profil") + ": " + __("Options") + " - " + __("Compte en ligne") + " " + document.title