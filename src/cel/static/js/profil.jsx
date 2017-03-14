import {
    fetchAuth,
    titleCase,
    getAPIBaseURL,
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
            address: undefined,
            country: undefined,
            zip: undefined,
            zipSearch: '',
            zipList: undefined,
            town: undefined,
            townList: undefined,
            birth: undefined,
            phone: undefined,
            email: undefined,
        }
    },

    componentDidMount() {
        // Get member data
        var computeMemberData = (member) => {
            moment.locale(getCurrentLang)

            if (member[0].birth) {
                var birth = moment(member[0].birth, 'X')
            }
            else {
                var birth = undefined
            }

            if (member[0].phone_mobile)
                var phone = member[0].phone_mobile
            else
                var phone = member[0].phone_perso

            this.setState({member: member[0],
                           address: member[0].address, phone: phone, email: member[0].email,
                           birth: birth,
                           zip: {label: member[0].zip + " - " + member[0].town,
                                 town: member[0].town, value: member[0].zip},
                           town: {label: member[0].town, value: member[0].town},
                           country: {label: member[0].country, value: member[0].country_id}},
                           this.validateForm)

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

            // We add France at first position of the Array
            res.unshift(france)
            this.setState({countries: res})
        }
        fetchAuth(getAPIBaseURL + "countries/", 'get', computeCountries)
    },

    enableButton() {
        this.setState({canSubmit: true})
    },

    disableButton() {
        this.setState({canSubmit: false})
    },

    validateForm() {
        if (this.state.birth && this.state.zip && this.state.town && this.state.country &&
            this.state.address && this.state.email)
        {
            this.setState({validFields: true}, this.enableButton)
        }
        else
            this.disableButton()
    },

    onFormChange(event, value) {
        this.setState({[event]: value}, this.validateForm)
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

    handleBirthChange(date) {
        this.setState({birth: date});
    },

    submitForm() {
        this.disableButton()

        // We push fields into the data object that will be passed to the server
        var data = {birth: this.state.birth.format('DD/MM/YYYY'),
                    address: this.state.address,
                    zip: this.state.zip.value,
                    town: this.state.town.value,
                    country_id: this.state.country.value,
                    email: this.state.email,
        }

        if (this.state.phone)
            data.phone = this.state.phone

        var computeForm = (data) => {
            this.refs.container.success(
                __("La modification de votre profil adhérent s'est déroulée correctement."),
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
                __("Une erreur s'est produite lors de la modification de votre profil adhérent !"),
                "",
                {
                    timeOut: 3000,
                    extendedTimeOut: 10000,
                    closeButton:true
                }
            )
        }
        fetchAuth(this.props.postUrl + this.state.member.id + "/", 'PATCH', computeForm, data, promiseError)
    },

    render() {
        moment.locale(getCurrentLang)
        if (this.state.member) {
            // Whether or not, we have a business member or a individual
            if (this.state.member.type.toLowerCase() != 'particulier') {
                // We have a business member
                var memberName = (
                    <div className="form-group row">
                        <label className="control-label col-sm-2">{__("Nom")}</label>
                        <div className="col-sm-3 profil-span">
                            <span data-eusko="profil-company">{this.state.member.company}</span>
                        </div>
                    </div>
                )
            }
            else {
                // We have a individual member
                var memberName = (
                    <div className="form-group row">
                        <label className="control-label col-sm-2">{__("Nom")}</label>
                        <div className="col-sm-3 profil-span">
                            <span data-eusko="profil-fullname">
                                {this.state.member.firstname + " " + this.state.member.lastname}
                            </span>
                        </div>
                    </div>
                )
            }
        }
        else
            return null

        return (
            <div className="row">
                <ProfilForm
                    onInvalid={this.validateForm}
                    onValid={this.validateForm}
                    ref="profil-form">
                    <fieldset>
                        <div className="form-group row">
                            <label className="control-label col-sm-2">{__("N° Adhérent")}</label>
                            <div className="col-sm-3 profil-span">
                                <span data-eusko="profil-login">{this.state.member.login}</span>
                            </div>
                        </div>
                        {memberName}
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
                                    selected={moment(this.state.birth)}
                                    onChange={this.handleBirthChange}
                                    showYearDropdown
                                    locale="fr"
                                />
                            </div>
                        </div>
                        <Textarea
                            name="address"
                            data-eusko="profilform-address"
                            value={this.state.address ? this.state.address : ""}
                            label={__("Adresse postale")}
                            type="text"
                            onChange={this.onFormChange}
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
                        </div>
                        <div className="form-group row">
                            <label
                                className="control-label col-sm-2"
                                data-required="true"
                                htmlFor="profilform-town">
                                {__("Ville")}
                                <span className="required-symbol">&nbsp;*</span>
                            </label>
                            <div className="col-sm-3">
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
                                        onBlur={this.validateForm}
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
                                    onBlur={this.validateForm}
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
                                    value={this.state.phone ? this.state.phone : ""}
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
                        </div>
                        <div className="form-group row">
                            <label className="control-label col-sm-2">
                                {__("Email")}
                                <span className="required-symbol">&nbsp;*</span>
                            </label>
                            <div className="col-sm-3">
                                <Input
                                    name="email"
                                    data-eusko="profilform-email"
                                    value={this.state.email ? this.state.email : ""}
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
                    </fieldset>
                    <div className="row profil-div-margin-left margin-top">
                        <input
                            name="submit"
                            data-eusko="profil-form-submit"
                            type="submit"
                            defaultValue={__("Valider")}
                            className="btn btn-success col-sm-offset-3"
                            formNoValidate={true}
                            onClick={() => this.submitForm()}
                            disabled={!this.state.canSubmit}
                        />
                    </div>
                </ProfilForm>
                <ToastContainer ref="container"
                    toastMessageFactory={ToastMessageFactory}
                    className="toast-top-right toast-top-right-navbar"
                />
            </div>
        )
    }
})


ReactDOM.render(
    <MemberShow url={getAPIBaseURL + "members/?login="} postUrl={getAPIBaseURL + "members/"} />,
    document.getElementById('adherent')
)
document.title = __("Mon profil") + ": " + __("Coordonnées") + " - " + __("Compte en ligne") + " " + document.title