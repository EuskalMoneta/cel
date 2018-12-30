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

const {
    ToastContainer
} = ReactToastr
const ToastMessageFactory = React.createFactory(ReactToastr.ToastMessage.animation)

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
            // Si cotisationState == true, cela signifie que l'adhérent est à jour de cotisation
            // et que la page ne doit afficher que la proposition de prélèvement automatique;
            // sinon il faut afficher le formulaire de paiement de la cotisation.
            cotisationState: false,
            periodicite: 0,
            canSubmit: false,
            selectedPrelevAuto: false,
            amount: '',
            // selectedOption indique quel est le bouton radio sélectionné dans le formulaire de paiement de la cotisation
            // selectedOption == 0 signifie activation du prélèvement auto
            // selectedOption == 1 signifie paiement pour l'année en cours uniquement
            selectedOption: 0,
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
            var p = member[0].array_options.options_prelevement_cotisation_periodicite
            var periodicite = (p > 0) ? p : 12
            var amount
            if (this.state.member.login.toUpperCase().startsWith('Z')) {
                amount = this.state.member.array_options.options_montant_cotisation_annuelle
            } else if (this.state.member.login.toUpperCase().startsWith('E')) {
                amount = Number(this.state.member.array_options.options_prelevement_cotisation_montant) * 12 / periodicite
            }
            this.setState({periodicite: periodicite,
                           amount: amount,
                           selectedPrelevAuto: this.state.member.array_options.options_prelevement_auto_cotisation_eusko},
                          this.ValidationCheck)
        }
        fetchAuth(this.props.url + this.state.memberLogin, 'get', computeMemberData)
    },

    ValidationCheck() {
        if (this.state.cotisationState) {
            var formIsValid = !this.state.selectedPrelevAuto || (this.state.selectedPrelevAuto && this.state.amount)
        } else {
            var formIsValid = (this.state.selectedOption == 0 && this.state.amount > 0 && this.state.periodicite)
                || (this.state.selectedOption == 1 && this.state.amount > 0)
        }
        this.setState({canSubmit: formIsValid})
    },

    checkboxOnChange(event, value) {
        // update pin values
        if (event.target.name == 'AllowSample') {
            this.setState({selectedPrelevAuto: event.target.checked}, this.ValidationCheck)
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
                __("Une erreur s'est produite lors du paiement de la cotisation. Le solde de votre compte n'est peut-être pas être suffisant. Veuillez contacter Euskal Moneta."),
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
                __("Une erreur s'est produite lors de la modification de vos échéances de cotisation. Veuillez contacter Euskal Moneta."),
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
                    data.options_prelevement_auto_cotisation_eusko = true
                    data.options_prelevement_cotisation_montant = this.state.amount * this.state.periodicite / 12
                    data.options_prelevement_cotisation_periodicite = this.state.periodicite
                } else {
                    data.options_prelevement_auto_cotisation_eusko = false
                    data.options_prelevement_cotisation_montant = 0
                    data.options_prelevement_cotisation_periodicite = 0
                }
            } else if (!this.state.cotisationState && this.state.selectedOption == 0) {
                data.options_prelevement_auto_cotisation_eusko = true
                data.options_prelevement_cotisation_montant = this.state.amount * this.state.periodicite / 12
                data.options_prelevement_cotisation_periodicite = this.state.periodicite
            }

            fetchAuth(getAPIBaseURL + "members/" + this.state.member.id + "/", 'PATCH', computeForm, data, promiseError_update)
        }

        if (this.state.cotisationState) {
            update_options_dolibarr()
        }

        // Paiement de la cotisation.
        // Si mise en place d'un prélèvement mensuel, paiement pour le mois en cours.
        // Sinon (i.e. si paiement pour l'année en cours uniquement ou mise en place d'un prélèvement annuel), paiement pour l'année entière.
        if (!this.state.cotisationState) {
            var data2 = {}
            // date de début = maintenant
            data2.start_date = moment().format("YYYY-MM-DDThh:mm")
            if (this.state.selectedOption == 0 && this.state.periodicite == 1) {
                data2.end_date = moment().endOf('month').format("YYYY-MM-DDThh:mm")
                data2.amount = this.state.amount / 12
            } else {
                data2.end_date = moment().endOf('year').format("YYYY-MM-DDThh:mm")
                data2.amount = this.state.amount
            }
            data2.label = 'Cotisation ' + moment().year()
            fetchAuth(getAPIBaseURL + "member-cel-subscription/", 'POST', update_options_dolibarr, data2, promiseError_subscription)
        }
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

        if (window.config.profile.has_account_eusko_numerique) {
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
                    <RadioGroup
                        name="autorisation_prelevement"
                        label={__("Prélèvement automatique ou paiement ponctuel")}
                        value={''+this.state.selectedOption}
                        options={[
                            {value: '0', label: __("J'autorise Euskal Moneta à prélever automatiquement ma cotisation sur mon compte Eusko")
                                + (this.state.member.login.toUpperCase().startsWith('Z') ? __(", une fois par an, en janvier.") : ".")},
                            {value: '1', label: __("Je paie ma cotisation pour l'année en cours uniquement.")},
                        ]}
                        required
                        onChange={this.radioAutorisationPrelevementChanged}
                    />
                )
            }

            // Affichage du montant (pour les pros uniquement).
            // Pour les pros, le montant de la cotisatio est
            // déterminé à l'avance, on doit simplement l'afficher.
            var affichage_montant = (
                <div className="form-group row">
                    <label className="control-label col-sm-3">
                        {__("Montant de la cotisation annuelle")}
                    </label>
                    <div className="col-sm-9 control-label text-align-left">
                        {this.state.amount + " eusko"}
                    </div>
                </div>
            )

            // Choix du montant (pour les particuliers uniquement).
            var choix_montant = (
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
            )

            // Choix de la périodicité (pour les particuliers
            // uniquement; pour les pros le prélèvement est
            // forcément annuel, ce qui est la valeur par défaut au
            // chargement de la page, et ce champ est masqué).
            var choix_periodicite = (
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
            )

            var formDisplay = (
                <div>
                    <div className="row">
                        <div className="form-group row">
                            <div className="col-sm-12">
                                <h2>{title}</h2>
                            </div>
                        </div>
                    </div>
                    {this.state.member.login.toUpperCase().startsWith('Z') && affichage_montant}
                    {autorisation_prelevement}
                    {this.state.member.login.toUpperCase().startsWith('E') && choix_montant}
                    {this.state.member.login.toUpperCase().startsWith('E') && choix_periodicite}
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
            var formDisplay = (
                <div>
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
})

ReactDOM.render(
    <Cotisation url={getAPIBaseURL + "members/?login="} postUrl={getAPIBaseURL + "members/"} />,
    document.getElementById('cotisation')
)
document.title = __("Mon profil") + ": " + __("Cotisation") + " - " + __("Compte en ligne") + " " + document.title
