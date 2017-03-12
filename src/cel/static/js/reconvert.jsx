import {
    fetchAuth,
    getAPIBaseURL,
    SelectizeUtils,
} from 'Utils'
import ModalEusko from 'Modal'
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
            isModalOpen: false,
            canSubmit: false,
            debit: {    
                label: undefined,
                value: undefined,
            },
            
            debitList: undefined,
            credit: undefined,
            amount: '',
            description: '',
            accountList: Array(),
        }
    },
    openModal() {
        this.setState({isModalOpen: true})
    },

    hideModal() {
        this.setState({isModalOpen: false})
    },

    getModalElements(modalMode, amount=null) {
        if (modalMode == 'delete') {
            var modalBody = <p>{__("Etes-vous sûr de vouloir reconvertir ") + amount + (" eusko en € ?")}</p>
            var modalTitle = __("Validation de la reconversion")
            var validateLabel = __("Valider")
        }
        this.setState({modalBody: modalBody, modalMode: modalMode,
                       modalTitle: modalTitle, validateLabel: validateLabel}, this.openModal)
    },

    componentDidMount() {

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
        if (this.state.debit && this.state.amount && this.state.description)
        {
            this.enableButton()
        }
        else
            this.disableButton()
    },

    submitForm() {
        this.disableButton()

        // We push fields into the data object that will be passed to the server
        var data = {debit: this.state.debit.value,
                    amount: this.state.amount,
                    description: this.state.description
        }
        var computeForm = (data) => {
            this.hideModal()
            this.refs.container.success(
                __("La reconversion a bien été enregistrée."),
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
            this.hideModal()
            console.log(this.props.url, err)
            this.refs.container.error(
                __("Une erreur s'est produite lors de la reconversion, vérifiez le solde de votre compte !"),
                "",
                {
                    timeOut: 3000,
                    extendedTimeOut: 10000,
                    closeButton:true
                }
            )
        }
        fetchAuth(getAPIBaseURL + "reconvert-eusko/", 'POST', computeForm, data, promiseError)
    },

    validateReconvert(amount) {
        this.getModalElements('delete', amount)
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
                        <div className="col-sm-1">
                        eusko
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
                        <input
                            name="submit"
                            data-eusko="one-time-transfer-form-submit"
                            type="submit"
                            defaultValue={__("Valider")}
                            className="btn btn-success col-sm-offset-2 col-md-offset-6"
                            formNoValidate={true}
                            onClick={() => this.validateReconvert(this.state.amount)}
                            disabled={!this.state.canSubmit}
                        />
                    </div>
                </div>
                <ToastContainer ref="container"
                    toastMessageFactory={ToastMessageFactory}
                    className="toast-top-right toast-top-right-navbar"
                />
                <ModalEusko hideModal={this.hideModal}
                            isModalOpen={this.state.isModalOpen}
                            modalBody={this.state.modalBody}
                            modalTitle={this.state.modalTitle}
                            validateLabel={this.state.validateLabel}
                            onValidate={this.submitForm}
                            staticContent={false}
                            btnValidateClass="btn-success"
                            btnValidateEnabled={true}
                            />
            </div>
        )
    }
})


ReactDOM.render(
    <Ponctuel ponctuelListUrl={getAPIBaseURL + "beneficiaires/"} />,
    document.getElementById('reconvert')
)
document.title = __("Mon compte") + ": " + __("Reconversion") + " - " + __("Compte en ligne") + " " + document.title
