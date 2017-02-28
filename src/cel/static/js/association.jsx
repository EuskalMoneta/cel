import {
    fetchAuth,
    titleCase,
    getAPIBaseURL,
    getCurrentLang,
    SelectizeUtils,
} from 'Utils'

import ReactSelectize from 'react-selectize'
const SimpleSelect = ReactSelectize.SimpleSelect

const {
    ToastContainer
} = ReactToastr
const ToastMessageFactory = React.createFactory(ReactToastr.ToastMessage.animation)

const AssociationForm = React.createClass({

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

const Association = React.createClass({

    getInitialState() {
        return {
            canSubmit: false,
            validFields: false,
            assoSaisieLibre: false,
            fkAsso: undefined,
            fkAsso2: undefined,
            fkAssoAllList: undefined,
            fkAssoApprovedList: undefined,
        }
    },

    componentDidMount() {
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

            this.setState({fkAssoAllList: res}, this.setAssoFromMember)
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

            this.setState({fkAssoApprovedList: res}, this.setAssoFromMember)
        }
        fetchAuth(getAPIBaseURL + "associations/?approved=yes", 'get', computeApprovedAssociations)
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

    render() {
        return (
                <div className="row">
                    <br/>
                    Chaque fois que vous changez des euros en eusko, 3% du montant de votre 
                    change est versé à l'association de votre choix. 
                    Par exemple, si vous changez 100 €, vous avez 100 eusko et Euskal Moneta 
                    reverse 3 eusko à l'association que vous parrainez.
                    Pour bénéficier de ce bonus de 3%, l'association doit être adhérente 
                    à Euskal Moneta et être parrainée par au moins 30 personnes.
                    <br/><br/>
                    Vous pouvez parrainer n'importe quelle association, y compris une association 
                    qui ne remplit pas les conditions pour recevoir les 3%. 
                    Dans ce cas, votre parrainage ira bien à cette assocation mais vous devez indiquer 
                    quelle association recevra vos 3% tant que la 1ère ne remplit pas les conditions.
                    <br/><br/>
                    Veuillez indiquer ci-dessous l'association que vous souhaitez parrainer.
                    <br/><br/><br/>
                    <AssociationForm
                        onInvalid={this.validateForm}
                        onValid={this.validateForm}
                        ref="profil-form">
                        <fieldset>
                            <div className="form-group row">
                                <label
                                    className="control-label col-sm-2"
                                    data-required="true"
                                    htmlFor="profilform-asso">
                                    {__("Association parrainée - 1er choix :")}
                                </label>
                                <div className="col-sm-3 profilform" data-eusko="profilform-asso">
                                    <SimpleSelect
                                        ref="select"
                                        value={this.state.fkAsso}
                                        options={this.state.fkAssoAllList}
                                        placeholder={__("Association 1")}
                                        theme="bootstrap3"
                                        onValueChange={this.fkAssoOnValueChange}
                                        renderValue={SelectizeUtils.selectizeRenderValue}
                                        renderOption={SelectizeUtils.selectizeNewRenderOption}
                                        onBlur={this.validateForm}
                                        renderNoResultsFound={SelectizeUtils.selectizeNoResultsFound}
                                    />
                                </div>
                                <label
                                    className="control-label col-sm-2"
                                    data-required="true"
                                    htmlFor="profilform-asso2">
                                    {__("Association parrainée - 2nd choix :")}
                                </label>
                                <div className="col-sm-3 profilform" data-eusko="profilform-asso2">
                                    <SimpleSelect
                                        ref="select"
                                        value={this.state.fkAsso2}
                                        options={this.state.fkAssoApprovedList}
                                        placeholder={__("Association 2")}
                                        theme="bootstrap3"
                                        onValueChange={this.fkAsso2OnValueChange}
                                        renderOption={SelectizeUtils.selectizeRenderOption}
                                        renderValue={SelectizeUtils.selectizeRenderValue}
                                        onBlur={this.validateForm}
                                        renderNoResultsFound={SelectizeUtils.selectizeNoResultsFound}
                                    />
                                </div>
                            </div>
                        </fieldset>
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
                    </AssociationForm>
                    <ToastContainer ref="container"
                        toastMessageFactory={ToastMessageFactory}
                        className="toast-top-right toast-top-right-navbar"
                    />
                </div>
            )
        }
    }
)

ReactDOM.render(
    <Association url={getAPIBaseURL + "members/?login="} postUrl={getAPIBaseURL + "members/"} />,
    document.getElementById('association')
)
document.title = __("Mon profil") + ": " + __("Association") + " - " + __("Compte en ligne") + " " + document.title