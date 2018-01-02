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
    RadioGroup,
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
            memberType: '9',
            // Si cotisationState == true, cela signifie que l'adhérent est à jour de cotisation
            // et que la page ne doit afficher que la proposition de prélèvement automatique;
            // sinon il faut afficher le formulaire de paiement de la cotisation.
            cotisationState: false,
            period: {    
                label: undefined,
                value: undefined,
            },
            periodicite: 0,
            canSubmit: false,
            selectedPrelevAuto: false,
            amount: '',
            amountByY: 0,
            // selectedOption indique quel est le bouton radio sélectionné dans le formulaire de paiement de la cotisation
            // selectedOption == 0 signifie activation du prélèvement auto
            // selectedOption == 1 signifie paiement pour l'année en cours uniquement
            selectedOption: 0,
            month: new Date().getMonth()+1,
            year: new Date().getFullYear(),
            endMonth: moment().endOf('month').locale('fr').format("YYYY-MM-DDThh:mm"),
            endYear: moment().endOf('year').locale('fr').format("YYYY-MM-DDThh:mm"),
            // dernier mois = décembre par défaut (paiement par prélèvement annuel ou pour l'année en cours uniquement)
            lastMonth: 11,
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
            var p = member[0].array_options.options_prelevement_cotisation_periodicite
            var periodicite = (p > 0) ? p : 12
            this.setState({period:{label: label, value: member[0].array_options.options_prelevement_cotisation_periodicite},
                            periodicite: periodicite,
                            amount: Number(member[0].array_options.options_prelevement_cotisation_montant) * 12 / periodicite,
                            amountByY: member[0].array_options.options_prelevement_cotisation_montant*member[0].array_options.options_prelevement_cotisation_periodicite})
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
            }
            if(member[0].array_options.options_prelevement_auto_cotisation_eusko)
            {
                this.setState({selectedPrelevAuto: true})
            }

        }
        fetchAuth(this.props.url + this.state.memberLogin, 'get', computeMemberData)
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
                this.calculEndDate()
                var formIsValid = (this.state.selectedOption == 0 && this.state.amount > 0 && this.state.periodicite)
                    || (this.state.selectedOption == 1 && this.state.amount > 0);
                this.setState({canSubmit: formIsValid})
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
        //FIXME
        var periodicite = this.state.memberType.startsWith('0') ? this.state.periodicite : parseInt(this.state.period.value)
console.log('calculEndDate()')
console.log('periodicite='+periodicite)
        var intPart = this.state.month / periodicite
        var resPart = this.state.month % periodicite
        var lastMonth
        if (intPart <= 1) 
        {
            lastMonth = periodicite-1
        }
        else if (resPart == 0)
        {
            lastMonth = Math.floor(intPart) * periodicite-1
        }
        else
        {
            lastMonth = (Math.floor(intPart)+1) * periodicite-1
        }
