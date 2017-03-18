import {
    fetchAuth,
    getAPIBaseURL,
    getCurrentLang,
    checkStatus,
    parseJSON,
    getCSRFToken,
} from 'Utils'

import classNames from 'classnames'

const {
    Input,
} = FRC

import ReactSelectize from 'react-selectize'
const SimpleSelect = ReactSelectize.SimpleSelect

const {
    ToastContainer
} = ReactToastr
const ToastMessageFactory = React.createFactory(ReactToastr.ToastMessage.animation)

Formsy.addValidationRule('isMoreThan', function (values, value, otherValue) {
  return Number(value.replace(',','.')) >= Number(otherValue);
});
Formsy.addValidationRule('isMoreThanByYears', function (values, value, otherValue) {
    return (value.replace(',','.')*12/otherValue.period) >= Number(otherValue.value)
});
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
            amount: '',
            amountByY: 0,
            customAmount: '',
            selectedOption: 0,
            month: new Date().getMonth()+1,
            year: new Date().getFullYear(),
            endMonth: moment().endOf('month').locale('fr').format("YYYY-MM-DDThh:mm"),
            endYear: moment().endOf('year').locale('fr').format("YYYY-MM-DDThh:mm"),
            lastMonth: 0, 
            beginYear: moment().startOf('year').locale('fr').format("YYYY-MM-DDThh:mm"),
            amountValid: false,
            menu: window.location.pathname.indexOf("/nomenu") == -1 ? false : true
        }
    },

    componentDidMount() {
        var computeMemberData = (member) => {
            this.setState({member: member[0]})
            moment.locale(getCurrentLang)
            if (moment.unix(member[0].datefin) > moment()) {
                this.setState({cotisationState: true})
            }
            var label = undefined
            switch (member[0].array_options.options_prelevement_cotisation_periodicite)
            {
                case '12':
                    label = 'Annuel'
                break
                case '6':
                    label = 'Semestriel'
                break
                case '3':
                    label = 'Trimestriel'
                break
                case '1':
                    label = 'Mensuel'
                break
                default:
                    label = ''
                break
            }
            this.setState({period:{label: label, value: member[0].array_options.options_prelevement_cotisation_periodicite}})
            if (member[0].login.toUpperCase().startsWith('Z'))
            {
                if (member[0].type == 'Entreprise') {
                    this.setState({memberType: '10'}) // company user
                }
                else
                {
                    this.setState({memberType: '11'}) // association user
                }
            }
            else if (member[0].login.toUpperCase().startsWith('E'))
            {
                this.setState({memberType: '0'}) // single user
                if(member[0].array_options.options_prelevement_cotisation_montant)
                {
                    this.setState({amount: Number(member[0].array_options.options_prelevement_cotisation_montant).toFixed(2).replace('.',',')})
                    if(member[0].array_options.options_prelevement_cotisation_montant<=5)
                    {
                        this.setState({buttonBasRevenusActivated: true})
                    }
                    else if (member[0].array_options.options_prelevement_cotisation_montant<=10)
                    {
                        this.setState({buttonClassiqueActivated: true})
                    }
                    else if (member[0].array_options.options_prelevement_cotisation_montant>10)
                    {
                        this.setState({buttonSoutienActivated: true, displayCustomAmount: true, customAmount: Number(member[0].array_options.options_prelevement_cotisation_montant).toFixed(2).replace('.',',')})
                    }
                }
            }
            if(member[0].array_options.options_prelevement_auto_cotisation_eusko)
            {
                this.setState({selectedPrelevAuto: true})
            }

        }
        fetchAuth(this.props.url + this.state.memberLogin, 'get', computeMemberData)
    },

    setAmount(value) {
        this.setState(value, this.ValidationCheck)
    },

    ValidationCheck() {

        if(this.state.memberType.startsWith('1'))
        {
            if (this.state.cotisationState)
            {
                if (this.state.selectedPrelevAuto && this.state.amount && this.state.period && this.state.amountValid)
                {
                    this.setState({canSubmit: true})
                }
                else
                {
                    this.setState({canSubmit: false})
                }
            }
            else
            {
                if (this.state.selectedOption == 0 && this.state.period.value)
                {
                    this.calculEndDate()
                }
                if ((this.state.selectedOption == 0 && this.state.amount && this.state.period.value && this.state.amountValid) || (this.state.selectedOption == 1 && this.state.amountByY != 0 && this.state.amountValid))
                {

                    this.setState({canSubmit: true})
                }
                else
                {
                    this.setState({canSubmit: false})
                }
            }
        }
        else if(this.state.memberType.startsWith('0'))
        {
            if (this.state.cotisationState)
            {
                if (this.state.selectedPrelevAuto && this.state.amount)
                {
                    this.setState({canSubmit: true})
                }
                else
                {
                    this.setState({canSubmit: false})
                }
            }
            else
            {
                if ((this.state.selectedOption == 0 && this.state.amount) || (this.state.selectedOption == 1 && this.state.amount))
                {
                    this.setState({canSubmit: true})
                }
                else
                {
                    this.setState({canSubmit: false})
                }
            }
        }
    },
    amountOnChange(event, value) {
        this.setState({amount: value.replace('.', ',')}, this.calculAmountByYears)
    },

    amountByYOnChange(event, value) {
        if(this.state.memberType == '10')
        {
            this.setState({amountByY: value.replace('.',','), amountValid: Number(value.replace(',', '.')) >= Number(60)}, this.ValidationCheck)
        }
        else if(this.state.memberType == '11')
        {
            this.setState({amountByY: value.replace('.',','), amountValid: Number(value.replace(',', '.')) >= Number(10)}, this.ValidationCheck)
        }
        
            
    },

    checkboxOnChange(event, value) {
        // update pin values
        if (event.target.name == 'AllowSample') {
            this.setState({selectedPrelevAuto: event.target.checked}, this.ValidationCheck)
        }
    },
    periodOnValueChange(periodValue) {
        // update pin values
        this.setState({period: {label: periodValue.label, value: periodValue.value}}, this.calculAmountByYears)
    },
    calculAmountByYears() {
        if (this.state.amount && this.state.period.value > 0)
        {
            var amount = this.state.amount.replace(',','.')
            var amountByY = amount*(12/this.state.period.value)
            if(this.state.memberType == '10')
            {
                var amountValid = Number(amountByY) >= Number(60) ? true : false
            }
            else if(this.state.memberType == '11')
            {
                var amountValid = Number(amountByY) >= Number(10) ? true : false
            }
            this.setState({amountByY: amountByY, amountValid: amountValid}, this.ValidationCheck)
        }
        else {
            this.setState({amountByY: 0, amountValid: false}, this.ValidationCheck)
        }
        
    },
    calculEndDate() {

        if (this.state.period)
        {
            var intPart = this.state.month / this.state.period.value
            var resPart = this.state.month % this.state.period.value
            if (intPart <= 1) 
            {
                this.setState({lastMonth: parseInt(this.state.period.value)-1})
            }
            else if (resPart == 0)
            {
                this.setState({lastMonth: Math.floor(intPart) * parseInt(this.state.period.value)-1})
            }
            else
            {
                this.setState({lastMonth: (Math.floor(intPart)+1) * parseInt(this.state.period.value)-1})
            }
        }
            
    },
    // amount
    validateAmount(field, value) {
        this.setState({customAmount: value.replace('.', ',')})
        this.setState({amount: value}, this.ValidationCheck)
        if (isPositiveNumeric(null, value) && Number(value) >= Number(20)) {
            this.setState({amount: value}, this.ValidationCheck)
        }
        else {
            this.setState({amount: ''}, this.ValidationCheck)
        }
    },

    submitForm() {
        this.setState({canSubmit: false})
        // We push fields into the data object that will be passed to the server
        
        var computeForm = (data) => {
            // Get Session data from API & update session data via Django front
            fetch('/update-session/',
            {
                method: 'put',
                credentials: 'same-origin',
                body: JSON.stringify({'token': sessionStorage.getItem('cel-api-token-auth')}),
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCSRFToken,
                }
            })
            .then(checkStatus)
            .then(parseJSON)
            .then((data) => {
                // Redirect to profile page
                window.location.assign('/compte/synthese/')
            })
            .catch((err) => {
                // Error during request, or parsing NOK :(
                console.error(err)

                // toast
                this.refs.container.error(
                    __("Une erreur est survenue lors de l'enregistrement vers le serveur !"),
                    "",
                    {
                        timeOut: 5000,
                        extendedTimeOut: 10000,
                        closeButton:true
                    }
                )
            })
        }

        var promiseError_subscription = (err) => {
            // Error during request, or parsing NOK :(
            console.log(this.props.url, err)
            this.refs.container.error(
                __("Une erreur s'est produite lors du paiement des cotisations en retard. Le solde de votre compte ne doit pas être suffisant, Veuillez contacter Euskal Moneta!"),
                "",
                {
                    timeOut: 10000,
                    extendedTimeOut: 10000,
                    closeButton:true
                }
            )
        }

        var promiseError_update = (err) => {
            // Error during request, or parsing NOK :(
            console.log(this.props.url, err)
            this.refs.container.error(
                __("Une erreur s'est produite lors des modifications de vos échances de cotisation, Veuillez contacter Euskal Moneta!"),
                "",
                {
                    timeOut: 10000,
                    extendedTimeOut: 10000,
                    closeButton:true
                }
            )
        }
        var update_options_dolibarr = () => {
            var data = {}
            // We need to verify whether we are in "saisie libre" or not
            if (this.state.amount) {
                data.options_prelevement_cotisation_montant = this.state.amount
            }
            else if (this.state.amountByY) {
                data.options_prelevement_cotisation_montant = this.state.amountByY
            }

            if (this.state.period.value) {
                data.options_prelevement_cotisation_periodicite = this.state.period.value
            }
            else{
                data.options_prelevement_cotisation_periodicite = 12
            }

            if (this.state.selectedPrelevAuto) {
                data.options_prelevement_auto_cotisation_eusko = this.state.selectedPrelevAuto
            }
            else {
                data.options_prelevement_auto_cotisation_eusko = false
            }
            fetchAuth(getAPIBaseURL + "members/" + this.state.member.id + "/", 'PATCH', computeForm, data, promiseError_update)
        }
        if (this.state.cotisationState)
        {
            update_options_dolibarr()
        }

        if (!this.state.cotisationState && this.state.memberType.startsWith('0'))
        {
            var data2 = {}
            data2.start_date = this.state.beginYear
            data2.end_date = this.state.endYear
            data2.amount = this.state.amount
            data2.label = 'Cotisation ' + this.state.year
            fetchAuth(getAPIBaseURL + "member-cel-subscription/", 'POST', update_options_dolibarr, data2, promiseError_subscription)
        }
        else if (!this.state.cotisationState && this.state.memberType.startsWith('1'))
        {
            var data2 = {}
            data2.start_date = this.state.beginYear
            if (this.state.selectedOption == 0)
            {
                data2.end_date = moment().set('month', this.state.lastMonth).endOf('month').locale('fr').format("YYYY-MM-DDThh:mm")
                data2.amount = this.state.amount*Math.ceil(this.state.month/this.state.period.value)
            }
            else
            {
                data2.end_date = this.state.endYear
                data2.amount = this.state.amountByY
            }
            data2.label = 'Cotisation ' + this.state.year
            fetchAuth(getAPIBaseURL + "member-cel-subscription/", 'POST', update_options_dolibarr, data2, promiseError_subscription)
        }
    },

    radioOnChange(event, value) {
        // update pin values
        if (this.state.memberType.startsWith('0'))
        {
            if (event.target.value == 0)
            {
                var state = {selectedOption: 0, amountByY: '', amount: '',
                             canSubmit: false, selectedPrelevAuto: true, displayCustomAmount2: false}
            }
            else if (event.target.value == 1)
            {
                var state = {selectedOption: 1, amountByY: '', amount: '',
                             canSubmit: false, selectedPrelevAuto: false, displayCustomAmount: false}
            }
        }
        else if (this.state.memberType.startsWith('1'))
        {
            if (event.target.value == 0)
            {
                var state = {selectedOption: 0, displayCustomAmount2: false, customAmount: '',
                             canSubmit: false, amountByY: '', amount: '', selectedPrelevAuto: true}
            }
            else if (event.target.value == 1)
            {
                var state = {selectedOption: 1, displayCustomAmount: false, customAmount: '',
                             canSubmit: false, period: false, amountByY: '', amount: '',
                             selectedPrelevAuto: false}
            }
        }
        this.setState(state)
        this.buttonResetChoice()
    },

    buttonResetChoice() {
        this.setState({buttonBasRevenusActivated: false, buttonClassiqueActivated: false,
                       buttonSoutienActivated: false, buttonBasRevenusActivated2: false,
                       buttonClassiqueActivated2: false, buttonSoutienActivated2: false})
    },

    render() {
        var greySimpleSelect = classNames({
            'grey-back': this.state.selectedOption,
        })

        var greySimpleSelect_noautorization = classNames({
            'grey-back': !this.state.selectedPrelevAuto,
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
                        <div className="col-sm-3">
                            <h2>Etat de la cotisation</h2>
                        </div>
                        <div className="col-sm-3 col-md-offset-1">
                            <br></br>
                            <span className="glyphicon glyphicon-ok member-status-ok"></span>
                            <span className="member-status-text" data-eusko="profil-status">
                                {__("À jour")}
                            </span>
                            <span className="member-status-date">({dateEndSub})</span>
                        </div>
                    </div>
                )

                var memberStatusUpToDate = true
            }
            else {
                var memberStatus = (
                    <div className="font-member-status">
                        <div className="col-sm-3">
                            <h2>Etat de la cotisation</h2>
                        </div>
                            <div className="col-sm-3 col-md-offset-1">
                                <br></br>
                            <span className="glyphicon glyphicon-remove member-status-nok"></span>
                            <span className="member-status-text" data-eusko="profil-status">
                                {__("Pas à jour")}
                            </span>
                            <span className="member-status-date">({dateEndSub})</span>
                        </div>
                    </div>
                )

                var memberStatusUpToDate = false
            }
        }
        else
            return null

        if (this.state.memberType.startsWith('1')) {
            if (this.state.memberType == '10') {
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
            if (this.state.memberType.startsWith('1')) {
                var dataValidation = {value:'', period:this.state.period.value, month:this.state.month}
                if(this.state.memberType == '10')
                {
                    dataValidation.value = '60'
                    var validationMemberTypeByYears = ({matchRegexp: /^\d+(,\d{1,2})?$/, isMoreThanByYears:dataValidation})
                    var validationMemberTypeErrorByYears = {matchRegexp: __("Montant invalide."),isMoreThanByYears: __("Montant annuel inférieur à 60.")}
                }
                else if(this.state.memberType == '11')
                {
                    dataValidation.value = '10'
                    var validationMemberTypeByYears = ({matchRegexp: /^\d+(,\d{1,2})?$/, isMoreThanByYears:dataValidation})
                    var validationMemberTypeErrorByYears = {matchRegexp: __("Montant invalide."),isMoreThanByYears: __("Montant annuel inférieur à 10.")}
                }
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
                            <Input
                                name="amount"
                                data-eusko="cotisation-amount"
                                type="text"
                                validations={validationMemberTypeByYears}
                                validationErrors={validationMemberTypeErrorByYears}
                                onChange={this.amountOnChange}
                                value={this.state.amount}
                                label={__("Montant")}
                                labelClassName={[{'col-sm-3': false}, 'col-sm-2']}
                                elementWrapperClassName={[{'col-sm-9': false}, 'col-sm-4']}
                                placeholder={__("Montant de la cotisation")}
                                disabled={!this.state.selectedPrelevAuto}
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
                                            disabled={!this.state.selectedPrelevAuto}
                                            className={greySimpleSelect_noautorization}
                                        >
                                            <option value = "1">Mensuel</option>
                                            <option value = "3">Trimestriel</option>
                                            <option value = "6">Semestriel</option>
                                            <option value = "12">Annuel</option>
                                        </SimpleSelect>
                                    </div>
                                </div>
                            </div>
                            <div className="form-group row" style={{paddingTop:8}}>
                                <label
                                    className="control-label col-sm-2"
                                    data-required="true"
                                    htmlFor="memberaddsubscription-amount"
                                    style={{paddingTop:0}}>
                                    {__("Montant de cotisation annuelle")}
                                </label>
                                <div className="col-sm-5 memberaddsubscription" data-eusko="memberaddsubscription-amount">
                                    {this.state.selectedOption==0 && this.state.amountByY ? this.state.amountByY + (" eusko") : 0 + (" eusko")}
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
                                        disabled={!this.state.selectedPrelevAuto}
                                        onClick={() => this.setAmount({amount: '5', customAmount: '', displayCustomAmount: false,
                                                    buttonBasRevenusActivated: true, buttonClassiqueActivated: false, buttonSoutienActivated: false})}>
                                        {__('5 (bas revenus)')}
                                    </button>
                                    {' '}
                                    <button
                                        className={buttonClassiqueClass}
                                        disabled={!this.state.selectedPrelevAuto}
                                        onClick={() => this.setAmount({amount: '10', customAmount: '', displayCustomAmount: false,
                                                   buttonBasRevenusActivated: false, buttonClassiqueActivated: true, buttonSoutienActivated: false})}>
                                        {__('10 (cotisation normale)')}
                                    </button>
                                    {' '}
                                    <button
                                        className={buttonSoutienClass}
                                        disabled={!this.state.selectedPrelevAuto}
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
                                type="text"
                                placeholder={__("Montant de la cotisation")}
                                validations={{
                                    matchRegexp: /^\d+(,\d{1,2})?$/, 
                                    isMoreThan:20,
                                }}
                                validationErrors={{
                                   matchRegexp: __("Montant invalide."),
                                   isMoreThan: __("Montant inférieur à 20."),
                                }}
                                label={__("Montant personnalisé")}
                                onChange={this.validateAmount}
                                rowClassName={divCustomAmountClass}
                                labelClassName={[{'col-sm-3': false}, 'col-sm-2']}
                                elementWrapperClassName={[{'col-sm-9': false}, 'col-sm-5']}
                                required={this.state.displayCustomAmount}
                                disabled={!this.state.displayCustomAmount || !this.state.selectedPrelevAuto}
                            />                            
                            <div className="form-group row" style={{paddingTop:8}}>
                                <label
                                    className="control-label col-md-offset-1 col-sm-1"
                                    data-required="true"
                                    htmlFor="memberaddsubscription-amount"
                                    style={{paddingTop:0}}>
                                    {__("Périodicité")}
                                </label>
                                <div className="col-sm-5 memberaddsubscription" data-eusko="memberaddsubscription-amount">
                                    {__("Annuel")}
                                </div>
                            </div>
                        </div>
                    </span>
                )
            }
        }
        else
        {
            if (this.state.memberType.startsWith('0')) {
                var auto_prelev_auto = (
                    <span>
                        <div className="form-group row">
                            <div className="col-sm-5">
                                <h2>Paiement de la cotisation</h2>
                            </div>
                        </div>
                        <div className="row">
                            <div className="form-group row">
                                <div className="col-sm-1">
                                    <input type="radio" value="0" checked={this.state.selectedOption == 0} onChange={this.radioOnChange} style={{float:'right'}}/>
                                </div>
                                <div className="col-sm-9" style={{marginBottom: 15}}>
                                    {__("J'autorise Euskal Moneta à prélever automatiquement ma cotisation sur mon compte Eusko, selon l'échéancier suivant :")}
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
                                            onClick={() => this.setAmount({amount: '5', customAmount: '', displayCustomAmount: false,
                                                        buttonBasRevenusActivated: true, buttonClassiqueActivated: false, buttonSoutienActivated: false})}>
                                            {__('5 (bas revenus)')}
                                        </button>
                                        {' '}
                                        <button
                                            className={buttonClassiqueClass}
                                            disabled={this.state.selectedOption == 1}
                                            onClick={() => this.setAmount({amount: '10', customAmount: '', displayCustomAmount: false,
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
                                    type="text"
                                    placeholder={__("Montant de la cotisation")}
                                    validations={{
                                        matchRegexp: /^\d+(,\d{1,2})?$/,
                                        isMoreThan:20,
                                    }}
                                    validationErrors={{
                                       matchRegexp: __("Montant invalide."),
                                       isMoreThan: __("Montant inférieur à 20."),
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
                            <div className="form-group row" style={{paddingTop:8}}>
                                <label
                                    className="control-label col-md-offset-1 col-sm-1"
                                    data-required="true"
                                    htmlFor="memberaddsubscription-amount"
                                    style={{paddingTop:0}}>
                                    {__("Périodicité")}
                                </label>
                                <div className="col-sm-5 memberaddsubscription" data-eusko="memberaddsubscription-amount">
                                    {__("Annuel")}
                                </div>
                            </div>
                            <div className="form-group row ">
                                <div className="col-md-offset-1 col-sm-6 profilform" data-eusko="profilform-asso">
                                    {__("Note : La cotisation pour l'année en cours sera prélevée immédiatement.")}
                                </div>
                            </div>
                            <div className="form-group row ">
                                <div className="col-sm-1">
                                  <input type="radio" value="1" checked={this.state.selectedOption == 1} onChange={this.radioOnChange}/>
                                </div>
                                <div className="col-sm-9  profilform" data-eusko="profilform-asso">
                                    {__("Je paie ma cotisation pour l'année en cours en faisant un virement depuis mon compte Eusko :")}
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
                                            onClick={() => this.setAmount({amount: '5', customAmount: '', displayCustomAmount2: false,
                                                        buttonBasRevenusActivated2: true, buttonClassiqueActivated2: false, buttonSoutienActivated2: false})}>
                                            {__('5 (bas revenus)')}
                                        </button>
                                        {' '}
                                        <button
                                            className={buttonClassiqueClass2}
                                            disabled={this.state.selectedOption == 0}
                                            onClick={() => this.setAmount({amount: '10', customAmount: '', displayCustomAmount2: false,
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
                                    type="text"
                                    placeholder={__("Montant de la cotisation")}
                                    validations={{
                                        matchRegexp: /^\d+(,\d{1,2})?$/,
                                        isMoreThan:20,
                                    }}
                                    validationErrors={{
                                       matchRegexp: __("Montant invalide."),
                                       isMoreThan: __("Montant inférieur à 20."),
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
                var dataValidation = {value:'', period:this.state.period.value, month:this.state.month}
                if(this.state.memberType == '10')
                {
                    dataValidation.value = '60'
                    var validationMemberType = ({matchRegexp: /^\d+(,\d{1,2})?$/,isMoreThan:60})
                    var validationMemberTypeError = {matchRegexp: __("Montant invalide."),isMoreThan: __("Montant inférieur à 60.")}

                    var validationMemberTypeByYears = ({matchRegexp: /^\d+(,\d{1,2})?$/, isMoreThanByYears:dataValidation})
                    var validationMemberTypeErrorByYears = {matchRegexp: __("Montant invalide."),isMoreThanByYears: __("Montant annuel inférieur à 60.")}
                }
                else if(this.state.memberType == '11')
                {
                    dataValidation.value = '10'
                    var validationMemberType = ({matchRegexp: /^\d+(,\d{1,2})?$/, isMoreThan:10})
                    var validationMemberTypeError = {matchRegexp: __("Montant invalide."),isMoreThan: __("Montant inférieur à 10.")}

                    var validationMemberTypeByYears = ({matchRegexp: /^\d+(,\d{1,2})?$/, isMoreThanByYears:dataValidation})
                    var validationMemberTypeErrorByYears = {matchRegexp: __("Montant invalide."),isMoreThanByYears: __("Montant annuel inférieur à 10.")}
                }
                var auto_prelev_auto = (
                    <span>
                        <div className="form-group row">
                            <div className="col-sm-5">
                                <h2>Paiement de la cotisation</h2>
                            </div>
                        </div>
                        <div className="row">
                            <div className="form-group row">
                                <div className="col-sm-1">
                                    <input type="radio" value="0" checked={this.state.selectedOption == 0} onChange={this.radioOnChange} style={{float:'right'}}/>
                                </div>
                                <div className="col-sm-9" style={{marginBottom: 15}}>
                                    {__("J'autorise Euskal Moneta à prélever automatiquement ma cotisation sur mon compte Eusko, selon l'échéancier suivant :")}
                                </div>
                            </div>
                            <Input
                                name="amount"
                                data-eusko="cotisation-amount"
                                type="text"
                                validations={validationMemberTypeByYears}
                                validationErrors={validationMemberTypeErrorByYears}
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
                            <div className="form-group row" style={{paddingTop:8}}>
                                <label
                                    className="control-label col-sm-2"
                                    data-required="true"
                                    htmlFor="memberaddsubscription-amount"
                                    style={{paddingTop:0}}>
                                    {__("Montant de cotisation annuelle")}
                                </label>
                                <div className="col-sm-5 memberaddsubscription" data-eusko="memberaddsubscription-amount">
                                    {this.state.selectedOption==0 && this.state.amountByY ? this.state.amountByY + (" eusko") : 0 + (" eusko")}
                                </div>
                            </div>
                            <div className="form-group row ">
                                <div className="col-md-offset-1 col-sm-9 profilform" data-eusko="profilform-asso">
                                    {__("et je fais un virement de ")
                                    + (this.state.amount && this.state.month && this.state.period.value ? this.state.amount.replace(',','.')*Math.ceil(this.state.month/this.state.period.value) : ("__"))}
                                    {__(" eusko correspondant à ma cotisation jusqu'au ") 
                                    + (this.state.amount && this.state.lastMonth ? moment().set('month', this.state.lastMonth).endOf('month').locale('fr').format("ll") : ("______")) + (".")}
                                </div>
                            </div>
                            <div className="form-group row">
                                <div className="col-sm-1">
                                    <input type="radio" value="1" checked={this.state.selectedOption == 1} onChange={this.radioOnChange} style={{float:'right'}}/>
                                </div>
                                <div className="col-sm-9" style={{marginBottom: 15}}>
                                    {__("Je paie ma cotisation pour l'année en cours en faisant un virement depuis mon compte Eusko :")}
                                </div>
                            </div>
                            <Input
                                name="amount"
                                data-eusko="cotisation-amount"
                                type="text"
                                validations={validationMemberType}
                                validationErrors={validationMemberTypeError}
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
        if (window.config.profile.has_account_eusko_numerique)
        {
            var formDisplay = (
                <div>
                    <div className="row">
                        <div className="form-group row">
                            <div className="col-sm-5">
                                <h2>Montant de la cotisation</h2>
                            </div>
                        </div>
                        {cotisation_info}
                        {auto_prelev_auto}
                        {__("Pour qu'il n'y ait pas d'interruption dans la cotisation et dans l'accès au compte Eusko,")} <br/>
                        {__("l'échéance pour une période donnée sera prélevée le 20 du mois précédent, par exemple :")}<br/><br/>

                        {__("dans le cas d'un prélèvement annuel, la cotisation sera prélevée le 20 décembre pour l'année suivante")}<br/>
                        {__("dans le cas d'un prélèvement mensuel, la cotisation sera prélevée le 20 de chaque mois pour le mois suivant")}<br/><br/>
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
                </div>
            )
        }
        else
        {
            var formDisplay = (
                <div>
                    <div className="row">
                        <div className="form-group row">
                            <div className="col-sm-5">
                                <h2>Montant de la cotisation</h2>
                            </div>
                        </div>
                        {cotisation_info}
                    </div>
                    <br/>
                {__("Actuellement vous ne possédez pas de compte numérique eusko. Il est donc impossible de mettre à jour votre cotisation par cette interface.")}<br/>
                {__("Afin d'avoir un compte numérique eusko, veuillez contacter Euskal Moneta.")}
                </div>
            )
        }
        return (
            <div className="row" style={this.state.menu ? {marginTop:75} : {}}>
                <CotisationForm ref="historical-form">
                    <div className="row">
                        <div className="form-group row">
                                {memberStatus}
                        </div>
                        <div className="form-group row">
                            <div className="col-sm-3 col-md-offset-1">
                                
                            </div>
                        </div>
                    </div>
                    {formDisplay}
                </CotisationForm>
                <ToastContainer ref="container"
                    toastMessageFactory={ToastMessageFactory}
                    className="toast-top-right toast-top-right-navbar" />
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
