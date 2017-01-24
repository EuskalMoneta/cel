import {
    fetchAuth,
    titleCase,
    getAPIBaseURL,
    NavbarTitle,
    getCurrentLang,
    SelectizeUtils,
} from 'Utils'

const {
    Input,
    RadioGroup,
    Row,
    Textarea,
} = FRC

import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'

import ReactSelectize from 'react-selectize'
const SimpleSelect = ReactSelectize.SimpleSelect

const {
    ToastContainer
} = ReactToastr
const ToastMessageFactory = React.createFactory(ReactToastr.ToastMessage.animation)


Formsy.addValidationRule('isValidPhoneNumber', (values, value) =>
{
    if (!value) {
        return false;
    }

    if (value.indexOf('.') === -1 && value.indexOf(' ') === -1) {
        return true;
    }
    else {
        return false;
    }
})

const ProfilForm = React.createClass({

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

const MemberShow = React.createClass({

    getInitialState() {
        return {
            memberLogin: window.config.userName,
            member: null,
            canSubmit: false,
            validFields: false,
            validCustomFields: false,
            login: undefined,
            country: undefined,
            zip: undefined,
            zipSearch: undefined,
            zipList: undefined,
            town: undefined,
            townList: undefined,
            birth: undefined,
            phone: undefined,
            email: undefined,
            recevoirActus: false,
            assoSaisieLibre: false,
            fkAsso: undefined,
            fkAsso2: undefined,
            fkAssoAllList: undefined,
            fkAssoApprovedList: undefined,
        }
    },


    componentDidMount() {
        // Get member data
        var computeMemberData = (member) => {
            // this.setState({member: member[0]})
            this.setState({member: member[0],
                           recevoirActus: member[0].array_options.options_recevoir_actus == "1" ? "1" : "0",
                           zip: {label: member[0].zip + " - " + member[0].town,
                                 town: member[0].town, value: member[0].zip},
                           town: {label: member[0].town, value: member[0].town}})
        }
        fetchAuth(this.props.url + this.state.memberLogin, 'get', computeMemberData)

        // Get countries for the country selector
        var computeCountries = (countries) => {
            var france = _.findWhere(countries, {label: "France"})
            var france = {label: "France", value: france.id}

            var res = _.chain(countries)
                .filter(function(item){ return item.active == 1 && item.code != "" &&  item.label != "France" })
                .map(function(item){ return {label: item.label, value: item.id} })
                .sortBy(function(item){ return item.label })
                .value()

            // We add France at first position of the Array, and we set it as the default value
            res.unshift(france)
            this.setState({countries: res, country: france})
        }
        fetchAuth(getAPIBaseURL + "countries/", 'get', computeCountries)

        // Get all associations (no filter): fkAssoAllList
        var computeAllAssociations = (associations) => {
            var res = _.chain(associations)
                .map(function(item){
                    if (item.nb_parrains == "0")
                        var label = item.nom + " – " + __("Aucun parrain")
                    else if (item.nb_parrains == "1")
                        var label = item.nom + " – " + item.nb_parrains + " " + __("parrain")
                    else
                        var label = item.nom + " – " + item.nb_parrains + " " + __("parrains")
                    return {label: label, value: item.id}
                })
                .sortBy(function(item){ return item.label })
                .value()

            this.setState({fkAssoAllList: res})
        }
        fetchAuth(getAPIBaseURL + "associations/", 'get', computeAllAssociations)

        // Get only approved associations: fkAssoApprovedList
        var computeApprovedAssociations = (associations) => {
            var res = _.chain(associations)
                .map(function(item){
                    if (item.nb_parrains == "0")
                        var label = item.nom + " – " + __("Aucun parrain")
                    else if (item.nb_parrains == "1")
                        var label = item.nom + " – " + item.nb_parrains + " " + __("parrain")
                    else
                        var label = item.nom + " – " + item.nb_parrains + " " + __("parrains")
                    return {label: label, value: item.id}
                })
                .sortBy(function(item){ return item.label })
                .value()

            this.setState({fkAssoApprovedList: res})
        }
        fetchAuth(getAPIBaseURL + "associations/?approved=yes", 'get', computeApprovedAssociations)
    },

    enableButton() {
        this.setState({canSubmit: true})
    },

    disableButton() {
        this.setState({canSubmit: false})
    },

    validFields() {
        this.setState({validFields: true})

        if (this.state.validCustomFields)
            this.enableButton()
    },

    validateFormOnBlur() {
        if (this.state.birth && this.state.zip && this.state.town && this.state.country)
        {
            this.setState({validCustomFields: true})

            if (this.state.validFields)
                this.enableButton()
        }
        else
            this.disableButton()
    },

    onFormChange(event, value) {
        this.setState({[event]: value}, this.validateFormOnBlur)
    },

    // zip
    zipOnSearchChange(search) {
        this.setState({zipSearch: search})
        // Search for towns for this zipcode for France only
        if (search.length >= 4 && this.state.country.label == "France") {
            // We use fetch API to ... fetch towns for this zipcode
            var computeTowns = (towns) => {
                var zipList = _.chain(towns)
                    .map(function(item){ return {label: item.zip + " - " + item.town, value: item.zip, town: item.town} })
                    .sortBy(function(item){ return item.label })
                    .value()

                var townList = _.chain(towns)
                    .map(function(item){ return {label: item.town, value: item.town} })
                    .sortBy(function(item){ return item.label })
                    .value()

                this.setState({zipList: zipList, townList: townList})
            }
            fetchAuth(getAPIBaseURL + "towns/?zipcode=" + search, 'get', computeTowns)
        }
    },

    zipRenderNoResultsFound(item, search) {
        var message = ""

        // We have a search term (not empty)
        if (search)
        {
            // We have a sinificative search term
            if (search.length < 4)
                message = __("Taper 4 chiffres minimum ...")
            else
            {
                // We have a positive result (zip+town list) for this search term
                if (this.state.zipList == undefined)
                    message = __("Pas de résultat")
            }
        }
        else
            message = __("Taper 4 chiffres minimum ...")

        if (message) {
            return  <div className="no-results-found" style={{fontSize: 15}}>
                        {message}
                    </div>
        }
    },

    zipOnValueChange(item) {
        if (item) {
            this.setState({zip: item, town: {label: item.town, value: item.town}})
        }
        else
            this.setState({zip: undefined, town: undefined})
    },

    zipRenderValue(item) {
        // When we select a value, this is how we display it
        return  <div className="simple-value">
                    <span className="profilform" style={{marginLeft: 10, verticalAlign: "middle"}}>{item.value}</span>
                </div>
    },

    zipOnBlur () {
        this.setState({zipList: undefined, townList: undefined})
    },

    // town
    townOnValueChange(item) {
        this.setState({town: item})
    },

    // country
    countryOnValueChange(item) {
        this.setState({country: item})
    },

    // fkasso
    fkAssoOnValueChange(item) {
        if (item) {
            if (item.newOption)
                this.setState({assoSaisieLibre: true})
            this.setState({fkAsso: item})
        }
        else {
            this.setState({assoSaisieLibre: false})
            this.setState({fkAsso: undefined})
        }
    },

    // fkasso2
    fkAsso2OnValueChange(item) {
        this.setState({fkAsso2: item})
    },

    handleBirthChange(date) {
        this.setState({birth: date});
    },

    render() {
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

        return (
            <div className="row">
                <ProfilForm
                    onValidSubmit={this.buildForm}
                    onInvalid={this.disableButton}
                    onValid={this.validFields}
                    ref="profil-form">
                    <fieldset>
                        <div className="form-group row">
                            <label className="control-label col-sm-2">{__("N° Adhérent")}</label>
                            <div className="col-sm-3 profil-span">
                                <span data-eusko="profil-login">{this.state.member.login}</span>
                            </div>
                            <div className="col-sm-3">
                                {memberStatus}
                            </div>
                        </div>
                        <div className="form-group row">
                            <label className="control-label col-sm-2">{__("Nom")}</label>
                            <div className="col-sm-3 profil-span">
                                <span data-eusko="profil-lastname">{this.state.member.lastname}</span>
                            </div>

                            <label className="control-label col-sm-1">{__("Prénom")}</label>
                            <div className="col-sm-3 profil-span">
                                <span data-eusko="profil-firstname">{this.state.member.firstname}</span>
                            </div>
                        </div>
                        <div className="form-group row">
                            <label
                                className="control-label col-sm-2"
                                data-required="true"
                                htmlFor="profilform-birth">
                                {__("Date de naissance")}
                                <span className="required-symbol">&nbsp;*</span>
                            </label>
                            <div className="col-sm-3 profilform-birth" data-eusko="profilform-birth">
                                <DatePicker
                                    name="birth"
                                    className="form-control"
                                    placeholderText={__("Date de naissance")}
                                    selected={moment(this.state.member.birth)}
                                    onChange={this.handleBirthChange}
                                    showYearDropdown
                                    locale="fr"
                                />
                            </div>
                        </div>
                        <Textarea
                            name="address"
                            data-eusko="profilform-address"
                            value={this.state.member.address ? this.state.member.address : ""}
                            label={__("Adresse postale")}
                            type="text"
                            placeholder={__("Adresse postale")}
                            labelClassName={[{'col-sm-3': false}, 'col-sm-2']}
                            elementWrapperClassName={[{'col-sm-9': false}, 'col-sm-4']}
                            rows={3}
                            required
                        />
                        <div className="form-group row">
                            <label
                                className="control-label col-sm-2"
                                data-required="true"
                                htmlFor="profilform-zip">
                                {__("Code Postal")}
                                <span className="required-symbol">&nbsp;*</span>
                            </label>
                            <div className="col-sm-3 profilform" data-eusko="profilform-zip">
                                <SimpleSelect
                                    ref="select"
                                    value={this.state.zip}
                                    search={this.state.zipSearch}
                                    options={this.state.zipList}
                                    placeholder={__("Code Postal")}
                                    theme="bootstrap3"
                                    autocomplete="off"
                                    createFromSearch={SelectizeUtils.selectizeCreateFromSearch}
                                    onSearchChange={this.zipOnSearchChange}
                                    onValueChange={this.zipOnValueChange}
                                    renderOption={SelectizeUtils.selectizeRenderOption}
                                    renderValue={this.zipRenderValue}
                                    onBlur={this.zipOnBlur}
                                    renderNoResultsFound={this.zipRenderNoResultsFound}
                                    required
                                />
                            </div>
                            <label
                                className="control-label col-sm-1"
                                data-required="true"
                                htmlFor="profilform-town">
                                {__("Ville")}
                                <span className="required-symbol">&nbsp;*</span>
                            </label>
                            <div className="col-sm-3 profil-town-div">
                                <div className="profilform profil-town" data-eusko="profilform-town">
                                    <SimpleSelect
                                        ref="select"
                                        value={this.state.town}
                                        options={this.state.townList}
                                        placeholder={__("Ville")}
                                        autocomplete="off"
                                        theme="bootstrap3"
                                        createFromSearch={SelectizeUtils.selectizeCreateFromSearch}
                                        onValueChange={this.townOnValueChange}
                                        renderValue={SelectizeUtils.selectizeRenderValue}
                                        onBlur={this.validateFormOnBlur}
                                        renderNoResultsFound={SelectizeUtils.selectizeNoResultsFound}
                                        required
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="form-group row">
                            <label
                                className="control-label col-sm-2"
                                data-required="true"
                                htmlFor="profilform-country">
                                {__("Pays")}
                                <span className="required-symbol">&nbsp;*</span>
                            </label>
                            <div className="col-sm-3 profilform" data-eusko="profilform-country">
                                <SimpleSelect
                                    ref="select"
                                    value={this.state.country}
                                    options={this.state.countries}
                                    placeholder={__("Pays")}
                                    autocomplete="off"
                                    theme="bootstrap3"
                                    onValueChange={this.countryOnValueChange}
                                    renderOption={SelectizeUtils.selectizeNewRenderOption}
                                    renderValue={SelectizeUtils.selectizeRenderValue}
                                    onBlur={this.validateFormOnBlur}
                                    renderNoResultsFound={SelectizeUtils.selectizeNoResultsFound}
                                    required
                                />
                            </div>
                        </div>
                        <div className="form-group row">
                            <label className="control-label col-sm-2">{__("N° téléphone")}</label>
                            <div className="col-sm-3">
                                <Input
                                    name="phone"
                                    data-eusko="profilform-phone"
                                    value={this.state.member.phone ? this.state.member.phone : ""}
                                    layout="elementOnly"
                                    type="tel"
                                    placeholder={__("N° téléphone")}
                                    validations="isValidPhoneNumber"
                                    validationErrors={{
                                        isValidPhoneNumber: __("Ceci n'est pas un N° téléphone valide. Evitez les points et les espaces.")
                                    }}
                                    elementWrapperClassName={[{'col-sm-9': false}, 'col-sm-4']}
                                    onChange={this.onFormChange}
                                />
                            </div>

                            <label className="control-label col-sm-1">{__("Email")}</label>
                            <div className="col-sm-3">
                                <Input
                                    name="email"
                                    data-eusko="profilform-email"
                                    value={this.state.member.email ? this.state.member.email : ""}
                                    layout="elementOnly"
                                    type="email"
                                    placeholder={__("Email de l'adhérent")}
                                    validations="isEmail"
                                    validationErrors={{
                                        isEmail: __("Adresse email non valide")
                                    }}
                                    elementWrapperClassName={[{'col-sm-9': false}, 'col-sm-4']}
                                    onChange={this.onFormChange}
                                    required
                                />
                            </div>
                        </div>
                        <RadioGroup
                            name="options_recevoir_actus"
                            data-eusko="profilform-options-recevoir-actus"
                            type="inline"
                            value={this.state.recevoirActus}
                            label={__("Souhaite être informé des actualités liées à l'eusko")}
                            help={__("Vous recevrez un à deux mails par semaine.")}
                            options={[{value: '1', label: __('Oui')},
                                      {value: '0', label: __('Non')}
                            ]}
                            labelClassName={[{'col-sm-3': false}, 'col-sm-2']}
                            elementWrapperClassName={[{'col-sm-9': false}, 'col-sm-4']}
                            required
                        />
                        <div className="form-group row">
                            <label
                                className="control-label col-sm-2"
                                data-required="true"
                                htmlFor="profilform-asso">
                                {__("Choix Association 3% #1")}
                            </label>
                            <div className="col-sm-3 profilform" data-eusko="profilform-asso">
                                <SimpleSelect
                                    ref="select"
                                    value={this.state.fkAsso}
                                    options={this.state.fkAssoAllList}
                                    placeholder={__("Choix Association 3% #1")}
                                    theme="bootstrap3"
                                    createFromSearch={SelectizeUtils.selectizeCreateFromSearch}
                                    onValueChange={this.fkAssoOnValueChange}
                                    renderValue={SelectizeUtils.selectizeRenderValue}
                                    renderOption={SelectizeUtils.selectizeNewRenderOption}
                                    onBlur={this.validateFormOnBlur}
                                    renderNoResultsFound={SelectizeUtils.selectizeNoResultsFound}
                                />
                            </div>
                            <label
                                className="control-label col-sm-1"
                                data-required="true"
                                htmlFor="profilform-asso2">
                                {__("Choix #2")}
                            </label>
                            <div className="col-sm-3 profilform" data-eusko="profilform-asso2">
                                <SimpleSelect
                                    ref="select"
                                    value={this.state.fkAsso2}
                                    options={this.state.fkAssoApprovedList}
                                    placeholder={__("Choix Association 3% #2")}
                                    theme="bootstrap3"
                                    onValueChange={this.fkAsso2OnValueChange}
                                    renderOption={SelectizeUtils.selectizeRenderOption}
                                    renderValue={SelectizeUtils.selectizeRenderValue}
                                    onBlur={this.validateFormOnBlur}
                                    renderNoResultsFound={SelectizeUtils.selectizeNoResultsFound}
                                />
                            </div>
                        </div>
                    </fieldset>
                    <div className="row profil-div-margin-left margin-top">
                        <a href="/" className="btn btn-default">
                           {__("Annuler")}
                        </a>
                        <a href={"/members/reconversion/" + this.state.member.id}
                           className="btn btn-success col-sm-offset-2">
                           {__("Valider")}
                        </a>
                    </div>
                </ProfilForm>
            </div>
        )
    }
})


ReactDOM.render(
    <MemberShow url={getAPIBaseURL + "members/?login="} method="GET" />,
    document.getElementById('adherent')
)

ReactDOM.render(
    <NavbarTitle title={__("Fiche adhérent")} />,
    document.getElementById('navbar-title')
)