console.log('lastMonth='+lastMonth)
console.log('data2.end_date ='+moment().set('month', lastMonth).endOf('month').locale('fr').format("YYYY-MM-DDThh:mm"))
        this.setState({lastMonth: lastMonth})
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
            // The options in Dolibarr must be updated if:
            // 1) the subscription is up to date (that means that the user is managing his/her options)
            // 2) the subscription is not up to date and the user has selected the 1rst choice
            //    ie he/she does want an automatic direct debit form his/her account.
            var data = {}
            if (this.state.cotisationState) {
                if (this.state.selectedPrelevAuto) {
                    // FIXME
                    if (this.state.memberType.startsWith('0')) {
                        var periodicite = this.state.periodicite
                    } else {
                        var periodicite = this.state.period.value > 0 ? this.state.period.value : 12
                    }
                    data.options_prelevement_auto_cotisation_eusko = true
                    data.options_prelevement_cotisation_montant = this.state.amount / 12 * periodicite
                    // The default value for "Périodicité" is "Annuel"
                    data.options_prelevement_cotisation_periodicite = periodicite
                } else {
                    data.options_prelevement_auto_cotisation_eusko = false
                    data.options_prelevement_cotisation_montant = 0
                    data.options_prelevement_cotisation_periodicite = 0
                }
            } else if (!this.state.cotisationState && this.state.selectedOption == 0) {
                // FIXME
                if (this.state.memberType.startsWith('0')) {
                    var periodicite = this.state.periodicite
                } else {
                    var periodicite = this.state.period.value > 0 ? this.state.period.value : 12
                }
                data.options_prelevement_auto_cotisation_eusko = true
                data.options_prelevement_cotisation_montant = this.state.amount / 12 * periodicite
                // The default value for "Périodicité" is "Annuel"
                data.options_prelevement_cotisation_periodicite = periodicite
            }

            fetchAuth(getAPIBaseURL + "members/" + this.state.member.id + "/", 'PATCH', computeForm, data, promiseError_update)
        }
        if (this.state.cotisationState)
        {
            update_options_dolibarr()
        }

        // Paiement de la cotisation due depuis le début de l'année.
        // Si mise en place d'un prélèvement mensuel, paiement de toutes les mensualités jusqu'au mois en cours.
        // Sinon (i.e. si paiement pour l'année en cours uniquement ou mise en place d'un prélèvement annuel), paiement pour l'année entière.
        if (!this.state.cotisationState)
        {
            var data2 = {}
            data2.start_date = this.state.beginYear
            //FIXME
            var periodicite = this.state.memberType.startsWith('0') ? this.state.periodicite : this.state.period.value
            if (this.state.selectedOption == 0 && periodicite == 1)
            {
                data2.end_date = moment().set('month', this.state.lastMonth).endOf('month').locale('fr').format("YYYY-MM-DDThh:mm")
                data2.amount = this.state.amount / 12 * this.state.month
            }
            else
            {
                data2.end_date = this.state.endYear
                data2.amount = this.state.amount
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
                             canSubmit: false, selectedPrelevAuto: true}
            }
            else if (event.target.value == 1)
            {
                var state = {selectedOption: 1, amountByY: '', amount: '',
                             canSubmit: false, selectedPrelevAuto: false}
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
    },

    radioAutorisationPrelevementChanged(name, value) {
        if (value == '1') {
            this.setState({periodicite: 12})
        }
        this.setState({selectedOption: Number(value), selectedPrelevAuto: value=='0'}, this.ValidationCheck)
    },

    amountChanged(name, value) {
        if (value == '5') {
            this.setState({periodicite: 12})
        }
        this.setState({amount: Number(value)}, this.ValidationCheck)
    },

    periodiciteChanged(name, value) {
        this.setState({periodicite: Number(value)}, this.ValidationCheck)
    },

    render() {
        var greySimpleSelect = classNames({
            'grey-back': this.state.selectedOption,
        })

        var greySimpleSelect_noautorization = classNames({
            'grey-back': !this.state.selectedPrelevAuto,
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
        }
        else
        {
            if (this.state.memberType.startsWith('1'))
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
            if (this.state.memberType.startsWith('1')) {
            // pour les pros, on garde l'ancien code pour l'instant
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
            } else {
                // pour les particuliers, nouveau code
                var title
                if (this.state.cotisationState) {
                    title = __("Prélèvement de la cotisation")
                } else {
                    title = __("Paiement de la cotisation")
                }

                if (this.state.cotisationState) {
                    // Sur la page de gestion de la cotisation (dans son
                    // profil), l'adhérent a le choix entre activer ou pas
                    // le prélèvement automatique de sa cotisation (avec une
                    // case à cocher).
                    var autorisation_prelevement = (
                        <div className="form-group row">
                            <div className="col-sm-1 col-md-offset-1">
                                <input type="checkbox" name="AllowSample" checked={this.state.selectedPrelevAuto} onChange={this.checkboxOnChange} style={{float:'right'}}/>
                            </div>
                            <div className="col-sm-9" style={{marginBottom: 15}}>
                                {__("J'autorise Euskal Moneta à prélever automatiquement ma cotisation sur mon compte Eusko.")}
                            </div>
                        </div>
                    )
                } else {
                    // Sur la page de paiement de la cotisation, l'adhérent
                    // a le choix entre mettre en place un prélèvement et
                    // payer uniquement la cotisation pour l'année en cours.
                    // On lui présente ces 2 choix avec des boutons radio.
                    var autorisation_prelevement = (
                        <div className="form-group row">
                            <div className="col-sm-9">
                                <RadioGroup
                                    name="autorisation_prelevement"
                                    label={__("Prélèvement automatique ou paiement ponctuel")}
                                    value={''+this.state.selectedOption}
                                    options={[
                                        {value: '0', label: __("J'autorise Euskal Moneta à prélever automatiquement ma cotisation sur mon compte Eusko.")},
                                        {value: '1', label: __("Je paie ma cotisation pour l'année en cours uniquement.")},
                                    ]}
                                    required
                                    onChange={this.radioAutorisationPrelevementChanged}
                                />
                            </div>
                        </div>
                    )
                }

                var choix_montant = (
                    <div className="form-group row">
                        <div className="col-sm-9">
                            <RadioGroup
                                name="amount"
                                data-eusko="memberaddsubscription-amount"
                                value={''+this.state.amount}
                                label={__("Montant de la cotisation")}
                                options={[
                                    {value: '12', label: '1 eusko par mois / 12 eusko par an'},
                                    {value: '24', label: '2 eusko par mois / 24 eusko par an'},
                                    {value: '36', label: '3 eusko par mois / 36 eusko par an'},
                                    {value: '5', label: __("5 eusko par an (chômeurs, minima sociaux)")},
                                ]}
                                required
                                onChange={this.amountChanged}
                            />
                        </div>
                    </div>
                )

                var choix_periodicite = (
                    <div className="form-group row">
                        <div className="col-sm-9">
                            <RadioGroup
                                name="periodicite"
                                data-eusko="memberaddsubscription-periodicite"
                                value={''+this.state.periodicite}
                                label={__("Périodicité du prélèvement")}
                                options={[
                                    {value: '12', label: __("Annuel")},
                                    {value: '1', label: __("Mensuel (le 15 du mois)")},
                                ]}
                                required={this.state.selectedOption==0}
                                disabled={(this.state.selectedOption==0 && this.state.amount==5) || this.state.selectedOption==1}
                                onChange={this.periodiciteChanged}
                            />
                        </div>
                    </div>
                )

                var formDisplay = (
                    <div>
                        <div className="row">
                            <div className="form-group row">
                                <div className="col-sm-5">
                                    <h2>{title}</h2>
                                </div>
                            </div>
                        </div>
                        {autorisation_prelevement}
                        {choix_montant}
                        {choix_periodicite}
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
