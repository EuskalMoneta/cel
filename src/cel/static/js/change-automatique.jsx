import {
    fetchAuth,
    getAPIBaseURL,
    getCurrentLang,
    SelectizeUtils,
} from 'Utils'

const {
    Input,
    Textarea,
} = FRC
Formsy.addValidationRule('isMoreThanTen', (values, value) => {
    return Number(value) >= Number(10)
})

import ReactSelectize from 'react-selectize'
const SimpleSelect = ReactSelectize.SimpleSelect

import ModalEusko from 'Modal'

const {
    ToastContainer
} = ReactToastr
const ToastMessageFactory = React.createFactory(ReactToastr.ToastMessage.animation)

const ChangeAutoForm = React.createClass({

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

const ChangeAuto = React.createClass({

    getInitialState() {
        return {
            member: null,
            canSubmit: false,
            hasChangeAuto: false,
            newMontantChangeAuto: undefined,
            montantChangeAuto: undefined,
            periodiciteChangeAuto: undefined,
            rumChangeAuto: undefined,
            modalBody: undefined,
            modalTitle: undefined,
            validateLabel: undefined,
            isModalOpen: false,
            modalMode: undefined,
            textareaCommentaire: '',
        }
    },

    enableButton() {
        this.setState({canSubmit: true})
    },

    disableButton() {
        this.setState({canSubmit: false})
    },

    amountOnValueChange(event, value) {
        this.setState({amount: value})
    },

    openModal() {
        this.setState({isModalOpen: true})
    },

    hideModal() {
        this.setState({isModalOpen: false})
    },

    getModalElements(modalMode) {
        if (modalMode == 'delete') {
            var modalTitle = __("Arrêt du change automatique")
            var validateLabel = __("Confirmer")
            var modalBody = <p>{__("Êtes-vous sûr de vouloir arrêter votre change automatique mensuel ?")}</p>
            var canSubmit = true
        }
        else {
            var modalTitle = __("Modification du change automatique")
            var validateLabel = __("Confirmer")
            var canSubmit = false
            var modalBody = (
                    <ChangeAutoForm onValid={this.enableButton}>
                        <Input
                            name="montant"
                            data-eusko="change-auto-amount"
                            validations="isMoreThanTen"
                            validationErrors={{
                                isMoreThanTen: __("Un change automatique ne peut être en dessous de 10.")
                            }}
                            label={__("Montant")}
                            type="number"
                            placeholder={__("Montant du change automatique")}
                            elementWrapperClassName={[{'col-sm-9': false}, 'col-sm-8']}
                            required={true}
                            onChange={this.amountOnValueChange}
                            value={this.state.newMontantChangeAuto ? this.state.newMontantChangeAuto : ""}
                        />
                        <Textarea
                            name="commentaire"
                            value={this.state.textareaCommentaire}
                            data-eusko="change-auto-commentaire"
                            rows={3}
                            elementWrapperClassName={[{'col-sm-9': false}, 'col-sm-8']}
                            label={__("Commentaire")}
                            placeholder={__("Vous pouvez fournir un commentaire")}
                        />
                    </ChangeAutoForm>
            )
        }
        this.setState({modalBody: modalBody, modalMode: modalMode, canSubmit: canSubmit,
                       modalTitle: modalTitle, validateLabel: validateLabel}, this.openModal)
    },

    componentDidMount() {
        // Get member data
        var computeMemberData = (member) => {
            if (Number(member[0].array_options.options_prelevement_change_montant) > Number()
                && member[0].array_options.options_prelevement_change_periodicite) {
                var hasChangeAuto = true
            }
            else
                var hasChangeAuto = false

            this.setState({
                member: member[0],
                montantChangeAuto: Number(member[0].array_options.options_prelevement_change_montant).toFixed(0),
                rumChangeAuto: member[0].array_options.options_prelevement_change_rum,
                periodiciteChangeAuto: member[0].array_options.options_prelevement_change_periodicite,
                hasChangeAuto: hasChangeAuto,
            })

        }
        fetchAuth(this.props.url + window.config.userName, 'GET', computeMemberData)
    },

    submitForm(modalMode) {
        debugger
        // We push fields into the data object that will be passed to the server
        var data = {}

        var computeForm = (data) => {
            this.refs.container.success(
                __("La modification de votre change automatique a bien été prise en compte."),
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
                __("Une erreur s'est produite lors de la modification de votre change automatique !"),
                "",
                {
                    timeOut: 3000,
                    extendedTimeOut: 10000,
                    closeButton:true
                }
            )
        }
        fetchAuth(getAPIBaseURL + "members/" + this.state.member.id + "/", 'PATCH', computeForm, data, promiseError)
    },


    render() {

        if (this.state.hasChangeAuto) {
            var divContent = (
                <div>
                    {__('Je change mensuellement des euros en eusko grâce à un prélèvement automatique sur mon compte bancaire.')}
                    <br/>
                    {__('Les prélèvements sont effectués le 10 de chaque mois.')}<br/>
                    {__('Montant de mon change automatique : ') + this.state.montantChangeAuto} eusko
                    <br/><br/>
                    <h4>{__('Informations sur le mandat de prélèvement')}</h4>
                    {__('Nom du créancier :')} Association Euskal Moneta - Monnaie Locale du Pays Basque<br/>
                    {__('Identifiant du créancier :')} FR49ZZZ663869<br/>
                    {__('Référence Unique du Mandat :') + ' ' + this.state.rumChangeAuto}
                    <br/><br/>
                    <div className="row">
                        <div className="col-md-3 col-md-offset-1">
                            <button onClick={() => {this.getModalElements('modify')}}
                                className="btn btn-info enable-pointer-events">
                                {__("Modifier le montant du change automatique")} <i className="glyphicon glyphicon-pencil"></i>
                            </button>
                        </div>
                        <div className="col-md-4 col-md-offset-1">
                            <button onClick={() => {this.getModalElements('delete')}}
                                className="btn btn-danger enable-pointer-events">
                                {__("Arrêter le change automatique")} <i className="glyphicon glyphicon-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            )
        }
        else {
            var divContent = (
                <div>
                    {__("Je mets en place un change mensuel d'euros en eusko grâce à un prélèvement automatique sur mon compte bancaire.")}<br/>
                    {__("Pour cela, j'autorise Euskal Moneta à effectuer des prélèvements sur mon compte bancaire :")}<br/><br/>
                    {__("Je remplis et signe le mandat ci-dessous et je le renvoie à Euskal Moneta avec le RIB du compte à débiter.")}<br/>
                    {__("Documents à envoyer par mail à euskokart@euskalmoneta.org ou par courrier à :")}<br/>
                    Euskal Moneta - 20 rue des Corderliers - 64100 Bayonne.
                    <br/><br/>
                    {/* TODO: Update lien mandat de prélèvement*/}
                    <a href="">
                        {__("Télécharger le mandat de prélèvement")}
                        <i style={{marginLeft: 5}} className="glyphicon glyphicon-download-alt"></i>
                    </a>
                </div>
            )
        }

        return (
                <div className="row">
                    <br/>
                    {divContent}
                    <ToastContainer ref="container"
                        toastMessageFactory={ToastMessageFactory}
                        className="toast-top-right toast-top-right-navbar"
                    />
                    <ModalEusko
                        hideModal={this.hideModal}
                        isModalOpen={this.state.isModalOpen}
                        modalBody={this.state.modalBody}
                        modalTitle={this.state.modalTitle}
                        validateLabel={this.state.validateLabel}
                        onValidate={() => { this.submitForm(this.state.modalMode) }}
                        staticContent={true}
                        btnValidateClass={this.state.modalMode == "delete" ? "btn-danger" : "btn-success"}
                        btnValidateEnabled={this.state.canSubmit}
                    />
                </div>
            )
        }
    }
)

ReactDOM.render(
    <ChangeAuto url={getAPIBaseURL + "members/?login="} postUrl={getAPIBaseURL + "members/"} />,
    document.getElementById('change-automatique')
)
document.title = __("Mon profil") + ": " + __("Change automatique") + " - " + __("Compte en ligne") + " " + document.title