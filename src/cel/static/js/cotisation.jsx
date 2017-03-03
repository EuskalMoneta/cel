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
        }
    },

    componentDidMount() {
        var computeMemberData = (member) => {
            this.setState({member: member[0]})
        }
        fetchAuth(this.props.url + this.state.memberLogin, 'get', computeMemberData)

    },

    setAmount(value) {
        this.setState(value, this.validateForm)
    },

    render() {
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
        moment.locale(getCurrentLang)
        if (this.state.member) {
            var dateEndSub = moment.unix(this.state.member.datefin).format('DD MMMM YYYY');

            // Whether or not, we have an up-to-date member subscription
            if (moment.unix(this.state.member.datefin) > moment()) {
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
        if(this.state.member.login.toUpperCase().startsWith('Z')) {
            if(this.state.member.type == 'Entreprise') {
                var cotisation_info = (
                    <span> 
                    {__("Montant de la cotisation :")}<br/><br/> 
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
                    {__("Montant de la cotisation annuelle :")}<br/><br/> 
                    {__("de 10 à 100 € / eusko ou plus, selon les possiblités de l'association.")}<br/><br/>
                    </span>
                ) 
            }
        }
        else {
            var cotisation_info = (
                <span> 
                {__("Montant de la cotisation annuelle :")}<br/><br/>
                {__("5 € / eusko (bas revenus)")}<br/>
                {__("10 € / eusko (cotisation normale)")}<br/>
                {__("20 € / eusko ou plus (cotisation de soutien)")}<br/><br/>
                </span>
                ) 
        }
        if (moment.unix(this.state.member.datefin) > moment()) {
            if(this.state.member.login.toUpperCase().startsWith('Z')) {
                var auto_prelev_auto = (
                    <span>
                        <div className="row">
                            <div className="row">
                                <div className="col-sm-1 col-md-offset-1">
                                    <input type="checkbox" checked={this.state.selectedPrelevAuto == 1} onChange={this.checkboxOnChange}/>
                                </div>
                                <div className="col-sm-9 ">
                                {__("J'autorise Euskal Moneta à prélever automatiquement ma cotisation sur mon compte Eusko, selon l'échéancier suivant :")}
                                </div>
                            </div>
                            <div className="form-group row">
                                <label
                                    className="control-label col-sm-2 col-md-offset-1"
                                    data-required="true"
                                    htmlFor="memberaddsubscription-amount">
                                    {__("Montant :")}
                                </label>
                                <div className="col-sm-5 memberaddsubscription" data-eusko="memberaddsubscription-amount">
                                        <Input
                                            name="amount"
                                            data-eusko="cotisation-amount"
                                            onChange={true}
                                            value = {true}
                                        />
                                </div>
                            </div>
                            <div className="form-group row">
                                <label
                                    className="control-label col-sm-2 col-md-offset-1"
                                    data-required="true"
                                    htmlFor="memberaddsubscription-amount">
                                    {__("Périodicité :")}
                                </label>
                                <div className="col-sm-5 memberaddsubscription col-md-offset-1" data-eusko="memberaddsubscription-amount">
                                    <SimpleSelect
                                        ref="select"
                                        theme="bootstrap3"
                                        onValueChange={this.dateOnValueChange}
                                        value = {this.state.selectedValue}
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
                            <div className="form-group row">
                                <label
                                    className="control-label col-sm-2 col-md-offset-1"
                                    data-required="true"
                                    htmlFor="memberaddsubscription-amount">
                                    {__("Montant de cotisation annuelle :")}
                                </label>
                                <div className="col-sm-5 memberaddsubscription col-md-offset-1" data-eusko="memberaddsubscription-amount">
                                <label>
                                    {__("xxx eusko")}
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
                        <div className="row">
                            <div className="row">
                                <div className="col-sm-1 col-md-offset-1">
                                    <input type="checkbox" checked={this.state.selectedPrelevAuto == 1} onChange={this.checkboxOnChange}/>
                                </div>
                                <div className="col-sm-9 ">
                                {__("J'autorise Euskal Moneta à prélever automatiquement ma cotisation sur mon compte Eusko, selon l'échéancier suivant :")}
                                </div>
                            </div>
                            <div className="form-group row">
                                <label
                                    className="control-label col-sm-3"
                                    data-required="true"
                                    htmlFor="memberaddsubscription-amount">
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
                                        onClick={() => this.setAmount({amount: undefined, customAmount: '20', displayCustomAmount: true,
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
                                    className="control-label col-sm-2 col-md-offset-1"
                                    data-required="true"
                                    htmlFor="memberaddsubscription-amount">
                                    {__("Périodicité :")}
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
        return (
            <div className="row">
                <CotisationForm ref="historical-form">
                    <div className="row">
                        <div className="form-group row">
                            <div className="col-sm-3 col-md-offset-9">
                                {memberStatus}
                            </div>
                        </div>
                    </div>
                    <div className="row">
                        {cotisation_info}
                        {auto_prelev_auto}
                        Pour qu'il n'y ait pas d'interruption dans la cotisation et dans l'accès au compte Eusko, <br/>
                        l'échéance pour une période donnée sera prélevée le 20 du mois précédent, par exemple :<br/><br/>

                        dans le cas d'un prélèvement annuel, la cotisation sera prélevée le 20 décembre pour l'année suivante<br/>
                        dans le cas d'un prélèvement mensuel, la cotisation sera prélevée le 20 de chaque mois pour le mois suivant<br/><br/>



                        <br/><br/><br/>
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