import {
    fetchAuth,
    getAPIBaseURL,
    SelectizeUtils,
} from 'Utils'

import {
    BootstrapTable,
    TableHeaderColumn,
} from 'react-bootstrap-table'
import 'node_modules/react-bootstrap-table/dist/react-bootstrap-table.min.css'
const {
    Input,
    RadioGroup,
    Row,
    Textarea,
} = FRC

import ReactSelectize from 'react-selectize'
const SimpleSelect = ReactSelectize.SimpleSelect

const {
    ToastContainer,
} = ReactToastr
const ToastMessageFactory = React.createFactory(ReactToastr.ToastMessage.animation)

const HistoricalForm = React.createClass({

    mixins: [FRC.ParentContextMixin],

    propTypes: {
        children: React.PropTypes.node
    },

    render() {
        return (
            <Formsy.Form
                className={this.getLayoutClassName()}
                {...this.props}
                ref="historical-form"
            >
                {this.props.children}
            </Formsy.Form>
        );
    }
})

var Ponctuel = React.createClass({

    getInitialState() {
        return {
            allAccount: undefined,
            beneficiaires: undefined,
            beneficiairesList: undefined,
            canSubmit: false,
            debit: {
                label: undefined,
                value: undefined,
            },
            debitList: undefined,
            credit: undefined,
            amount: undefined,
            description: '',
            accountList: Array(),
        }
    },

    componentDidMount() {
        var computeBeneficiairesList = (data) => {
            var res = _.chain(data.results)
                .map(function(item){ return {label: item.cyclos_name + ' - ' + item.cyclos_account_number, value:item.cyclos_id} })
                .sortBy(function(item){ return item.label })
                .value()
            this.setState({beneficiairesList: res})
        }
        fetchAuth(this.props.ponctuelListUrl, 'GET', computeBeneficiairesList)

        var computeDebitList = (data) => {
            var res = _.chain(data.result)
                .map(function(item){ return {label: item.number, value:item.owner.id} })
                .sortBy(function(item){ return item.label })
                .value()
            this.setState({allAccount: data.result});
            this.setState({debitList: res}, this.setDebitData)
        }
        fetchAuth(getAPIBaseURL + "account-summary-adherents/", 'GET', computeDebitList)
    },
    setDebitData() {
        if (this.state.allAccount) {
            if (this.state.allAccount.length == 1 ) {
                this.setState({debit:  {label:this.state.allAccount[0].number, value:this.state.allAccount[0].owner.id} });
            }
        }
    },

    beneficiairesOnValueChange(item) {
        if (item) {
            this.setState({beneficiaires: item})
        }
        else
            this.setState({beneficiaires: undefined})
    },

    debitOnValueChange(item) {
        if (item) {
            this.setState({debit: item})
        }
        else
            this.setState({debit: undefined})
    },

    amountOnValueChange(event, value) {
        var valueToTest = value.replace(',','.')
        if(isNaN(valueToTest))
        {
            this.refs.container.error(
                __("Attention, la valeur saisie pour le montant est incorrecte !"),
                "",
                {
                    timeOut: 5000,
                    extendedTimeOut: 10000,
                    closeButton:true
                }
            )
        }
        else
        {
            this.setState({amount: value}, this.validateForm)
        }
    },

    descriptionOnValueChange(event, value) {
        this.setState({description: value}, this.validateForm)
    },

    enableButton() {
        this.setState({canSubmit: true})
    },

    disableButton() {
        this.setState({canSubmit: false})
    },

    validateForm() {
        if (this.state.debit && this.state.beneficiaires && this.state.amount && this.state.description)
        {
            this.enableButton()
        }
        else
            this.disableButton()
    },

    submitForm() {
        this.disableButton()
        debugger
        // We push fields into the data object that will be passed to the server
        var data = {beneficiaire: this.state.beneficiaires.value,
                    debit: this.state.debit.value,
                    amount: this.state.amount,
                    description: this.state.description
        }

        var computeForm = (data) => {
            this.refs.container.success(
                __("Le transfert a bien été effectué."),
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
                __("Une erreur s'est produite lors du transfert, vérifiez le solde de votre compte !"),
                "",
                {
                    timeOut: 3000,
                    extendedTimeOut: 10000,
                    closeButton:true
                }
            )
        }
        fetchAuth(getAPIBaseURL + "one-time-transfer/", 'POST', computeForm, data, promiseError)
    },

    render() {
        if (this.state.allAccount) {
            if (this.state.allAccount.length == 1 )
            {
                var debitData = (
                    <div className="form-group row">
                        <div className="col-sm-1"></div>
                        <label
                            className="control-label col-sm-5"
                            htmlFor="virement-debit">
                            {__("Compte à débiter")}
                        </label>
                        <div className="col-sm-1"></div>
                        <div className="col-sm-4 virement-debit" data-eusko="virement-debit">
                        <label className="control-label solde-history-label">
                            {this.state.debit.label}
                        </label>
                        </div>
                    </div>
                )

            }
            else
            {
                var debitData = (
                    <div className="form-group row">
                        <div className="col-sm-1"></div>
                        <label
                            className="control-label col-sm-2"
                            htmlFor="virement-debit">
                            {__("Compte à débiter")}
                        </label>
                        <div className="col-sm-1"></div>
                        <div className="col-sm-4 virement-debit" data-eusko="virement-debit">
                            <SimpleSelect
                                ref="select"
                                value={this.state.debit}
                                options={this.state.debitList}
                                placeholder={__("Compte à débiter")}
                                theme="bootstrap3"
                                autocomplete="off"
                                onValueChange={this.debitOnValueChange}
                                renderValue={SelectizeUtils.selectizeRenderValue}
                                renderOption={SelectizeUtils.selectizeNewRenderOption}
                                onBlur={this.validateForm}
                                required
                            >
                            </SimpleSelect>
                        </div>
                    </div>
                )
            }
        }

        return (
            <div className="row">
                <div className="col-md-10 col-md-offset-1">
                    
                         { debitData }
                    
                    <div className="form-group row">
                        <div className="col-sm-1"></div>
                        <label
                            className="control-label col-sm-2"
                            htmlFor="virement-credit">
                            {__("Compte bénéficiaire")}
                        </label>
                        <div className="col-sm-1"></div>
                        <div className="col-sm-4 virement-credit" data-eusko="virement-credit">
                            <SimpleSelect
                                ref="select"
                                value={this.state.beneficiaires}
                                options={this.state.beneficiairesList}
                                placeholder={__("Compte à créditer")}
                                theme="bootstrap3"
                                autocomplete="off"
                                onValueChange={this.beneficiairesOnValueChange}
                                renderValue={SelectizeUtils.selectizeRenderValue}
                                renderOption={SelectizeUtils.selectizeNewRenderOption}
                                onBlur={this.validateForm}
                                required
                            >
                            </SimpleSelect>
                        </div>
                    </div>
                    <div className="form-group row">
                        <div className="col-sm-1"></div>
                        <label
                            className="control-label col-sm-2"
                            htmlFor="virement-amount">
                            {__("Montant")}
                        </label>
                        <div className="col-sm-5">
                            <HistoricalForm ref="historical-form">
                                <Input
                                    name="montant"
                                    data-eusko="virement-amount"
                                    onChange={this.amountOnValueChange}
                                    value = {this.state.amount}
                                />
                            </HistoricalForm>
                        </div>
                    </div>
                    <div className="form-group row">
                        <div className="col-sm-1"></div>
                        <label
                            className="control-label col-sm-2"
                            htmlFor="virement-description">
                            {__("Description")}
                        </label>
                        <div className="col-sm-5">
                            <HistoricalForm ref="historical-form">
                                <Input
                                    name="description"
                                    data-eusko="virement-description"
                                    onChange={this.descriptionOnValueChange}
                                    value = {this.state.description}
                                />
                            </HistoricalForm>
                        </div>
                    </div>
                    <div className="row profil-div-margin-left margin-top">
                        <a href="/" className="btn btn-default col-sm-offset-3">
                           {__("Annuler")}
                        </a>
                        <input
                            name="submit"
                            data-eusko="one-time-transfer-form-submit"
                            type="submit"
                            defaultValue={__("Valider")}
                            className="btn btn-success col-sm-offset-2"
                            formNoValidate={true}
                            onClick={() => this.submitForm()}
                            disabled={!this.state.canSubmit}
                        />
                    </div>
                </div>
                <ToastContainer ref="container"
                    toastMessageFactory={ToastMessageFactory}
                    className="toast-top-right toast-top-right-navbar"
                />
            </div>
        )
    }
})


ReactDOM.render(
    <Ponctuel ponctuelListUrl={getAPIBaseURL + "beneficiaires/"} />,
    document.getElementById('ponctuel')
)
document.title = __("Mes virements") + ": " + __("Virement ponctuel") + " - " + __("Compte en ligne") + " " + document.title