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
    Row,
} = FRC

import ReactSelectize from 'react-selectize'
const SimpleSelect = ReactSelectize.SimpleSelect

const {
    ToastContainer,
} = ReactToastr
const ToastMessageFactory = React.createFactory(ReactToastr.ToastMessage.animation)

const VirementPonctuelForm = React.createClass({

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
            beneficiaires: undefined,
            beneficiairesList: undefined,
            canSubmit: false,
            debit: {
                label: undefined,
                value: undefined,
            },
            debitList: Array(),
            amount: undefined,
            description: '',
            isModalOpen: false,
            modalBody: Array(),
            btnValidateEnabled: false,
        }
    },

    getBeneficiairesList() {
        var computeBeneficiairesList = (data) => {
            var res = _.chain(data.results)
                .filter((item) => {
                    // We don't want our own account to be in the beneficiairesList
                    return this.state.debit.label != item.cyclos_account_number
                })
                .map((item) => { return {label: item.cyclos_name + ' - ' + item.cyclos_account_number, value:item.cyclos_id} })
                .sortBy((item) => { return item.label })
                .value()

            this.setState({beneficiairesList: res})
        }
        fetchAuth(this.props.ponctuelListUrl, 'GET', computeBeneficiairesList)
    },

    componentDidMount() {
        var computeDebitList = (data) => {
            var res = _.chain(data.result)
                .map((item) => { return {label: item.number, value:item.owner.id} })
                .sortBy((item) => { return item.label })
                .value()

            if (_.isEmpty(res))
                var state = {debitList: res}
            else
                var state = {debitList: res, debit: res[0]}

            this.setState(state, this.getBeneficiairesList)
        }
        fetchAuth(getAPIBaseURL + "account-summary-adherents/", 'GET', computeDebitList)
    },

    beneficiairesOnValueChange(item) {
        if (item)
            this.setState({beneficiaires: item})
        else
            this.setState({beneficiaires: undefined})
    },

    debitOnValueChange(item) {
        if (item)
            this.setState({debit: item})
        else
            this.setState({debit: {label: undefined, value: undefined} })
    },

    amountOnValueChange(event, value) {
        var amount = value.replace('.', ',')
        this.setState({amount: amount}, this.validateForm)
    },

    descriptionOnValueChange(event, value) {
        this.setState({description: value}, this.validateForm)
    },

    openModal() {
        this.setState({isModalOpen: true})
    },

    hideModal() {
        this.setState({isModalOpen: false})
    },

    getModalElements() {
        var modalBody = Array()
        modalBody.push({'label': __('Compte à débiter'), order: 1, 'value': this.state.debit.label},
                       {'label': __('Compte bénéficiaire'), order: 2, 'value': this.state.beneficiaires.label},
                       {'label': __('Montant'), order: 3, 'value': this.state.amount},
                       {'label': __('Description'), order: 4, 'value': this.state.description})

        this.setState({modalBody: modalBody}, this.openModal)
    },

    enableButton() {
        this.setState({canSubmit: true, btnValidateEnabled: true})
    },

    disableButton() {
        this.setState({canSubmit: false, btnValidateEnabled: false})
    },

    validateForm() {
        if (this.state.debit && this.state.beneficiaires && this.state.amount && this.state.description)
            this.enableButton()
        else
            this.disableButton()
    },

    submitForm() {
        this.disableButton()
        // We push fields into the data object that will be passed to the server
        var data = {beneficiaire: this.state.beneficiaires.value,
                    debit: this.state.debit.value,
                    amount: this.state.amount.replace(',', '.'),
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

            setTimeout(() => window.location.assign("/compte/synthese"), 5000)
        }

        var promiseError = (err) => {
            // Error during request, or parsing NOK(
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
        var debitData = null // if debitList is 0
        if (this.state.debitList.length == 1)
        {
            var debitData = (
                <div className="form-group row">
                    <label
                        className="control-label col-sm-3"
                        htmlFor="virement-debit">
                        {__("Compte à débiter")}
                        <span className="required-symbol">&nbsp;*</span>
                    </label>
                    <div className="col-sm-3 virement-debit" data-eusko="virement-debit">
                        <label className="control-label" style={{fontWeight: 'normal'}}>
                            {this.state.debit.label}
                        </label>
                    </div>
                </div>
            )
        }
        else if (this.state.debitList.length > 1)
        {
            var debitData = (
                <div className="form-group row">
                    <label
                        className="control-label col-sm-2"
                        htmlFor="virement-debit">
                        {__("Compte à débiter")}
                        <span className="required-symbol">&nbsp;*</span>
                    </label>
                    <div className="col-sm-3 virement-debit" data-eusko="virement-debit">
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

        return (
            <div className="row">
                <VirementPonctuelForm ref="historical-form">
                    <div className="col-md-12 col-md-offset-1">
                        {debitData}
                        <div className="form-group row">
                            <label
                                className="control-label col-sm-3"
                                htmlFor="virement-credit">
                                {__("Compte bénéficiaire")}
                                <span className="required-symbol">&nbsp;*</span>
                            </label>
                            <div className="col-sm-3" data-eusko="virement-credit">
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
                        <Input
                            name="montant"
                            data-eusko="virement-amount"
                            onChange={this.amountOnValueChange}
                            value={this.state.amount ? this.state.amount : ""}
                            label={__('Montant')}
                            type="text"
                            placeholder={__("Montant du virement")}
                            validations={{
                                matchRegexp: /^\d+(,\d{1,2})?$/
                            }}
                            validationErrors={{
                                matchRegexp: __("Montant invalide.")
                            }}
                            elementWrapperClassName={[{'col-sm-9': false}, 'col-sm-3']}
                            required
                        />
                        <Input
                            name="description"
                            data-eusko="virement-description"
                            onChange={this.descriptionOnValueChange}
                            value={this.state.description}
                            label={__('Description')}
                            type="text"
                            placeholder={__("Description du virement")}
                            validations="isExisty"
                            validationErrors={{
                               isExisty: __("Le champ description ne peut être vide.")
                            }}
                            elementWrapperClassName={[{'col-sm-9': false}, 'col-sm-3']}
                            required
                        />
                        <Row layout="horizontal">
                            <input
                                name="submit"
                                data-eusko="one-time-transfer-form-submit"
                                type="submit"
                                defaultValue={__("Valider")}
                                className="btn btn-success"
                                formNoValidate={true}
                                onClick={this.getModalElements}
                                disabled={!this.state.canSubmit}
                            />
                        </Row>
                    </div>
                </VirementPonctuelForm>
                <ToastContainer ref="container"
                    toastMessageFactory={ToastMessageFactory}
                    className="toast-top-right toast-top-right-navbar"
                />
                <ModalEusko hideModal={this.hideModal}
                            isModalOpen={this.state.isModalOpen}
                            modalBody={this.state.modalBody}
                            modalTitle={__("Confirmation du virement")}
                            onValidate={this.submitForm}
                            staticContent={false}
                            btnValidateEnabled={this.state.btnValidateEnabled}
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
