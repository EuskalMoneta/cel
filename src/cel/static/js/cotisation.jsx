import {
    fetchAuth,
    titleCase,
    getAPIBaseURL,
    isPositiveNumeric,
    getCurrentLang,
    SelectizeUtils,
} from 'Utils'

import classNames from 'classnames'

const {
    Input,
    Row
} = FRC

import ReactSelectize from 'react-selectize'
const SimpleSelect = ReactSelectize.SimpleSelect

Formsy.addValidationRule('isPositiveNumeric', isPositiveNumeric)

const CotisationForm = React.createClass({

    mixins: [FRC.ParentContextMixin],

    propTypes: {
        children: React.PropTypes.node
    },

    render() {
        return (
            <Formsy.Form
                className={this.getLayoutClassName()}
                {...this.props}
                ref="cotisation-form"
            >
                {this.props.children}
            </Formsy.Form>
        );
    }
})

const Cotisation = React.createClass({

    getInitialState() {
        return {
            memberLogin: window.config.userName,
            member: null,
            displayCustomAmount: false,
            memberType: '9',
            cotisationState: false,
            period: {    
                label: undefined,
                value: undefined,
            },
            canSubmit: false,
            selectedPrelevAuto: false,
            amount: undefined,
            amountByY: 0,
            customAmount: undefined,
            selectedOption: 0,
            month: new Date().getMonth()+1,
            year: new Date().getFullYear(),
            endMonth: moment().endOf('month').lang('fr').format("YYYY-MM-DDThh:mm"),
            beginYear: moment().startOf('year').lang('fr').format("YYYY-MM-DDThh:mm"),
            amountValid: false,
        }
    },

    componentDidMount() {
        var computeMemberData = (member) => {
            this.setState({member: member[0]})
            moment.locale(getCurrentLang)
            if (moment.unix(member[0].datefin) > moment()) {
                this.setState({cotisationState: true})
            }
            if(member[0].login.toUpperCase().startsWith('Z'))
            {
                if(member[0].type == 'Entreprise') {
                    this.setState({memberType: '10'}) // company user
                }
                else
                {
                    this.setState({memberType: '11'}) // association user
                }
            }
            else if(member[0].login.toUpperCase().startsWith('E'))
            {
                this.setState({memberType: '0'}) // single user
            }
        }
        fetchAuth(this.props.url + this.state.memberLogin, 'get', computeMemberData)

        var computeDebitList = (data) => {
            var res = _.chain(data.result)
                .map(function(item){ return item.owner.id })
                .sortBy(function(item){ return item.label })
                .value()
            this.setState({debitList: res})
        }
        fetchAuth(getAPIBaseURL + "account-summary-adherents/", 'GET', computeDebitList)
    },

    setAmount(value) {
        this.setState(value, this.ValidationCheck)
    },

    ValidationCheck() {
        if(this.state.cotisationState && this.state.memberType.toUpperCase().startsWith('1'))
        {
            if(this.state.selectedPrelevAuto && this.state.amount && this.state.period && this.state.amountValid)
            {
                this.setState({canSubmit: true})
            }
            else
            {
                this.setState({canSubmit: false})
            }
        }
        else if(this.state.cotisationState && this.state.memberType.toUpperCase().startsWith('0'))
        {
            if(this.state.selectedPrelevAuto && this.state.amount)
            {
                this.setState({canSubmit: true})
            }
            else
            {
                this.setState({canSubmit: false})
            }
        }
        else if(!this.state.cotisationState && this.state.memberType.toUpperCase().startsWith('0'))
        {
            if((this.state.selectedOption == 0 && this.state.amount) || (this.state.selectedOption == 1 && this.state.amount))
            {
                this.setState({canSubmit: true})
            }
            else
            {
                this.setState({canSubmit: false})
            }
        }
        else if(!this.state.cotisationState && this.state.memberType.toUpperCase().startsWith('1'))
        {
            if((this.state.selectedOption == 0 && this.state.amount && this.state.period.value && this.state.amountValid) || (this.state.selectedOption == 1 && this.state.amountByY != 0 && this.state.amountValid))
            {
                this.setState({canSubmit: true})
            }
            else
            {
                this.setState({canSubmit: false})
            }
        }
    },
    amountOnChange(event, value) {
        var valueToTest = value.replace(',','.')
        // update pin values
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
            this.setState({amount: value}, this.calculAmountByYears)
        }
    },

    amountByYOnChange(event, value) {
        var valueToTest = value.replace(',','.')
        // update pin values
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
            this.setState({amountByY: value, amountValid: Number(value) >= Number(60)}, this.ValidationCheck)
        }
    },

    checkboxOnChange(event, value) {
        // update pin values
        if(event.target.name == 'AllowSample') {
            this.setState({selectedPrelevAuto: event.target.checked}, this.ValidationCheck)
        }
    },
    periodOnValueChange(periodValue) {
        // update pin values
        this.setState({period:  {label: periodValue.label, value: periodValue.value}}, this.calculAmountByYears)
    },
    calculAmountByYears() {
        if (this.state.amount && this.state.period.value)
        {
            var amountByY = this.state.amount*(12/this.state.period.value)
            var amountValid = Number(amountByY) >= Number(60) ? true : false
            this.setState({amountByY: amountByY, amountValid: amountValid}, this.ValidationCheck)
        }
        else {
            this.setState({amountByY: 0, amountValid: false}, this.ValidationCheck)
        }
        
    },
    // amount
    validateAmount(field, value) {
        this.setState({customAmount: value})
        if (isPositiveNumeric(null, value) && Number(value) >= Number(20)) {
            this.setState({amount: value}, this.ValidationCheck)
        }
        else {
            this.setState({amount: undefined}, this.ValidationCheck)
        }
    },

    submitForm() {
        this.setState({canSubmit: false})
        // We push fields into the data object that will be passed to the server
        var data = {}
        // We need to verify whether we are in "saisie libre" or not
        if(this.state.amount) {
            data.options_prelevement_cotisation_montant = this.state.amount
        }
        else if(this.state.amountByY) {
            data.options_prelevement_cotisation_montant = this.state.amountByY
        }
        if(this.state.period.value) {
            data.options_prelevement_cotisation_periodicite = this.state.period.value
        }
        else{
            data.options_prelevement_cotisation_periodicite = 1
        }
        if(this.state.selectedPrelevAuto) {
            data.options_prelevement_auto_cotisation_eusko = this.state.selectedPrelevAuto
        }

        var computeForm = (data) => {
            this.refs.container.success(
                __("Les changement de vos associations parrainées ont bien été pris en compte."),
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
            console.log(this.props.url, err)
            this.refs.container.error(
                __("Une erreur s'est produite lors de la modification de vos assocation parrainées!"),
                "",
                {
                    timeOut: 3000,
                    extendedTimeOut: 10000,
                    closeButton:true
                }
            )
        }
        fetchAuth(getAPIBaseURL + "members/" + this.state.member.id + "/", 'PATCH', computeForm, data, promiseError)
        if(!this.state.cotisationState && this.state.memberType.toUpperCase().startsWith('0'))
        {
            var data2 = {}
            data2.start_date = this.state.beginYear
            data2.end_date = this.state.endMonth
            data2.amount = this.state.amount
            data2.label = 'Cotisation ' + this.state.year
            fetchAuth(getAPIBaseURL + "euskokart-subscription/", 'POST', computeForm, data2, promiseError)
        }
        else if(!this.state.cotisationState && this.state.selectedOption == 0 && this.state.memberType.toUpperCase().startsWith('1'))
        {
            var data2 = {}
            data2.start_date = this.state.beginYear
            data2.end_date = this.state.endMonth
            data2.amount = this.state.amountByY
            data2.label = 'Cotisation ' + this.state.year
            fetchAuth(getAPIBaseURL + "member-cel-subscription/", 'POST', computeForm, data2, promiseError)
        }
    },

    radioOnChange(event, value) {
        // update pin values
        if(this.state.memberType.toUpperCase().startsWith('0'))
        {
            if (event.target.value == 0)
            {
                this.setState({selectedOption: 0})
                this.setState({amountByY: undefined})
                this.setState({canSubmit: false})
            }
            else if (event.target.value == 1)
            {
                this.setState({selectedOption: 1})
                this.setState({amountByY: undefined})
                this.setState({amount: undefined})
                this.setState({canSubmit: false})
            }
        }
        else if(this.state.memberType.toUpperCase().startsWith('1'))
        {
            if (event.target.value == 0)
            {
                this.setState({selectedOption: 0})
                this.setState({displayCustomAmount2: false})
                this.setState({customAmount: undefined})
                this.setState({canSubmit: false})
            }
            else if (event.target.value == 1)
            {
                this.setState({selectedOption: 1})
                this.setState({displayCustomAmount: false})
                this.setState({customAmount: undefined})
                this.setState({canSubmit: false})
            }
            this.buttonResetChoice()
        }
    },

    buttonResetChoice() {
        this.setState({buttonBasRevenusActivated: false})
        this.setState({buttonClassiqueActivated: false})
        this.setState({buttonSoutienActivated: false})
        this.setState({buttonBasRevenusActivated2: false})
        this.setState({buttonClassiqueActivated2: false})
        this.setState({buttonSoutienActivated2: false})
    },

    render() {
        var greySimpleSelect = classNames({
            'grey-back': this.state.selectedOption,
        })

        var buttonBasRevenusClass = classNames({
            "btn": true,
            "btn-default": !this.state.buttonBasRevenusActivated,
            "btn-info-inverse": this.state.buttonBasRevenusActivated,
        })

        var buttonClassiqueClass = classNames({
            "btn": true,
            "btn-default": !this.state.buttonClassiqueActivated,
            "btn-info-inverse": this.state.buttonClassiqueActivated,
        })

        var buttonSoutienClass = classNames({
            "btn": true,
            "btn-default": !this.state.buttonSoutienActivated,
            "btn-info-inverse": this.state.buttonSoutienActivated,
        })

        var divCustomAmountClass = classNames({
            'form-group row': true,
            'hidden': !this.state.displayCustomAmount,
            'has-error has-feedback': this.state.amountInvalid,
        })

        var buttonBasRevenusClass2 = classNames({
            "btn": true,
            "btn-default": !this.state.buttonBasRevenusActivated2,
            "btn-info-inverse": this.state.buttonBasRevenusActivated2,
        })

        var buttonClassiqueClass2 = classNames({
            "btn": true,
            "btn-default": !this.state.buttonClassiqueActivated2,
            "btn-info-inverse": this.state.buttonClassiqueActivated2,
        })

        var buttonSoutienClass2 = classNames({
            "btn": true,
            "btn-default": !this.state.buttonSoutienActivated2,
            "btn-info-inverse": this.state.buttonSoutienActivated2,
        })

        var divCustomAmountClass2 = classNames({
            'form-group row': true,
            'hidden': !this.state.displayCustomAmount2,
            'has-error has-feedback': this.state.amountInvalid,
        })

        moment.locale(getCurrentLang)
        if (this.state.member) {
            var dateEndSub = moment.unix(this.state.member.datefin).format('DD MMMM YYYY');
            // Whether or not, we have an up-to-date member subscription
            if (this.state.cotisationState) {
                var memberStatus = (
                    <div className="font-member-status">
                        <span className="glyphicon glyphicon-ok member-status-ok"></span>
                        <span className="member-status-text" data-eusko="profil-status">
                            {__("À jour")}
                        </span>
                        <span className="member-status-date">({dateEndSub})</span>
                    </div>
                )

                var memberStatusUpToDate = true
            }
            else {
                var memberStatus = (
                    <div className="font-member-status">
                        <span className="glyphicon glyphicon-remove member-status-nok"></span>
                        <span className="member-status-text" data-eusko="profil-status">
                            {__("Pas à jour")}
                        </span>
                        <span className="member-status-date">({dateEndSub})</span>
                    </div>
                )

                var memberStatusUpToDate = false
            }
        }
        else
            return null
        if(this.state.memberType.toUpperCase().startsWith('1')) {
            if(this.state.memberType == '10') {
                var cotisation_info = (
                    <span> 
                    {__("Entreprise de 0 salarié et de moins de 2 ans d’existence = 5 € / eusko par mois")}<br/>
                    {__("Entreprise de 0 salarié et de plus de 2 ans d’existence = de 7 à 10 € / eusko par mois")}<br/>
                    {__("Entreprise de 1 à 5 salariés inclus (équivalent temps plein) = de 7 à 10 € / eusko par mois")}<br/>
                    {__("Entreprises de plus de 5 salariés : de 12 à 20 € / eusko par mois")}<br/><br/>
                    </span>
                ) 
            }
            else
            {
                var cotisation_info = (
                    <span> 
                    {__("Cotisation annuelle :")}<br/><br/> 
                    {__("de 10 à 100 € / eusko ou plus, selon les possiblités de l'association.")}<br/><br/>
                    </span>
                ) 
            }
        }
        else {
            var cotisation_info = (
                <span> 
                {__("Cotisation annuelle :")}<br/><br/>
                {__("5 € / eusko (bas revenus)")}<br/>
                {__("10 € / eusko (cotisation normale)")}<br/>
                {__("20 € / eusko ou plus (cotisation de soutien)")}<br/><br/>
                </span>
                ) 
        }
        if (this.state.cotisationState) {
            if(this.state.memberType.toUpperCase().startsWith('1')) {
                var auto_prelev_auto = (
                    <span>
                        <div className="form-group row">
                            <div className="col-sm-5">
                                <h2>Prélèvement de la cotisation</h2>
                            </div>
                        </div>
                        <div className="row">
                            <div className="row">
                                <div className="col-sm-1 col-md-offset-1">
                                    <input type="checkbox" name="AllowSample" checked={this.state.selectedPrelevAuto} onChange={this.checkboxOnChange} style={{float:'right'}}/>
                                </div>
                                <div className="col-sm-9" style={{marginBottom: 15}}>
                                {__("J'autorise Euskal Moneta à prélever automatiquement ma cotisation sur mon compte Eusko, selon l'échéancier ci-dessous.")}
                                </div>
                            </div>
                            <Input
                                name="amount"
                                data-eusko="cotisation-amount"
                                onChange={this.amountOnChange}
                                value={this.state.amount}
                                label={__("Montant")}
                                labelClassName={[{'col-sm-3': false}, 'col-sm-2']}
                                elementWrapperClassName={[{'col-sm-9': false}, 'col-sm-4']}
                                placeholder={__("Montant de la cotisation")}
                            />
                            <div className="form-group row" style={{marginBottom: 0}}>
                                <label
                                    className="control-label col-sm-2"
                                    data-required="true"
                                    htmlFor="memberaddsubscription-amount"
                                    style={{paddingTop:10}}>
                                    {__("Périodicité")}
                                </label>
                                <div className="form-group row" style={{marginBottom: 0}}>
                                    <div className="col-sm-4 memberaddsubscription" data-eusko="memberaddsubscription-amount">
                                        <SimpleSelect
                                            ref="select"
                                            theme="bootstrap3"
                                            onValueChange={this.periodOnValueChange}
                                            value = {this.state.period}
                                            renderResetButton={() => { return null }}
                                            required
                                        >
                                            <option value = "1">Mensuel</option>
                                            <option value = "3">Trimestriel</option>
                                            <option value = "6">Semestriel</option>
                                            <option value = "12">Annuel</option>
                                        </SimpleSelect>
                                    </div>
                                </div>
                            </div>
                            <div className="form-group row">
                                <label
                                    className="control-label col-sm-2"
                                    data-required="true"
                                    htmlFor="memberaddsubscription-amount">
                                    {__("Montant de cotisation annuelle")}
                                </label>
                                <div className="col-sm-5 memberaddsubscription col-md-offset-1" data-eusko="memberaddsubscription-amount">
                                <label className="control-label col-sm-4" style={{textAlign: 'center'}}>
                                    {__("") + this.state.selectedOption==0 ? this.state.amountByY + (" eusko") : 0 + (" eusko")}
                                </label>
                                </div>
                            </div>
                        </div>
                    </span>
                )
            }
            else
            {
                var auto_prelev_auto = (
                    <span>
                        <div className="form-group row">
                            <div className="col-sm-5">
                                <h2>Prélèvement de la cotisation</h2>
                            </div>
                        </div>
                        <div className="row">
                            <div className="row">
                                <div className="col-sm-1 col-md-offset-1">
                                    <input type="checkbox" name="AllowSample" checked={this.state.selectedPrelevAuto} onChange={this.checkboxOnChange} style={{float:'right'}}/>
                                </div>
                                <div className="col-sm-9" style={{marginBottom: 15}}>
                                {__("J'autorise Euskal Moneta à prélever automatiquement ma cotisation sur mon compte Eusko, selon l'échéancier suivant :")}
                                </div>
                            </div>
                            <div className="form-group row">
                                <label
                                    className="control-label col-sm-2"
                                    data-required="true"
                                    htmlFor="memberaddsubscription-amount"
                                    style={{paddingTop:10}}>
                                    {__("Montant")}
                                    <span className="required-symbol">&nbsp;*</span>
                                </label>
                                <div className="col-sm-7 memberaddsubscription" data-eusko="memberaddsubscription-amount">
                                    <button
                                        className={buttonBasRevenusClass}
                                        onClick={() => this.setAmount({amount: '5', customAmount: undefined, displayCustomAmount: false,
                                                    buttonBasRevenusActivated: true, buttonClassiqueActivated: false, buttonSoutienActivated: false})}>
                                        {__('5 (bas revenus)')}
                                    </button>
                                    {' '}
                                    <button
                                        className={buttonClassiqueClass}
                                        onClick={() => this.setAmount({amount: '10', customAmount: undefined, displayCustomAmount: false,
                                                   buttonBasRevenusActivated: false, buttonClassiqueActivated: true, buttonSoutienActivated: false})}>
                                        {__('10 (cotisation normale)')}
                                    </button>
                                    {' '}
                                    <button
                                        className={buttonSoutienClass}
                                        onClick={() => this.setAmount({amount: '20', customAmount: '20', displayCustomAmount: true,
                                                    buttonBasRevenusActivated: false, buttonClassiqueActivated: false, buttonSoutienActivated: true})}>
                                        {__('20 ou plus (cotisation de soutien)')}
                                    </button>
                                </div>
                            </div>
                            <Input
                                name="customAmount"
                                data-eusko="bank-deposit-customAmount"
                                value={this.state.customAmount ? this.state.customAmount : ""}
                                type="number"
                                placeholder={__("Montant de la cotisation")}
                                validations="isPositiveNumeric"
                                validationErrors={{
                                   isPositiveNumeric: __("Montant invalide.")
                                }}
                                label={__("Montant personnalisé")}
                                onChange={this.validateAmount}
                                rowClassName={divCustomAmountClass}
                                elementWrapperClassName={[{'col-sm-9': false}, 'col-sm-6']}
                                required={this.state.displayCustomAmount}
                                disabled={!this.state.displayCustomAmount}
                            />
                        </div>
                        <div className="form-group row">
                            <label
                                className="control-label col-sm-2"
                                data-required="true"
                                htmlFor="memberaddsubscription-amount"
                                style={{paddingTop:0}}>
                                {__("Périodicité")}
                            </label>
                            <div className="col-sm-5 memberaddsubscription col-md-offset-2" data-eusko="memberaddsubscription-amount">
                                <label>
                                    {__("Annuel")}
                                </label>
                            </div>
                        </div>
                    </span>
                )
            }
        }
        else
        {
            if(this.state.memberType.toUpperCase().startsWith('0')) {
                var auto_prelev_auto = (
                    <span>
                        <div className="form-group row">
                            <div className="col-sm-5">
                                <h2>Paiement de la cotisation</h2>
                            </div>
                        </div>
                        <div className="row">
                            <div className="form-group row ">
                                <div className="radio col-sm-1">
                                    <label>
                                        <input type="radio" value="0" checked={this.state.selectedOption == 0} onChange={this.radioOnChange} style={{float:'right'}}/>
                                    </label>
                                </div>
                                <div className="col-sm-9" style={{marginBottom: 15}}>
                                    {__("J'autorise Euskal Moneta à prélever automatiquement ma cotisation sur mon compte Eusko, selon un des choix de cotisation ci-dessous.")}
                                </div>
                            </div>
                            <div className="row">
                                <div className="form-group row">
                                    <label
                                        className="control-label col-sm-2"
                                        data-required="true"
                                        htmlFor="memberaddsubscription-amount"
                                        style={{paddingTop:10}}>
                                        {__("Montant")}
                                        <span className="required-symbol">&nbsp;*</span>
                                    </label>
                                    <div className="col-sm-7 memberaddsubscription" data-eusko="memberaddsubscription-amount">
                                        <button
                                            className={buttonBasRevenusClass}
                                            disabled={this.state.selectedOption == 1}
                                            onClick={() => this.setAmount({amount: '5', customAmount: undefined, displayCustomAmount: false,
                                                        buttonBasRevenusActivated: true, buttonClassiqueActivated: false, buttonSoutienActivated: false})}>
                                            {__('5 (bas revenus)')}
                                        </button>
                                        {' '}
                                        <button
                                            className={buttonClassiqueClass}
                                            disabled={this.state.selectedOption == 1}
                                            onClick={() => this.setAmount({amount: '10', customAmount: undefined, displayCustomAmount: false,
                                                       buttonBasRevenusActivated: false, buttonClassiqueActivated: true, buttonSoutienActivated: false})}>
                                            {__('10 (cotisation normale)')}
                                        </button>
                                        {' '}
                                        <button
                                            className={buttonSoutienClass}
                                            disabled={this.state.selectedOption == 1}
                                            onClick={() => this.setAmount({amount: '20', customAmount: '20', displayCustomAmount: true,
                                                        buttonBasRevenusActivated: false, buttonClassiqueActivated: false, buttonSoutienActivated: true})}>
                                            {__('20 ou plus (cotisation de soutien)')}
                                        </button>
                                    </div>
                                </div>
                                <Input
                                    name="customAmount"
                                    data-eusko="bank-deposit-customAmount"
                                    value={this.state.customAmount ? this.state.customAmount : ""}
                                    type="number"
                                    placeholder={__("Montant de la cotisation")}
                                    validations="isPositiveNumeric"
                                    validationErrors={{
                                       isPositiveNumeric: __("Montant invalide.")
                                    }}
                                    label={__("Montant personnalisé")}
                                    onChange={this.validateAmount}
                                    rowClassName={divCustomAmountClass}
                                    labelClassName={[{'col-sm-3': false}, 'col-sm-2']}
                                    elementWrapperClassName={[{'col-sm-9': false}, 'col-sm-6']}
                                    required={this.state.displayCustomAmount}
                                    disabled={!this.state.displayCustomAmount}
                                />
                            </div>
                            <div className="form-group row ">
                                <div className="radio col-sm-1 col-md-offset-1">
                                </div>
                                <div className="col-sm-5  profilform" data-eusko="profilform-asso">
                                    {__("Et je m'acquitte tout de suite des échéances en retard en faisant un virement depuis mon compte Eusko.")}
                                    {(" Je fais un virement de ") + (this.state.amount && this.state.month && this.state.period.value ? this.state.amount*Math.ceil(this.state.month/this.state.period.value) : 0) + (" ")}
                                    {__("eusko correspondant à ma cotisation jusqu'au ") + this.state.endMonth + (".")}
                                </div>
                            </div>
                            <hr></hr><hr></hr>
                            <div className="form-group row ">
                                <div className="radio col-sm-1">
                                  <label>
                                    <input type="radio" value="1" checked={this.state.selectedOption == 1} onChange={this.radioOnChange}/>
                                  </label>
                                </div>
                                <div className="col-sm-9  profilform" data-eusko="profilform-asso">
                                    {__("Je paie ma cotisation toute l'année en cours par virement depuis mon compte Eusko, selon un des choix de cotisation ci-dessous.")}
                                </div>
                            </div>
                            <div className="row">
                                <div className="form-group row">
                                    <label
                                        className="control-label col-sm-2"
                                        data-required="true"
                                        htmlFor="memberaddsubscription-amount">
                                        {__("Montant")}
                                        <span className="required-symbol">&nbsp;*</span>
                                    </label>
                                    <div className="col-sm-7 memberaddsubscription" data-eusko="memberaddsubscription-amount">
                                        <button
                                            className={buttonBasRevenusClass2}
                                            disabled={this.state.selectedOption == 0}
                                            onClick={() => this.setAmount({amount: '5', customAmount: undefined, displayCustomAmount2: false,
                                                        buttonBasRevenusActivated2: true, buttonClassiqueActivated2: false, buttonSoutienActivated2: false})}>
                                            {__('5 (bas revenus)')}
                                        </button>
                                        {' '}
                                        <button
                                            className={buttonClassiqueClass2}
                                            disabled={this.state.selectedOption == 0}
                                            onClick={() => this.setAmount({amount: '10', customAmount: undefined, displayCustomAmount2: false,
                                                       buttonBasRevenusActivated2: false, buttonClassiqueActivated2: true, buttonSoutienActivated2: false})}>
                                            {__('10 (cotisation normale)')}
                                        </button>
                                        {' '}
                                        <button
                                            className={buttonSoutienClass2}
                                            disabled={this.state.selectedOption == 0}
                                            onClick={() => this.setAmount({amount: '20', customAmount: '20', displayCustomAmount2: true,
                                                        buttonBasRevenusActivated2: false, buttonClassiqueActivated2: false, buttonSoutienActivated2: true})}>
                                            {__('20 ou plus (cotisation de soutien)')}
                                        </button>
                                    </div>
                                </div>
                                <Input
                                    name="customAmount"
                                    data-eusko="bank-deposit-customAmount"
                                    value={this.state.customAmount ? this.state.customAmount : ""}
                                    type="number"
                                    placeholder={__("Montant de la cotisation")}
                                    validations="isPositiveNumeric"
                                    validationErrors={{
                                       isPositiveNumeric: __("Montant invalide.")
                                    }}
                                    label={__("Montant personnalisé")}
                                    onChange={this.validateAmount}
                                    rowClassName={divCustomAmountClass2}
                                    labelClassName={[{'col-sm-3': false}, 'col-sm-2']}
                                    elementWrapperClassName={[{'col-sm-9': false}, 'col-sm-6']}
                                    required={this.state.displayCustomAmount2}
                                    disabled={!this.state.displayCustomAmount2}
                                />
                            </div>
                        </div>
                    </span>
                )
            }
            else
            {
                var auto_prelev_auto = (
                    <span>
                        <div className="form-group row">
                            <div className="col-sm-5">
                                <h2>Paiement de la cotisation</h2>
                            </div>
                        </div>
                        <div className="row">
                            <div className="form-group row ">
                                <div className="radio col-sm-1">
                                    <label>
                                        <input type="radio" value="0" checked={this.state.selectedOption == 0} onChange={this.radioOnChange} style={{float:'right'}}/>
                                    </label>
                                </div>
                                <div className="col-sm-9" style={{marginBottom: 15}}>
                                    {__("J'autorise Euskal Moneta à prélever automatiquement ma cotisation sur mon compte Eusko, selon l'échéancier suivant :")}
                                </div>
                            </div>
                            <Input
                                name="amount"
                                data-eusko="cotisation-amount"
                                onChange={this.amountOnChange}
                                value={this.state.selectedOption==0 ? this.state.amount : ""}
                                readOnly={this.state.selectedOption}
                                label={__("Montant")}
                                labelClassName={[{'col-sm-3': false}, 'col-sm-2']}
                                elementWrapperClassName={[{'col-sm-9': false}, 'col-sm-4']}
                                placeholder={__("Montant de la cotisation")}
                            />
                            <div className="form-group row" style={{marginBottom: 0}}>
                                <label
                                    className="control-label col-sm-2"
                                    data-required="true"
                                    htmlFor="memberaddsubscription-amount"
                                    style={{paddingTop:10}}>
                                    {__("Périodicité")}
                                </label>
                                <div className="form-group row" style={{marginBottom: 0}}>
                                    <div className="col-sm-4 memberaddsubscription" data-eusko="memberaddsubscription-amount">
                                        <SimpleSelect
                                            ref="select"
                                            theme="bootstrap3"
                                            onValueChange={this.periodOnValueChange}
                                            value={this.state.selectedOption==0 ? this.state.period : ""}
                                            renderResetButton={() => { return null }}
                                            disabled={this.state.selectedOption}
                                            required={!this.state.selectedOption}
                                            className={greySimpleSelect}
                                        >
                                            <option value = "1">Mensuel</option>
                                            <option value = "3">Trimestriel</option>
                                            <option value = "6">Semestriel</option>
                                            <option value = "12">Annuel</option>
                                        </SimpleSelect>
                                    </div>
                                </div>
                            </div>
                            <div className="form-group row">
                                <label
                                    className="control-label col-sm-2"
                                    data-required="true"
                                    htmlFor="memberaddsubscription-amount">
                                    {__("Montant de cotisation annuelle")}
                                </label>
                                <div className="col-sm-5 memberaddsubscription col-md-offset-1" data-eusko="memberaddsubscription-amount">
                                <label className="control-label col-sm-4" style={{textAlign: 'center'}}>
                                    {__("") + this.state.selectedOption==0 ? this.state.amountByY + (" eusko") : 0 + (" eusko")}
                                </label>
                                </div>
                            </div>
                            <div className="form-group row ">
                                <div className="radio col-sm-1 col-md-offset-1">
                                </div>
                                <div className="col-sm-5  profilform" data-eusko="profilform-asso">
                                    {__("Et je m'acquitte tout de suite des échéances en retard en faisant un virement depuis mon compte Eusko.")}
                                    {(" Je fais un virement de ") + (this.state.amount && this.state.month && this.state.period.value ? this.state.amount*Math.ceil(this.state.month/this.state.period.value) : 0) + (" ")}
                                    {__("eusko correspondant à ma cotisation jusqu'au ") + this.state.endMonth + (".")}
                                </div>
                            </div>
                            <hr></hr><hr></hr>
                            <div className="form-group row ">
                                <div className="radio col-sm-1">
                                    <label>
                                        <input type="radio" value="1" checked={this.state.selectedOption == 1} onChange={this.radioOnChange}/>
                                    </label>
                                </div>
                                <div className="col-sm-9" style={{marginBottom: 15}}>
                                    {__("Je paie ma cotisation toute l'année en cours par virement depuis mon compte Eusko :")}
                                </div>
                            </div>
                            <Input
                                name="amount"
                                data-eusko="cotisation-amount"
                                onChange={this.amountByYOnChange}
                                value={this.state.selectedOption==1 ? this.state.amountByY : ""}
                                label={__("Montant")}
                                labelClassName={[{'col-sm-3': false}, 'col-sm-2']}
                                elementWrapperClassName={[{'col-sm-9': false}, 'col-sm-4']}
                                placeholder={__("Montant de la cotisation")}
                                readOnly={!this.state.selectedOption}
                            />
                        </div>
                    </span>
                )
            }
        }
        return (
            <div className="row">
                <CotisationForm ref="historical-form">
                    <div className="row">
                        <div className="form-group row">
                            <div className="col-sm-3">
                                <h2>Etat de la cotisation</h2>
                            </div>
                        </div>
                        <div className="form-group row">
                            <div className="col-sm-3 col-md-offset-1">
                                {memberStatus}
                            </div>
                        </div>
                    </div>
                    <hr></hr>
                    <div className="row">
                        <div className="form-group row">
                            <div className="col-sm-5">
                                <h2>Montant de la cotisation</h2>
                            </div>
                        </div>
                        {cotisation_info}
                        <hr></hr>
                        {auto_prelev_auto}
                        <hr></hr>
                        Pour qu'il n'y ait pas d'interruption dans la cotisation et dans l'accès au compte Eusko, <br/>
                        l'échéance pour une période donnée sera prélevée le 20 du mois précédent, par exemple :<br/><br/>

                        dans le cas d'un prélèvement annuel, la cotisation sera prélevée le 20 décembre pour l'année suivante<br/>
                        dans le cas d'un prélèvement mensuel, la cotisation sera prélevée le 20 de chaque mois pour le mois suivant<br/><br/>
                    </div>
                    <div className="row profil-div-margin-left margin-top">
                        <input
                            name="submit"
                            data-eusko="profil-form-submit"
                            type="submit"
                            defaultValue={__("Enregistrer")}
                            className="btn btn-success col-sm-offset-5"
                            formNoValidate={true}
                            onClick={() => this.submitForm()}
                            disabled={!this.state.canSubmit}
                        />
                    </div>
                </CotisationForm>
            </div>
        )
        }
    }
)

ReactDOM.render(
    <Cotisation url={getAPIBaseURL + "members/?login="} postUrl={getAPIBaseURL + "members/"} />,
    document.getElementById('cotisation')
)
document.title = __("Mon profil") + ": " + __("Cotisation") + " - " + __("Compte en ligne") + " " + document.title